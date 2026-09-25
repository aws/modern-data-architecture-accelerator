/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  HarnessConfigProps,
  HarnessGatewayEndpointRequirement,
  HarnessInterfaceEndpointRequirement,
  requiredHarnessVpcEndpoints,
  ResolvedVpcEndpointAccess,
} from '@aws-mdaa/bedrock-agentcore-harness-l3-construct';
import {
  GatewayVpcEndpointProperty,
  InterfaceVpcEndpointProperty,
  VpcEndpointPolicyEffect,
  VpcEndpointPolicyProperty,
} from '@aws-mdaa/vpc-endpoint-l3-construct';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';

/**
 * How one endpoint of a set is provided. Every endpoint a referencing consumer needs is in exactly one
 * of three states, and the state is chosen by which fields are set:
 *
 * - **created** - the property is omitted, or set with neither `securityGroupId` nor `external`
 * - **brought** - `securityGroupId` names an endpoint that already exists; it is wired, not created
 * - **external** - `external: true`; reached without an endpoint this set manages (over NAT, or through
 *   an endpoint whose security group is not named here), so it is neither created nor wired
 *
 * Use cases: coexisting with landing-zone or central-networking endpoints, keeping some services on the
 * VPC's existing egress path
 *
 * AWS: AWS::EC2::VPCEndpoint (Interface)
 *
 * Validation: `external` and `securityGroupId` are mutually exclusive; `subnetIds` applies only to a
 * created endpoint
 */
export interface VpcEndpointProps {
  /**
   * Subnets for this endpoint's ENIs, overriding the set's `subnetIds`. Use it for a service available
   * in fewer availability zones than the rest, or to keep one endpoint's ENI cost down.
   *
   * Use cases: per-service endpoint placement, endpoint ENI cost control
   *
   * AWS: SubnetIds
   *
   * Validation: Optional; String[]; at most one subnet per availability zone; only valid on a created
   * endpoint
   *
   * @minItems 1
   **/
  readonly subnetIds?: string[];
  /**
   * Security group of an endpoint that already exists in this VPC, provisioned by a landing zone or a
   * central networking team. The endpoint is not created; each consumer is granted HTTPS egress to this
   * group and one ingress rule is added to it from the consumer's own client security group.
   *
   * The endpoint's own id is not needed - nothing here references it - and its endpoint policy stays as
   * its owner wrote it.
   *
   * Use cases: reusing centrally provisioned interface endpoints
   *
   * AWS: consumer-side AWS::EC2::SecurityGroupIngress on the existing endpoint's security group
   *
   * Validation: Optional; String; mutually exclusive with `external`
   **/
  readonly securityGroupId?: string;
  /**
   * Mark this service as reached without an endpoint this set manages - over NAT or an internet gateway,
   * or through an existing endpoint whose security group you do not want named here. Nothing is created
   * and nothing is wired for it.
   *
   * Use cases: keeping some services on the VPC's existing egress path, coexisting with an endpoint
   * whose security group is not shared
   *
   * Validation: Optional; Boolean; mutually exclusive with `securityGroupId` and `subnetIds`
   **/
  readonly external?: boolean;
}

/**
 * How the S3 gateway endpoint for container image layers is provided. It has only the `external` state
 * of {@link VpcEndpointProps}: a gateway endpoint has no security group to wire, so an existing one
 * needs nothing from this set, and its placement comes from the set's `routeTableIds` rather than from
 * subnets.
 *
 * Use cases: a VPC where S3 is already reachable over NAT or an existing endpoint
 *
 * AWS: AWS::EC2::VPCEndpoint (Gateway)
 *
 * Validation: mutually exclusive with the set's `routeTableIds`
 */
export interface S3ImageLayerEndpointProps {
  /**
   * Mark S3 as already reachable, so no gateway endpoint is created for image layers. Set this for a VPC
   * with NAT, or one whose S3 gateway endpoint was provisioned elsewhere - a route table carries a
   * service's prefix-list route from only one endpoint, so creating a second fails at deploy.
   *
   * Validation: Required when the set has no `routeTableIds`; mutually exclusive with them
   **/
  readonly external?: boolean;
}

