/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_GATEWAY_ACTIONS, NETWORK_MEMBERS_MAX } from '@aws-mdaa/agentcore-shared';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import {
  CfnSecurityGroupEgress,
  CfnSecurityGroupIngress,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import type { HarnessNetworkProperty, NamedHarnessToolProps } from './bedrock-agentcore-harness-l3-construct';

// The Harness appends one endpoint client security group to the configured list, so the configured
// list must leave room for it inside the service's own securityGroups bound.
const MAX_CONFIGURED_SECURITY_GROUPS = NETWORK_MEMBERS_MAX - 1;
// Every service a Harness reaches over an interface endpoint is served over HTTPS, so the rule pairs
// below need no per-service port.
const ENDPOINT_PORT = 443;
/** Name segment of the image-layer gateway endpoint, for its construct id. */
const IMAGE_LAYER_ENDPOINT_NAME = 's3-image-layers';
/** Read action allowed on the ECR image-layer bucket, per the ECR minimum-S3-permissions guidance. */
const IMAGE_LAYER_ACTIONS = ['s3:GetObject'];

/**
 * One interface VPC endpoint a Harness needs, as the `aws-cdk-lib` service object plus the policy the
 * orchestrating module should scope it with. The service object rather than a name, so the orchestrator
 * matches requirements to its own configuration on identity and no service-name table exists anywhere.
 */
export interface HarnessInterfaceEndpointRequirement {
  /** The endpoint service. */
  readonly service: InterfaceVpcEndpointAwsService;
  /**
   * Actions the endpoint policy may be scoped to, for an endpoint whose only legitimate traffic is a
   * known action set. Absent for the multi-action supporting services, which are left on the AWS default
   * policy: Private DNS makes an interface endpoint VPC-wide, so restricting their actions would break
   * unrelated workloads in the same VPC, and what a session may do through them is governed by the
   * execution role's identity policy instead.
   */
  readonly policyActions?: string[];
}

/** One statement of a Harness-derived endpoint policy, as plain data for the orchestrating module. */
export interface HarnessEndpointPolicyStatement {
  /** Statement identifier, so the rendered endpoint policy is readable in the console. */
  readonly sid: string;
  /** Actions the statement allows. */
  readonly actions: string[];
  /** Resource ARNs the statement allows the actions on. */
  readonly resources: string[];
}

/**
 * The gateway VPC endpoint a Harness needs, with the policy it must carry. A gateway endpoint has no
 * security group, so nothing is wired to it - its route-table association is the whole mechanism, and
 * its policy is its only access control, hence the statements are supplied rather than optional.
 */
export interface HarnessGatewayEndpointRequirement {
  /** The endpoint service. */
  readonly service: GatewayVpcEndpointAwsService;
  /** Name segment for the endpoint's construct id; the CDK's gateway service object exposes none. */
  readonly name: string;
  /** Statements the endpoint policy must carry. */
  readonly policyStatements: HarnessEndpointPolicyStatement[];
}

/**
 * Every VPC endpoint a Harness needs for a private outbound path. The single declaration of that
 * demand: the orchestrating module reads it and adds nothing of its own, so what a Harness needs cannot
 * drift from what is provisioned for it.
 */
export interface HarnessVpcEndpointRequirements {
  /**
   * Interface endpoints: model inference (Converse), the session container image pull (registry API and
   * Docker registry), credential vending, runtime log delivery, and - only when the Harness declares a
   * gateway tool - the AgentCore Gateway MCP host, a distinct service from the AgentCore data plane.
   */
  readonly interfaces: HarnessInterfaceEndpointRequirement[];
  /**
   * The S3 gateway endpoint for container image *layers*. Always required: layers are served from the
   * ECR layer bucket over S3, so the ECR interface endpoints alone cannot complete a pull.
   */
  readonly imageLayerGateway: HarnessGatewayEndpointRequirement;
}

/** Inputs to {@link requiredHarnessVpcEndpoints}. */
export interface HarnessVpcEndpointRequirementProps {
  /** The Harness's tools, which decide whether the AgentCore Gateway endpoint is required. */
  readonly tools?: NamedHarnessToolProps;
  /** Deployment partition, for the ECR image-layer bucket ARN. */
  readonly partition: string;
  /** Deployment region, for the ECR image-layer bucket ARN. */
  readonly region: string;
}

/**
 * Returns every VPC endpoint a Harness needs, derived from its own configuration.
 *
 * Without an endpoint or another path to a service the failures are silent-then-fatal: no inference
 * route and the Harness reaches READY but every invoke hangs; no image-layer route and its sessions
 * never start; no gateway route and the tool load fails with a DNS "Name or service not known" error.
 */
export function requiredHarnessVpcEndpoints(props: HarnessVpcEndpointRequirementProps): HarnessVpcEndpointRequirements {
  const interfaces: HarnessInterfaceEndpointRequirement[] = [
    { service: InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME },
    { service: InterfaceVpcEndpointAwsService.ECR },
    { service: InterfaceVpcEndpointAwsService.ECR_DOCKER },
    { service: InterfaceVpcEndpointAwsService.STS },
    { service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS },
  ];
  if (hasAgentCoreGatewayTool(props.tools)) {
    // The AgentCore Gateway is the one interface endpoint here whose only legitimate traffic is a single
    // action - gateway data-plane invokes, management going to the separate bedrock-agentcore-control
    // service - so it can carry an action-scoped policy where the shared, multi-action supporting
    // endpoints cannot.
    interfaces.push({
      service: InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY,
      policyActions: DEFAULT_GATEWAY_ACTIONS,
    });
  }
  return {
    interfaces,
    imageLayerGateway: {
      service: GatewayVpcEndpointAwsService.S3,
      name: IMAGE_LAYER_ENDPOINT_NAME,
      // Without an explicit policy the endpoint would inherit S3 full access for every subnet on its
      // route tables, so the layer read is named and nothing else is granted - a VPC whose other
      // workloads need broader S3 access should provision the endpoint out of band instead.
      policyStatements: [
        {
          sid: 'AllowEcrImageLayerPull',
          actions: IMAGE_LAYER_ACTIONS,
          resources: [`arn:${props.partition}:s3:::prod-${props.region}-starport-layer-bucket/*`],
        },
      ],
    },
  };
}

/**
 * Whether the Harness declares at least one AgentCore Gateway tool, which adds the Gateway endpoint to
 * its requirements.
 */
function hasAgentCoreGatewayTool(tools?: NamedHarnessToolProps): boolean {
  return Object.values(tools ?? {}).some(tool => tool.agentCoreGateway !== undefined);
}

/**
 * Validates the optional VPC endpoint set reference before resources are created.
 *
 * There is no service selection, placement, or policy to validate here: the Harness derives the
 * endpoints it needs from its own configuration, and the orchestrating module reconciles that against
 * the referenced set and injects the result. What is checked is that the reference is a usable name,
 * that the orchestrator actually resolved it - guarding a Harness construct used directly rather than
 * through the module that owns the sets - and that the configured security groups leave room for the
 * client group the Harness adds.
 */
export function validateHarnessVpcEndpoints(
  networkConfiguration: HarnessNetworkProperty,
  access?: ResolvedVpcEndpointAccess,
): void {
  const setName = networkConfiguration.vpcEndpoints;
  // == also catches null: the type says string, but a YAML `vpcEndpoints:` with no value parses as
  // null, and an absent value means the Harness wants no endpoints - so validation must treat it the
  // same way the construct does rather than demanding a resolved set for it.
  if (setName == null) {
    return;
  }
  if (typeof setName !== 'string' || setName.trim().length === 0) {
    throw new Error(
      'Harness "networkConfiguration.vpcEndpoints" must name a VPC endpoint set declared in the ' +
        `module's own "vpcEndpoints" map. Got ${JSON.stringify(setName)}.`,
    );
  }
  if (!access) {
    throw new Error(
      `Harness "networkConfiguration.vpcEndpoints" references set "${setName}", which is resolved by the ` +
        'module that owns the sets. Configure the Harness through the Bedrock Builder module rather than ' +
        'instantiating this construct directly.',
    );
  }
  validateAdditionalSecurityGroupCapacity(networkConfiguration.securityGroups);
}

/**
 * The VPC endpoints one Harness reaches, resolved by the orchestrating module from the set the Harness
 * references. Built once per set as that set's endpoints are created, then narrowed per Harness to the
 * endpoints that Harness derives.
 */
export interface ResolvedVpcEndpointAccess {
  /** VPC of the referenced set, hosting the endpoints and the Harness's client security group. */
  readonly vpcId: string;
  /**
   * Security group id per endpoint service short name, narrowed to the interface endpoints this Harness
   * reaches. A service the set marks external is absent - it is reached without an endpoint the set
   * manages - and so is the image-layer gateway endpoint, which has no security group to wire.
   */
  readonly securityGroupIds: { [serviceShortName: string]: string };
}

/** Properties for {@link HarnessVpcEndpointAccess}. */
export interface HarnessVpcEndpointAccessProps {
  /** Harness name, used to create a client security group unique to this Harness. */
  readonly harnessName: string;
  /** The endpoints this Harness reaches, resolved by the orchestrating module. */
  readonly access: ResolvedVpcEndpointAccess;
  /** MDAA naming implementation for the client security group. */
  readonly naming: IMdaaResourceNaming;
}

/**
 * Creates the consumer-owned connectivity wiring between a Harness and the VPC endpoints of the set it
 * references.
 *
 * A client security group unique to this Harness keeps endpoint ingress rules per consumer, so a
 * Harness is granted access to only the endpoints it derives and adding or removing one Harness never
 * rewrites another's rules. The client group is attached to the Harness in addition to its configured
 * service groups and permits HTTPS only to those endpoints - so they stay reachable however the
 * configured service groups are set up.
 */
export class HarnessVpcEndpointAccess extends Construct {
  /** Client security group attached to the Harness runtime sessions. */
  public readonly securityGroupId: string;

  constructor(scope: Construct, id: string, props: HarnessVpcEndpointAccessProps) {
    super(scope, id);
    const vpc = Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: props.access.vpcId,
      availabilityZones: ['unused-az'],
    });
    const clientSecurityGroup = new MdaaSecurityGroup(this, 'ClientSecurityGroup', {
      naming: props.naming,
      securityGroupName: `agentcore-harness-vpce-client-${props.harnessName}`,
      description: `Private endpoint client access for Harness ${props.harnessName}`,
      vpc,
      allowAllOutbound: false,
      // Egress rules are created below instead of being passed here. `egressRules.sg` routes them through
      // CDK's rule-scoping, which names a rule after its peer - and for a peer whose id is an unresolved
      // token, as an endpoint security group's id is, that name is a positional counter
      // (`{IndirectPeer}`, `{IndirectPeer2}`, ...). Adding or removing one service would renumber every
      // rule after it, and since every property of an egress rule is create-only, CloudFormation would
      // author a replacement identical to a rule it has not deleted yet, which EC2 rejects with
      // InvalidPermission.Duplicate. Keyed on the service instead, a rule's identity never depends on
      // its neighbours. The security group keeps CDK's inline no-traffic marker either way, since
      // MdaaSecurityGroup does not clear it for rules added after construction.
    });
    this.securityGroupId = clientSecurityGroup.securityGroupId;
    this.grantEndpointAccess(props, clientSecurityGroup.securityGroupId);
  }

  /**
   * Creates the matched egress/ingress pair per resolved endpoint: egress from the client group to the
   * endpoint group, and ingress on the endpoint group from the client group.
   *
   * Both rules of a pair are named after the service, so a rule's logical id depends only on which
   * service it serves - never on how many other services there are or on configuration order.
   */
  private grantEndpointAccess(props: HarnessVpcEndpointAccessProps, clientSecurityGroupId: string): void {
    const endpointsScope = new Construct(this, 'Endpoints');
    Object.entries(props.access.securityGroupIds).forEach(([service, securityGroupId]) => {
      new CfnSecurityGroupEgress(endpointsScope, `${service}-egress`, {
        groupId: clientSecurityGroupId,
        destinationSecurityGroupId: securityGroupId,
        ipProtocol: 'tcp',
        fromPort: ENDPOINT_PORT,
        toPort: ENDPOINT_PORT,
        description: `HTTPS to the ${service} VPC endpoint`,
      });
      new CfnSecurityGroupIngress(endpointsScope, `${service}-ingress`, {
        groupId: securityGroupId,
        sourceSecurityGroupId: clientSecurityGroupId,
        ipProtocol: 'tcp',
        fromPort: ENDPOINT_PORT,
        toPort: ENDPOINT_PORT,
        description: `HTTPS from Harness endpoint client to ${service}`,
      });
    });
  }
}

function validateAdditionalSecurityGroupCapacity(securityGroups: string[]): void {
  if (securityGroups.length > MAX_CONFIGURED_SECURITY_GROUPS) {
    throw new Error(
      `Harness "networkConfiguration.securityGroups" can contain at most ${MAX_CONFIGURED_SECURITY_GROUPS} entries ` +
        'when "networkConfiguration.vpcEndpoints" references a set, because the Harness adds one endpoint ' +
        'client security group of its own.',
    );
  }
}
