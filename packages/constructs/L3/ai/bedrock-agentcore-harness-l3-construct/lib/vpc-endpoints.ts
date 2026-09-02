/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { Stack } from 'aws-cdk-lib';
import {
  CfnVPCEndpoint,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  ISecurityGroup,
  Subnet,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { DEFAULT_GATEWAY_ACTIONS } from '@aws-mdaa/agentcore-shared';
import { Construct } from 'constructs';

/**
 * A VPC endpoint the Harness's runtime sessions use for outbound access. Every value here is an
 * endpoint the harness itself calls — there is deliberately no AgentCore data-plane
 * (`com.amazonaws.{region}.bedrock-agentcore`) entry: per the AgentCore PrivateLink documentation
 * that endpoint serves *inbound* API connectivity for callers reaching `InvokeHarness` privately,
 * which is a property of the caller's VPC rather than of the harness's session subnets. It is also a
 * per-VPC singleton, so N harnesses in one module could not each create one. Provision it alongside
 * whatever invokes the harness.
 *
 * Used with {@link HarnessVpcEndpointsProperty.exclude} to skip endpoints the VPC already has.
 */
export enum HarnessVpcEndpointName {
  /**
   * Amazon Bedrock runtime (`bedrock-runtime`), for model inference over the Converse API. The
   * managed agent loop always calls this because the harness always uses the Converse
   * (`converse_stream`) API (see `HarnessBedrockApiFormat`); without a route the harness reaches
   * READY but every invoke hangs indefinitely.
   *
   * NOTE — Bedrock Mantle (future): if the OpenAI-compatible API formats (`responses` /
   * `chat_completions`) are ever exposed and selected, inference for those formats does NOT use
   * `bedrock-runtime`. Bedrock Mantle is a physically separate endpoint host
   * (`bedrock-mantle.<region>.api.aws`) with its own front end, so a VPC-mode harness selecting them
   * would have no private route and every invoke would hang. Supporting them requires two changes
   * here: (1) a new `BEDROCK_MANTLE` entry added to the derived set only when the selected format
   * routes to Mantle — which means threading the API format into {@link HarnessVpcEndpointsProps},
   * since it carries no model-format signal today; and (2) an actual Mantle interface endpoint — CDK's
   * `InterfaceVpcEndpointAwsService` has no Mantle service, so a custom `InterfaceVpcEndpointService`
   * naming `com.amazonaws.<region>.bedrock-mantle` would be needed, contingent on Mantle offering
   * PrivateLink in the target region.
   */
  BEDROCK_RUNTIME = 'bedrockRuntime',
  /**
   * AgentCore Gateway (`bedrock-agentcore.gateway`), created only when the harness declares an
   * `agentcore_gateway` tool. The Gateway is served by a distinct service endpoint from the AgentCore
   * data plane, so without it the tool load fails at first invoke with a DNS
   * `Name or service not known` error.
   */
  AGENTCORE_GATEWAY = 'agentCoreGateway',
  /** ECR API (`ecr.api`), for the ECR calls each session's container image pull makes. */
  ECR_API = 'ecrApi',
  /** ECR Docker Registry (`ecr.dkr`), for the registry protocol of the image pull. */
  ECR_DOCKER = 'ecrDocker',
  /** AWS STS (`sts`), for credential vending inside the session. */
  STS = 'sts',
  /** CloudWatch Logs (`logs`), for log delivery from the session. */
  LOGS = 'logs',
  /**
   * Amazon S3 — a **gateway** endpoint, for container image-*layer* downloads: ECR stores image
   * layers in S3, so the ECR interface endpoints alone cannot complete a pull. Created only when
   * {@link HarnessVpcEndpointsProperty.s3RouteTableIds} is supplied.
   */
  S3 = 's3',
}

/**
 * MDAA-managed VPC endpoints giving a VPC-mode Harness's runtime sessions a private outbound path
 * (no NAT/internet). Presence of this configuration opts in to endpoint creation.
 *
 * Which endpoints are created is **derived** from the harness's own configuration rather than listed
 * here: the managed agent loop always calls Bedrock for inference and always pulls a container image,
 * and the AgentCore Gateway endpoint is added exactly when the harness declares an
 * `agentcore_gateway` tool. That removes the failure mode where a hand-listed selection omits an
 * endpoint the harness needs — such a harness deploys cleanly and fails only at first invoke, with
 * errors (a DNS failure, a hang, an image-pull timeout) that do not obviously point at a missing
 * endpoint.
 *
 * Use {@link exclude} for endpoints the VPC already has: only one endpoint with Private DNS is
 * allowed per service per VPC, so a duplicate fails to deploy.
 *
 * No endpoint policy is exposed as a config knob. The supporting interface endpoints (Bedrock runtime,
 * ECR API/Docker, STS, Logs) carry no policy: each is traversed *outbound* by the AgentCore service and
 * this harness's execution role across a range of actions, and Private DNS makes an interface endpoint
 * VPC-wide, so restricting their actions would deny the harness's own image pulls and break unrelated
 * workloads in the same VPC — access to those is governed by the execution role's identity policy
 * (scoped to the resolved model, gateway, and repository ARNs) instead. Two endpoints are scoped rather
 * than left to the default, because each carries only one kind of legitimate traffic: the AgentCore
 * Gateway interface endpoint carries an action-scoped (`bedrock-agentcore:InvokeGateway`) StarPrincipal
 * policy — its sole traffic is gateway data-plane invokes, management going to the separate
 * bedrock-agentcore-control service — and the S3 gateway endpoint carries a resource-scoped policy (see
 * {@link s3RouteTableIds}).
 *
 * Use cases: fully private (no-NAT) harness sessions, VPC-mode gateway tools
 *
 * AWS: AWS::EC2::VPCEndpoint (Interface and Gateway)
 *
 * Validation: Optional; requires `networkConfiguration.vpcId` when present
 */
export interface HarnessVpcEndpointsProperty {
  /**
   * Route table IDs to associate the S3 **gateway** endpoint with, enabling container image-layer
   * downloads. Supply these for a no-NAT VPC; omit them to skip the S3 endpoint (image layers then
   * need NAT or an out-of-band S3 path).
   *
   * A gateway endpoint installs prefix-list routes into route tables rather than placing ENIs in
   * subnets, and imported subnets expose no discoverable route table, so the tables must be named
   * explicitly.
   *
   * IMPORTANT — blast radius: the endpoint therefore intercepts **all** S3 traffic from every subnet
   * associated with these route tables, not just the harness's. MDAA scopes its endpoint policy to the
   * ECR image-layer bucket, so other workloads sharing these route tables lose S3 access through this
   * endpoint unless their buckets are named in {@link additionalS3BucketArns}. If those workloads need
   * broad S3 access, provision the S3 gateway endpoint out of band instead of enabling it here.
   *
   * Use cases: no-NAT container image-layer pulls from the ECR layer bucket
   *
   * AWS: RouteTableIds of the S3 gateway VPC endpoint
   *
   * Validation: Optional; String[]; non-empty when provided
   *
   * @minItems 1
   **/
  readonly s3RouteTableIds?: string[];
  /**
   * Additional S3 resource ARNs to allow read access to through the S3 gateway endpoint, on top of the
   * ECR image-layer bucket. Supply these when other workloads share the named route tables and would
   * otherwise lose S3 access through the endpoint. Grants `s3:GetObject` / `s3:ListBucket`; pass bucket
   * and/or object ARNs as needed.
   *
   * Use cases: readmitting co-located workloads' buckets on shared route tables
   *
   * AWS: Resource element of the S3 gateway endpoint policy
   *
   * Validation: Optional; String[]; valid S3 ARNs
   **/
  readonly additionalS3BucketArns?: string[];
  /**
   * Endpoints to skip because the VPC already has them (created by LZA or a central networking team,
   * for example). Only one endpoint with Private DNS is allowed per service per VPC, so an
   * unexcluded duplicate fails to deploy.
   *
   * Use cases: coexisting with centrally provisioned VPC endpoints
   *
   * AWS: AWS::EC2::VPCEndpoint
   *
   * Validation: Optional; each entry a {@link HarnessVpcEndpointName} value
   **/
  readonly exclude?: HarnessVpcEndpointName[];
}

/** Props for {@link HarnessVpcEndpoints}. */
export interface HarnessVpcEndpointsProps {
  /** The VPC ID in which to create the endpoints */
  readonly vpcId: string;
  /** Subnet IDs for the interface endpoint ENIs (the harness's own session subnets) */
  readonly subnetIds: string[];
  /** The harness's security group IDs, allowed to reach the endpoints over HTTPS (443) */
  readonly ingressSecurityGroupIds: string[];
  /** Caller-supplied endpoint configuration (S3 route tables, exclusions) */
  readonly config: HarnessVpcEndpointsProperty;
  /**
   * Whether the harness declares an `agentcore_gateway` tool. When true the AgentCore Gateway
   * endpoint is added to the derived set; the harness cannot reach a gateway's MCP host without it.
   */
  readonly hasGatewayTool: boolean;
  /**
   * Per-resource qualifier woven into the endpoint security group's physical name (and thus its SSM
   * export), e.g. `agentcore-harness-vpce-<nameScope>`. The SG is created with an explicit name, which
   * MDAA naming scopes only to the module — so without this qualifier two harnesses configuring
   * endpoints in the SAME module would synth colliding SG names and fail to deploy.
   */
  readonly nameScope: string;
  /** MDAA naming module for resource names */
  readonly naming: MdaaConstructProps['naming'];
}

/** Read action allowed on the ECR image-layer bucket, per the ECR minimum-S3-permissions guidance. */
const S3_IMAGE_LAYER_ACTIONS = ['s3:GetObject'];
/** Read actions allowed on operator-supplied additional bucket ARNs. */
const S3_ADDITIONAL_BUCKET_ACTIONS = ['s3:GetObject', 's3:ListBucket'];

/** The interface endpoints a harness may need, with the CDK service and child construct id for each. */
const INTERFACE_ENDPOINTS: {
  name: HarnessVpcEndpointName;
  constructId: string;
  service: InterfaceVpcEndpointAwsService;
}[] = [
  {
    name: HarnessVpcEndpointName.BEDROCK_RUNTIME,
    constructId: 'BedrockRuntimeEndpoint',
    service: InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
  },
  {
    name: HarnessVpcEndpointName.AGENTCORE_GATEWAY,
    constructId: 'AgentCoreGatewayEndpoint',
    service: InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY,
  },
  {
    name: HarnessVpcEndpointName.ECR_API,
    constructId: 'EcrApiEndpoint',
    service: InterfaceVpcEndpointAwsService.ECR,
  },
  {
    name: HarnessVpcEndpointName.ECR_DOCKER,
    constructId: 'EcrDockerEndpoint',
    service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
  },
  {
    name: HarnessVpcEndpointName.STS,
    constructId: 'StsEndpoint',
    service: InterfaceVpcEndpointAwsService.STS,
  },
  {
    name: HarnessVpcEndpointName.LOGS,
    constructId: 'LogsEndpoint',
    service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
  },
];

/**
 * The interface endpoints a harness derives from its own configuration: the always-needed supporting
 * set (Bedrock runtime, ECR API/Docker, STS, Logs) plus the AgentCore Gateway endpoint when a gateway
 * tool is declared, minus anything in {@link HarnessVpcEndpointsProperty.exclude}.
 *
 * Single source of truth shared by {@link HarnessVpcEndpoints} (what it creates) and
 * {@link validateHarnessVpcEndpointCollisions} (what it checks for cross-harness duplicates), so the
 * set validated is exactly the set created.
 *
 * The S3 **gateway** endpoint is deliberately excluded from this set: it is scoped by route table, not
 * by the Private-DNS "one interface endpoint per service per VPC" rule that drives the collision check
 * — two harnesses collide on S3 only when they name overlapping route tables, a separate concern.
 */
function deriveHarnessInterfaceVpcEndpointNames(
  config: HarnessVpcEndpointsProperty,
  hasGatewayTool: boolean,
): HarnessVpcEndpointName[] {
  const excluded = new Set<string>(config.exclude ?? []);
  return INTERFACE_ENDPOINTS.map(spec => spec.name).filter(name => {
    // The gateway endpoint is needed only by a harness declaring a gateway tool; the rest are always
    // needed in VPC mode (inference, image pull, credentials, logs).
    const needed = name === HarnessVpcEndpointName.AGENTCORE_GATEWAY ? hasGatewayTool : true;
    return needed && !excluded.has(name);
  });
}

/**
 * One harness's inputs to the cross-harness VPC-endpoint collision check
 * ({@link validateHarnessVpcEndpointCollisions}).
 */
export interface HarnessVpcEndpointCollisionEntry {
  /** Harness name, used to name the offending harnesses in error messages. */
  readonly harnessName: string;
  /** The VPC in which this harness's endpoints are created; the grouping key for the check. */
  readonly vpcId: string;
  /**
   * The harness's own security groups — the ingress allowlist of every endpoint it creates. A
   * co-located harness with different security groups cannot reach those endpoints (see below).
   */
  readonly securityGroups: string[];
  /** The harness's endpoint configuration, driving its derived set and its exclusions. */
  readonly config: HarnessVpcEndpointsProperty;
  /** Whether the harness declares an `agentcore_gateway` tool (adds the Gateway endpoint to the set). */
  readonly hasGatewayTool: boolean;
}

/**
 * Fails fast at synth time when two or more harnesses configuring `networkConfiguration.vpcEndpoints`
 * in the SAME VPC would create a broken deployment. Harnesses in different VPCs never interact, so the
 * check runs per-VPC group and is a no-op for a group of one.
 *
 * Two failure modes are caught, both of which synth cleanly today and surface only at deploy or first
 * invoke:
 *
 * 1. **Duplicate endpoint (deploy-time `CREATE_FAILED`).** AWS allows only one Private-DNS interface
 *    endpoint per service per VPC, so if two harnesses derive an overlapping interface-endpoint set the
 *    second to deploy fails. Resolve by listing the shared endpoints in each all-but-one harness's
 *    `vpcEndpoints.exclude` (they then share the first harness's endpoints), or by moving harnesses to
 *    separate VPCs.
 *
 * 2. **Unreachable endpoint (first-invoke hang).** Each endpoint's ENI security group admits inbound
 *    HTTPS only from the creating harness's own security groups, and Private DNS makes the endpoint
 *    VPC-wide — so a co-located harness with *different* security groups resolves the private hostname
 *    but is denied at the endpoint, reaching READY and then hanging at first invoke. `exclude` cannot
 *    close this (it removes the duplicate, not the security-group mismatch), so the construct requires
 *    every harness that CONFIGURES `vpcEndpoints` in a shared VPC to declare identical
 *    `networkConfiguration.securityGroups`. Not covered: a co-located harness that configures no
 *    `vpcEndpoints` never enters the collision set, so it can still hit this hang with mismatched
 *    security groups — closed by the planned shared-per-VPC endpoint set.
 *
 * The guard is deliberately strict: it permits only (a) harnesses in distinct VPCs and (b) same-VPC
 * harnesses that share security groups and whose endpoint sets do not overlap. Admitting arbitrary
 * co-located harnesses would require a single shared endpoint set per VPC that accepts every
 * co-located harness's security group.
 */
export function validateHarnessVpcEndpointCollisions(entries: HarnessVpcEndpointCollisionEntry[]): void {
  const byVpc = new Map<string, HarnessVpcEndpointCollisionEntry[]>();
  for (const entry of entries) {
    const group = byVpc.get(entry.vpcId) ?? [];
    group.push(entry);
    byVpc.set(entry.vpcId, group);
  }

  for (const [vpcId, group] of byVpc) {
    if (group.length < 2) {
      continue;
    }
    // Security-group mismatch first: it applies even when excludes eliminate every duplicate, so it is
    // the trap `exclude` cannot close.
    validateSharedSecurityGroups(vpcId, group);
    validateNoEndpointOverlap(vpcId, group);
  }
}

/** Order-insensitive key for a harness's security-group set, so [a,b] and [b,a] compare equal. */
function securityGroupKey(entry: HarnessVpcEndpointCollisionEntry): string {
  return Array.from(new Set(entry.securityGroups))
    .sort((a, b) => a.localeCompare(b))
    .join(',');
}

/** Throws when harnesses sharing a VPC declare different security groups (first-invoke-hang trap). */
function validateSharedSecurityGroups(vpcId: string, group: HarnessVpcEndpointCollisionEntry[]): void {
  if (new Set(group.map(securityGroupKey)).size === 1) {
    return;
  }
  const details = group.map(entry => `  - ${entry.harnessName}: [${entry.securityGroups.join(', ')}]`).join('\n');
  throw new Error(
    `Multiple harnesses configure "networkConfiguration.vpcEndpoints" in the same VPC (${vpcId}) with ` +
      `different "networkConfiguration.securityGroups". A shared interface endpoint admits inbound HTTPS ` +
      `only from the security groups of the harness that created it, so a co-located harness with ` +
      `different security groups reaches READY and then hangs at first invoke. In this release, give every ` +
      `harness sharing a VPC identical security groups, or place them in separate VPCs.\n\n` +
      `Harnesses configuring VPC endpoints in VPC ${vpcId}:\n${details}`,
  );
}

/** Throws when two harnesses sharing a VPC derive the same interface endpoint (deploy-time duplicate). */
function validateNoEndpointOverlap(vpcId: string, group: HarnessVpcEndpointCollisionEntry[]): void {
  const creators = new Map<HarnessVpcEndpointName, string[]>();
  for (const entry of group) {
    for (const name of deriveHarnessInterfaceVpcEndpointNames(entry.config, entry.hasGatewayTool)) {
      creators.set(name, [...(creators.get(name) ?? []), entry.harnessName]);
    }
  }

  const collisions = Array.from(creators).filter(([, names]) => names.length > 1);
  if (collisions.length === 0) {
    return;
  }
  const details = collisions.map(([name, names]) => `  - ${name}: ${names.join(', ')}`).join('\n');
  throw new Error(
    `Multiple harnesses would each create the same interface VPC endpoint in VPC ${vpcId}. AWS allows only ` +
      `one Private-DNS interface endpoint per service per VPC, so the second harness to deploy fails with a ` +
      `duplicate-endpoint error. List the shared endpoints in all-but-one harness's ` +
      `"networkConfiguration.vpcEndpoints.exclude" (so they reuse the remaining harness's endpoints), or ` +
      `place harnesses in separate VPCs.\n\n` +
      `Endpoints derived by more than one harness in VPC ${vpcId} (endpoint: harnesses):\n${details}`,
  );
}

/**
 * Creates the VPC endpoints a VPC-mode Harness's runtime sessions need for outbound access, with the
 * secure defaults recommended by the AgentCore security guidance:
 *
 * - Private DNS enabled, so the default regional endpoints resolve to private IPs with no code change
 * - A single endpoint ENI security group allowing inbound HTTPS (443) only from the harness's own
 *   security groups — never the whole VPC CIDR (`open: false`)
 * - The S3 gateway endpoint scoped to the ECR image-layer bucket rather than inheriting S3 full access
 *
 * The set is derived from the harness's configuration (see {@link HarnessVpcEndpointsProperty}), minus
 * anything the caller excludes. This construct is Harness-specific by design: the AgentCore Runtime
 * module has its own endpoint helper with a different set and an inbound data-plane endpoint, and an
 * abstraction spanning both obscured which endpoints each resource actually needs.
 */
export class HarnessVpcEndpoints extends Construct {
  /** Interface endpoints created, keyed by {@link HarnessVpcEndpointName}. */
  public readonly interfaceEndpoints: { [name: string]: InterfaceVpcEndpoint };
  /** Security group attached to the interface endpoint ENIs (a gateway endpoint takes none). */
  public readonly securityGroup: ISecurityGroup;

  constructor(scope: Construct, id: string, props: HarnessVpcEndpointsProps) {
    super(scope, id);

    const excluded = new Set<string>(props.config.exclude ?? []);

    const vpc = Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: props.vpcId,
      availabilityZones: ['dummy'],
    });

    // Deduplicate: a repeated subnet id would otherwise collide on the child construct id.
    const subnetIds = Array.from(new Set(props.subnetIds));
    const subnets = subnetIds.map(subnetId => Subnet.fromSubnetId(this, `Subnet${subnetId}`, subnetId));

    // Endpoint ENI security group: inbound HTTPS only from the harness's own security groups, never
    // the whole VPC CIDR. The name carries a per-harness qualifier so several endpoint-configured
    // harnesses can coexist in one module without colliding SG names.
    this.securityGroup = new MdaaSecurityGroup(this, 'SecurityGroup', {
      naming: props.naming,
      securityGroupName: `agentcore-harness-vpce-${props.nameScope}`,
      vpc: vpc,
      allowAllOutbound: false,
      ingressRules: {
        sg: props.ingressSecurityGroupIds.map(sgId => ({
          sgId: sgId,
          protocol: 'tcp',
          port: 443,
          description: 'HTTPS from harness security group to AgentCore VPC endpoint',
        })),
      },
    });

    // Derive the interface-endpoint set once, from the same helper the cross-harness collision check
    // uses (see validateHarnessVpcEndpointCollisions), so what is created matches what is validated.
    const neededNames = new Set<string>(deriveHarnessInterfaceVpcEndpointNames(props.config, props.hasGatewayTool));

    const interfaceEndpoints: { [name: string]: InterfaceVpcEndpoint } = {};
    INTERFACE_ENDPOINTS.forEach(spec => {
      if (!neededNames.has(spec.name)) {
        return;
      }
      // Note: the supporting interface endpoints here (Bedrock runtime, ECR, STS,
      // Logs) still carry AWS's default full-access endpoint policy — unlike the Gateway endpoint
      // scoped just below and the S3 gateway endpoint. An account-scoped `aws:PrincipalAccount`
      // condition would be cheap defence-in-depth (access is otherwise governed by the execution role's
      // identity policy). The AgentCore Runtime construct's supporting endpoints share this default —
      // apply the condition in both.
      const endpoint = new InterfaceVpcEndpoint(this, spec.constructId, {
        vpc: vpc,
        service: spec.service,
        privateDnsEnabled: true,
        securityGroups: [this.securityGroup],
        lookupSupportedAzs: false,
        subnets: { subnets },
        // 'open' would add an ingress rule from the entire VPC CIDR — the security guidance calls this
        // out as a common miss. Access is via the harness's own security groups only.
        open: false,
      });
      interfaceEndpoints[spec.name] = endpoint;

      // The AgentCore Gateway is the one interface endpoint here whose only legitimate traffic is a
      // single action — gateway data-plane invokes (management goes to the separate
      // bedrock-agentcore-control service) — so it can carry an action-scoped policy where the shared,
      // multi-action supporting endpoints above cannot. Principal stays "*": a session's execution-role
      // identity is not matchable at the endpoint, and the resolved-gateway ARN scope lives on that
      // identity policy. This mirrors the AgentCore Runtime endpoint's posture. e2e-validated: an
      // InvokeGateway-only policy runs the full harness suite green, while an explicit deny of the action
      // deterministically breaks the gateway MCP client — so the scope is both sufficient and effective.
      if (spec.name === HarnessVpcEndpointName.AGENTCORE_GATEWAY) {
        endpoint.addToPolicy(
          new PolicyStatement({
            sid: 'AgentCoreGatewayInvokeThroughEndpoint',
            effect: Effect.ALLOW,
            // Reachability is already restricted at the endpoint SG (inbound 443 from the harness's own
            // security groups only) and the action is scoped to InvokeGateway; the execution-role identity
            // is not matchable at the endpoint, so the principal cannot be narrowed further.
            principals: [new StarPrincipal()], // NOSONAR — SG- and action-scoped; principal not narrowable
            actions: DEFAULT_GATEWAY_ACTIONS,
            resources: ['*'],
          }),
        );
      }
    });
    this.interfaceEndpoints = interfaceEndpoints;

    this.createS3GatewayEndpoint(props, excluded);
  }

  /**
   * Creates the S3 gateway endpoint with a least-privilege policy allowing only the ECR image-layer
   * read (`s3:GetObject` on `prod-<region>-starport-layer-bucket/*`), plus any operator-supplied
   * additional bucket ARNs. Without an explicit policy the endpoint would inherit S3 full access for
   * every subnet on the named route tables.
   */
  private createS3GatewayEndpoint(props: HarnessVpcEndpointsProps, excluded: Set<string>): CfnVPCEndpoint | undefined {
    const routeTableIds = props.config.s3RouteTableIds;
    if (!routeTableIds?.length || excluded.has(HarnessVpcEndpointName.S3)) {
      return undefined;
    }

    const { partition, region } = Stack.of(this);
    const statements: Record<string, unknown>[] = [
      {
        Sid: 'AllowEcrImageLayerPull',
        Effect: 'Allow',
        Principal: '*',
        Action: S3_IMAGE_LAYER_ACTIONS,
        Resource: [`arn:${partition}:s3:::prod-${region}-starport-layer-bucket/*`],
      },
    ];
    if (props.config.additionalS3BucketArns?.length) {
      statements.push({
        Sid: 'AllowAdditionalBucketRead',
        Effect: 'Allow',
        Principal: '*',
        Action: S3_ADDITIONAL_BUCKET_ACTIONS,
        Resource: props.config.additionalS3BucketArns,
      });
    }

    return new CfnVPCEndpoint(this, 'S3GatewayEndpoint', {
      vpcId: props.vpcId,
      serviceName: GatewayVpcEndpointAwsService.S3.name,
      vpcEndpointType: 'Gateway',
      routeTableIds: routeTableIds,
      policyDocument: {
        Version: '2012-10-17',
        Statement: statements,
      },
    });
  }
}