/**
 * One VPC's endpoint set: which VPC it serves, where created endpoints go, and how each endpoint the
 * referencing consumers need is provided. A consumer references a set by name from its own
 * configuration, and the endpoints belong to the VPC rather than to any one consumer - AWS allows a
 * single Private DNS interface endpoint per service per VPC, so one set owns them and every consumer
 * referencing it shares them.
 *
 * Which endpoints exist is derived from the consumers, never added here: a set can only say how each
 * derived endpoint is reached. Omitting an endpoint property means it is created; see
 * {@link VpcEndpointProps} for the other two states.
 *
 * Endpoint policies are derived too, and are not configurable: the AgentCore Gateway endpoint is scoped
 * to gateway invocation and the S3 gateway endpoint to the ECR image-layer bucket, while the
 * multi-action supporting services keep the AWS default - Private DNS makes an interface endpoint
 * VPC-wide, so restricting those would deny unrelated workloads in the same VPC. That default permits
 * every action on those services in any account, so a set is a private network path and not an
 * authorization boundary: what a session may reach through it stays governed by its execution role.
 *
 * Use cases: private (no-NAT) AgentCore Harness sessions, reusing centrally provisioned endpoints,
 * keeping selected services on the VPC's existing egress path
 *
 * Validation: `vpcId` and `subnetIds` required; exactly one of `routeTableIds` and
 * `s3ImageLayers.external`; each set must name a distinct VPC and be referenced by at least one consumer
 */
export interface VpcEndpointSetProps {
  /**
   * VPC the endpoints are created in, and in which each referencing consumer's endpoint client security
   * group is created.
   *
   * Use cases: private workload connectivity in a specific VPC
   *
   * AWS: VpcId
   *
   * Validation: Required; String; each set must name a distinct VPC
   **/
  readonly vpcId: string;
  /**
   * Subnets for the ENIs of every interface endpoint created by this set, unless an endpoint overrides
   * it. An interface endpoint takes at most one subnet per availability zone, and is reachable from any
   * zone - so covering fewer zones costs less in endpoint ENI hours and more in cross-zone data.
   *
   * Use cases: multi-AZ endpoint placement, endpoint ENI cost control
   *
   * AWS: SubnetIds
   *
   * Validation: Required; String[]; at least one, at most one per availability zone
   *
   * @minItems 1
   **/
  readonly subnetIds: string[];
  /**
   * Route tables that receive the S3 gateway endpoint's prefix-list route, enabling container image-layer
   * downloads: image layers are served from the ECR layer bucket over S3, so the ECR interface endpoints
   * alone cannot complete a pull in a VPC with no NAT.
   *
   * IMPORTANT - blast radius: the endpoint intercepts **all** S3 traffic from every subnet associated
   * with these route tables, and its derived policy allows only the ECR image-layer read. If other
   * workloads share these route tables and need broader S3 access, provision the S3 gateway endpoint out
   * of band and set `s3ImageLayers.external` instead.
   *
   * Use cases: no-NAT container image-layer pulls
   *
   * AWS: RouteTableIds
   *
   * Validation: Required unless `s3ImageLayers.external` is set, and mutually exclusive with it; String[]
   *
   * @minItems 1
   **/
  readonly routeTableIds?: string[];
  /**
   * Amazon Bedrock runtime, for model inference over the Converse API. Every AgentCore Harness needs it;
   * without a path it reaches READY and every invoke hangs.
   *
   * Validation: Optional; VpcEndpointProps; omit to have it created
   **/
  readonly bedrockRuntime?: VpcEndpointProps;
  /**
   * Amazon ECR API, for the registry calls a session's container image pull makes.
   *
   * Validation: Optional; VpcEndpointProps; omit to have it created
   **/
  readonly ecrApi?: VpcEndpointProps;
  /**
   * Amazon ECR Docker Registry, for the registry protocol of the image pull.
   *
   * Validation: Optional; VpcEndpointProps; omit to have it created
   **/
  readonly ecrDocker?: VpcEndpointProps;
  /**
   * AWS STS, for credential vending inside a session.
   *
   * Validation: Optional; VpcEndpointProps; omit to have it created
   **/
  readonly sts?: VpcEndpointProps;
  /**
   * Amazon CloudWatch Logs, for log delivery from a session.
   *
   * Validation: Optional; VpcEndpointProps; omit to have it created
   **/
  readonly logs?: VpcEndpointProps;
  /**
   * AgentCore Gateway - the gateway's MCP host, a distinct service from the AgentCore data plane. Needed
   * only by a consumer declaring an `agentCoreGateway` tool; without it the tool load fails with a DNS
   * "Name or service not known" error.
   *
   * Validation: Optional; VpcEndpointProps; only valid when a referencing consumer declares a gateway
   * tool; omit to have it created
   **/
  readonly agentCoreGateway?: VpcEndpointProps;
  /**
   * Amazon S3, reached through a **gateway** endpoint, for container image layers. Created from the set's
   * `routeTableIds`; set `external` here when S3 is already reachable.
   *
   * Validation: Optional; S3ImageLayerEndpointProps
   **/
  readonly s3ImageLayers?: S3ImageLayerEndpointProps;
}

/**
 * Map of set name to {@link VpcEndpointSetProps}. The key is referenced by name from a consumer's
 * configuration, and names the set's endpoint security groups.
 *
 * Validation: keys must be unique ignoring case, since they are woven into security group names, which
 * MDAA naming lowercases
 */
export interface NamedVpcEndpointSetProps {
  /** @jsii ignore */
  readonly [setName: string]: VpcEndpointSetProps;
}

/** Map of harness name to its configuration, as the builder receives it. */
export interface NamedHarnessConfigProps {
  /** @jsii ignore */
  readonly [harnessName: string]: HarnessConfigProps;
}

/** The AWS environment values a derived endpoint policy needs. */
export interface EndpointPolicyEnvironment {
  /** Deployment partition, for the ECR image-layer bucket ARN. */
  readonly partition: string;
  /** Deployment region, for the ECR image-layer bucket ARN. */
  readonly region: string;
}

/** One set reconciled against the demand of the consumers referencing it. */
export interface ReconciledVpcEndpointSet {
  /** Set name, used as the construct id and the endpoint security group name qualifier. */
  readonly setName: string;
  /** VPC the endpoints are created in. */
  readonly vpcId: string;
  /** Interface endpoints to create. */
  readonly interfaces: InterfaceVpcEndpointProperty[];
  /** Gateway endpoints to create; empty when image layers are external. */
  readonly gateways: GatewayVpcEndpointProperty[];
  /**
   * Security groups of endpoints that already exist, keyed by service short name. Not created, but the
   * consumers referencing this set are still wired to them.
   */
  readonly broughtSecurityGroupIds: { [serviceShortName: string]: string };
}

/**
 * The set property each interface endpoint service is configured under - the module's whole endpoint
 * configuration vocabulary.
 */
type InterfaceEndpointKey = 'bedrockRuntime' | 'ecrApi' | 'ecrDocker' | 'sts' | 'logs' | 'agentCoreGateway';

/**
 * Maps each supported service to its set property, and is the only place a service is named. Keyed by
 * the `aws-cdk-lib` service object, so a consumer's declared requirement is matched to its property on
 * identity: there is no service-name string to keep in step, and a requirement naming a service this
 * map does not cover fails at synth rather than being silently dropped.
 */
const ENDPOINT_PROPERTY_BY_SERVICE = new Map<InterfaceVpcEndpointAwsService, InterfaceEndpointKey>([
  [InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME, 'bedrockRuntime'],
  [InterfaceVpcEndpointAwsService.ECR, 'ecrApi'],
  [InterfaceVpcEndpointAwsService.ECR_DOCKER, 'ecrDocker'],
  [InterfaceVpcEndpointAwsService.STS, 'sts'],
  [InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS, 'logs'],
  [InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY, 'agentCoreGateway'],
]);

/**
 * Reconciles every declared endpoint set against the endpoints the consumers referencing it need.
 *
 * Demand comes from the consumers: a harness declares the endpoints it requires from its own
 * configuration, so a set cannot introduce an endpoint nobody uses - it can only say how each required
 * one is reached. Supply comes from the set: created here, brought by security group, or external.
 *
 * @returns one entry per set, in declaration order
 * @throws Error on any configuration that would deploy a broken or unused endpoint
 */
export function reconcileVpcEndpointSets(
  sets: NamedVpcEndpointSetProps,
  harnesses: NamedHarnessConfigProps,
  environment: EndpointPolicyEnvironment,
): ReconciledVpcEndpointSet[] {
  validateSetNames(sets);
  validateDistinctVpcs(sets);
  const demandBySet = collectDemand(sets, harnesses, environment);
  return Object.entries(sets).map(([setName, setProps]) => {
    const demand = demandBySet.get(setName);
    // collectDemand rejects a set no consumer references, so every set has demand by the time we get
    // here. Asserted rather than defaulted: an empty demand would silently drop the set's gateway
    // endpoint and make the unused-endpoint checks below report the wrong cause.
    if (!demand) {
      throw new Error(`No demand collected for VPC endpoint set "${setName}".`);
    }
    return reconcileSet(setName, setProps, demand);
  });
}

/**
 * The endpoints one harness reaches, from its set's reconciled result: the interface endpoints it
 * declares, minus any the set marks external, each mapped to the security group of the created or
 * brought endpoint.
 *
 * Returns undefined for a harness referencing no set.
 */
export function vpcEndpointAccessForHarness(
  harnessConfig: HarnessConfigProps,
  resolvedBySet: Map<string, ResolvedVpcEndpointAccess>,
  environment: EndpointPolicyEnvironment,
): ResolvedVpcEndpointAccess | undefined {
  const setName = harnessConfig.networkConfiguration.vpcEndpoints;
  if (!setName) {
    return undefined;
  }
  const resolved = resolvedBySet.get(setName);
  // collectDemand rejects a reference to an undeclared set, and every declared set is reconciled, so a
  // referenced set is always resolved here. Asserted rather than returned as "no endpoints": that would
  // surface as the Harness construct's "configure this through the module" error, pointing at the caller
  // instead of at the inconsistency.
  if (!resolved) {
    throw new Error(`No resolved endpoints for VPC endpoint set "${setName}".`);
  }
  const required = requiredHarnessVpcEndpoints({ ...environment, tools: harnessConfig.tools });
  return {
    vpcId: resolved.vpcId,
    securityGroupIds: Object.fromEntries(
      required.interfaces
        .map(requirement => requirement.service.shortName)
        .filter(shortName => resolved.securityGroupIds[shortName])
        .map(shortName => [shortName, resolved.securityGroupIds[shortName]]),
    ),
  };
}

/** The demand one set's consumers place on it, deduplicated across them. */
interface SetDemand {
  /** Interface endpoints required, by service, with the policy each should be scoped with. */
  readonly interfaces: Map<InterfaceVpcEndpointAwsService, HarnessInterfaceEndpointRequirement>;
  /** The image-layer gateway endpoint required by every consumer. */
  readonly imageLayerGateway: HarnessGatewayEndpointRequirement;
}

/**
 * Collects what each set's consumers require, rejecting a reference to an undeclared set and a set
 * nobody references.
 *
 * An unreferenced set is an error rather than a no-op: its endpoints would be created with nothing
 * reaching them, which costs money hourly, and the likeliest cause is a consumer that meant to
 * reference it and does not - so the workload that was supposed to be private silently is not.
 */
function collectDemand(
  sets: NamedVpcEndpointSetProps,
  harnesses: NamedHarnessConfigProps,
  environment: EndpointPolicyEnvironment,
): Map<string, SetDemand> {
  const demand = new Map<string, SetDemand>();
  Object.entries(harnesses).forEach(([harnessName, harnessConfig]) => {
    const setName = harnessConfig.networkConfiguration.vpcEndpoints;
    if (!setName) {
      return;
    }
    if (!(setName in sets)) {
      const declared = Object.keys(sets);
      throw new Error(
        `Harness "${harnessName}" references VPC endpoint set "${setName}", which is not defined in ` +
          `vpcEndpoints. Define it under vpcEndpoints, or correct the reference.` +
          (declared.length > 0 ? ` Defined sets: ${declared.join(', ')}.` : ''),
      );
    }
    const required = requiredHarnessVpcEndpoints({ ...environment, tools: harnessConfig.tools });
    const existing = demand.get(setName);
    const interfaces = existing?.interfaces ?? new Map();
    required.interfaces.forEach(requirement => interfaces.set(requirement.service, requirement));
    demand.set(setName, { interfaces, imageLayerGateway: required.imageLayerGateway });
  });
  Object.keys(sets).forEach(setName => {
    if (!demand.has(setName)) {
      throw new Error(
        `VPC endpoint set "${setName}" is referenced by no harness, so its endpoints would be created ` +
          `with nothing using them. Reference it from a harness's "networkConfiguration.vpcEndpoints", ` +
          `or remove the set.`,
      );
    }
  });
  return demand;
}

/** Turns one set plus its consumers' demand into the endpoints to create and the ones to wire. */
function reconcileSet(setName: string, setProps: VpcEndpointSetProps, demand: SetDemand): ReconciledVpcEndpointSet {
  validateSet(setName, setProps, demand.interfaces);
  const interfaces: InterfaceVpcEndpointProperty[] = [];
  const broughtSecurityGroupIds: { [serviceShortName: string]: string } = {};
  demand.interfaces.forEach((requirement, service) => {
    const endpoint = endpointProps(setProps, service);
    if (endpoint?.external) {
      return;
    }
    if (endpoint?.securityGroupId) {
      broughtSecurityGroupIds[service.shortName] = endpoint.securityGroupId;
      return;
    }
    interfaces.push({
      service,
      // The service short name is the endpoint's identity everywhere downstream: its construct id, its
      // security group name, and the key each consumer's wiring looks it up by.
      name: service.shortName,
      subnetIds: endpoint?.subnetIds ?? setProps.subnetIds,
      policy: requirement.policyActions ? scopedPolicy(requirement.policyActions) : undefined,
    });
  });
  // Empty when image layers are external, which validateImageLayerAccess has already paired with the
  // absence of route tables.
  const routeTableIds = setProps.routeTableIds ?? [];
  const gateways: GatewayVpcEndpointProperty[] =
    routeTableIds.length > 0
      ? [
          {
            service: demand.imageLayerGateway.service,
            name: demand.imageLayerGateway.name,
            routeTableIds,
            policy: {
              statements: demand.imageLayerGateway.policyStatements.map(statement => ({
                ...statement,
                effect: VpcEndpointPolicyEffect.ALLOW,
                // A gateway endpoint has no security group, so its policy is the only control on it. The
                // principal stays "*" because the image-layer read is made by the AgentCore service on
                // the session's behalf, not by an identity matchable here; the resource scope is the
                // control.
                principals: ['*'],
              })),
            },
          },
        ]
      : [];
  return { setName, vpcId: setProps.vpcId, interfaces, gateways, broughtSecurityGroupIds };
}

/** The configuration of one endpoint in a set, by service. */
function endpointProps(
  setProps: VpcEndpointSetProps,
  service: InterfaceVpcEndpointAwsService,
): VpcEndpointProps | undefined {
  const property = ENDPOINT_PROPERTY_BY_SERVICE.get(service);
  if (!property) {
    throw new Error(
      `A harness requires the "${service.shortName}" VPC endpoint, which this module has no configuration ` +
        `property for. This is an MDAA defect: add it to the VPC endpoint set surface.`,
    );
  }
  return setProps[property];
}

/** An action-scoped endpoint policy, for an endpoint whose only legitimate traffic is known. */
function scopedPolicy(actions: string[]): VpcEndpointPolicyProperty {
  return {
    statements: [
      {
        sid: 'AllowScopedServiceAccess',
        effect: VpcEndpointPolicyEffect.ALLOW,
        actions,
        // Reachability is already restricted at the endpoint security group (inbound 443 from the client
        // groups of the consumers that need it) and the actions are scoped above; a session's
        // execution-role identity is not matchable at the endpoint, so the principal cannot be narrowed.
        principals: ['*'],
        resources: ['*'],
      },
    ],
  };
}

/**
 * Rejects set names that collide ignoring case. They are distinct map keys, but each is woven into its
 * endpoints' security group names, which MDAA naming lowercases - so two such sets synthesize the same
 * GroupName and the second fails at deploy.
 */
function validateSetNames(sets: NamedVpcEndpointSetProps): void {
  const seen = new Map<string, string>();
  Object.keys(sets).forEach(setName => {
    const key = setName.toLowerCase();
    const existing = seen.get(key);
    if (existing !== undefined) {
      throw new Error(
        `VPC endpoint sets "${existing}" and "${setName}" differ only in case. Set names are woven into ` +
          `endpoint security group names, which are lowercased, so both would synthesize the same name. ` +
          `Rename one of them.`,
      );
    }
    seen.set(key, setName);
  });
}

/**
 * Rejects two sets naming the same VPC, which would each create the same services in it - AWS allows one
 * Private DNS interface endpoint per service per VPC, so the second fails at deploy.
 *
 * Compares the configured values, so it catches two sets sharing a literal id or the same `ssm:`
 * reference. Two sets reaching one VPC through different indirections resolve identically only at
 * deploy, and remain a CloudFormation failure.
 */
function validateDistinctVpcs(sets: NamedVpcEndpointSetProps): void {
  const owners = new Map<string, string>();
  Object.entries(sets).forEach(([setName, setProps]) => {
    const existing = owners.get(setProps.vpcId);
    if (existing !== undefined) {
      throw new Error(
        `VPC endpoint sets "${existing}" and "${setName}" both name VPC "${setProps.vpcId}". Each set owns ` +
          `one VPC's endpoints, and AWS allows only one Private DNS interface endpoint per service per ` +
          `VPC, so both would provision the same services there. Merge them into one set.`,
      );
    }
    owners.set(setProps.vpcId, setName);
  });
}

/** Fail-fast validation of one set against the demand of the consumers referencing it. */
function validateSet(
  setName: string,
  setProps: VpcEndpointSetProps,
  required: Map<InterfaceVpcEndpointAwsService, HarnessInterfaceEndpointRequirement>,
): void {
  if (!setProps.vpcId) {
    throw new Error(`VPC endpoint set "${setName}" requires "vpcId".`);
  }
  if (!setProps.subnetIds?.length) {
    throw new Error(
      `VPC endpoint set "${setName}" requires "subnetIds", naming where the ENIs of the endpoints it ` +
        `creates are placed - at most one subnet per availability zone.`,
    );
  }
  validateImageLayerAccess(setName, setProps);
  validateEndpointStates(setName, setProps);
  validateNoUnusedEndpoints(setName, setProps, required);
}

/**
 * Rejects the two ways image-layer access can be left undecided.
 *
 * Neither stated is the failure this check exists for: image layers are served from the ECR layer bucket
 * over S3, so a no-NAT VPC without that endpoint deploys cleanly and its sessions never start. Both
 * stated is contradictory - route tables to create it, and a declaration that it is not needed.
 */
function validateImageLayerAccess(setName: string, setProps: VpcEndpointSetProps): void {
  const hasRouteTables = !!setProps.routeTableIds?.length;
  const isExternal = !!setProps.s3ImageLayers?.external;
  if (hasRouteTables && isExternal) {
    throw new Error(
      `VPC endpoint set "${setName}" sets both "routeTableIds" and "s3ImageLayers.external". Supply route ` +
        `tables to create the S3 gateway endpoint for container image layers, or mark it external because ` +
        `S3 is already reachable - not both.`,
    );
  }
  if (!hasRouteTables && !isExternal) {
    throw new Error(
      `VPC endpoint set "${setName}" must state how container image layers are reached: they are served ` +
        `from the ECR layer bucket over S3, which the ECR endpoints cannot fetch. Set "routeTableIds" to ` +
        `create an S3 gateway endpoint on those route tables, or "s3ImageLayers: { external: true }" if S3 ` +
        `is already reachable over NAT or an endpoint provisioned elsewhere.`,
    );
  }
}

/** Rejects contradictory field combinations on one endpoint. */
function validateEndpointStates(setName: string, setProps: VpcEndpointSetProps): void {
  ENDPOINT_PROPERTY_BY_SERVICE.forEach(property => {
    const endpoint = setProps[property];
    if (!endpoint) {
      return;
    }
    const location = `VPC endpoint set "${setName}" endpoint "${property}"`;
    if (endpoint.external && endpoint.securityGroupId) {
      throw new Error(
        `${location} sets both "external" and "securityGroupId". Name the security group of an existing ` +
          `endpoint to wire to it, or mark it external to leave it alone entirely - not both.`,
      );
    }
    if (endpoint.subnetIds?.length && (endpoint.external || endpoint.securityGroupId)) {
      throw new Error(
        `${location} sets "subnetIds" on an endpoint that is not created here. Placement applies only to a ` +
          `created endpoint; remove "subnetIds", or remove ` +
          `"${endpoint.external ? 'external' : 'securityGroupId'}".`,
      );
    }
    if (endpoint.subnetIds?.length === 0) {
      throw new Error(`${location} has an empty "subnetIds" list. Provide a subnet, or omit it.`);
    }
    const broughtSecurityGroupId: unknown = endpoint.securityGroupId;
    // Note: need typeof, not a bare trim: a YAML "securityGroupId:" with no value parses as null.
    if (
      broughtSecurityGroupId !== undefined &&
      (typeof broughtSecurityGroupId !== 'string' || broughtSecurityGroupId.trim().length === 0)
    ) {
      throw new Error(`${location} has an empty "securityGroupId". Name the security group of the existing endpoint.`);
    }
  });
}

/**
 * Rejects an endpoint property configured for a service none of the set's consumers require. Its only
 * possible effect would be an endpoint nothing reaches, or a state declared for one that is never
 * created - either way the operator believes they configured something that does nothing.
 */
function validateNoUnusedEndpoints(
  setName: string,
  setProps: VpcEndpointSetProps,
  required: Map<InterfaceVpcEndpointAwsService, HarnessInterfaceEndpointRequirement>,
): void {
  ENDPOINT_PROPERTY_BY_SERVICE.forEach((property, service) => {
    if (setProps[property] && !required.has(service)) {
      throw new Error(
        `VPC endpoint set "${setName}" configures "${property}", but no harness referencing it requires ` +
          `the "${service.shortName}" endpoint, so it would serve nothing. Remove it${
            property === 'agentCoreGateway' ? ', or add an agentCoreGateway tool to a harness referencing this set' : ''
          }.`,
      );
    }
  });
  // s3ImageLayers needs no unused check of its own: every Harness requires the image-layer gateway
  // unconditionally, and collectDemand rejects a set with no consumers, so it is never configured for a
  // set that does not need it.
}
