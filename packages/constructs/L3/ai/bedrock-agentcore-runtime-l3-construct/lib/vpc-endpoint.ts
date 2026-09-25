/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { InterfaceVpcEndpoint, InterfaceVpcEndpointAwsService, ISecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ArnPrincipal, Effect, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { DEFAULT_ACTIONS } from '@aws-mdaa/agentcore-shared';

/**
 * Endpoint policy configuration for the AgentCore interface VPC endpoint.
 * The endpoint policy acts as a firewall rule on the endpoint itself,
 * controlling which principals and actions are allowed through it.
 *
 * Use cases: Restricting IAM callers to specific roles, least-privilege endpoint access
 *
 * AWS: VPC endpoint policy document
 *
 * Validation: allowPrincipals must be valid IAM principal ARNs if provided
 */
export interface VpcEndpointPolicyProperty {
  /**
   * IAM principal ARNs allowed to invoke AgentCore through this endpoint.
   * When omitted, the policy allows any principal ("*") - required for
   * OAuth/JWT-authenticated runtimes, since OAuth callers have no IAM identity
   * visible to the endpoint policy (access control is then enforced by the
   * runtime's resource-based policy and JWT authorizer).
   *
   * Recommended for SigV4/IAM-authenticated runtimes: set to the specific
   * caller role ARNs for least-privilege endpoint access. Do NOT set on
   * JWT-authorized runtimes - OAuth callers cannot match an ARN principal,
   * so restricting principals would lock them out entirely.
   *
   * Use cases: Restricting SigV4 callers to specific roles, defense in depth
   *
   * AWS: Principal element of the VPC endpoint policy
   *
   * Validation: Optional; String[]; valid IAM principal ARNs
   **/
  readonly allowPrincipals?: string[];
}

/**
 * Configuration for MDAA-managed creation of the AgentCore interface VPC endpoint.
 * Presence of this configuration opts in to endpoint creation (opt-in because
 * interface endpoints carry hourly and per-GB costs); an empty object accepts
 * all defaults.
 *
 * The endpoint provides VPC-resident callers a private network path to invoke
 * AgentCore (no internet/NAT), and is the path that produces the aws:SourceVpc
 * request context required by VPC-only resource policies (enforceVpcOnly).
 *
 * If the VPC already has a bedrock-agentcore endpoint (e.g., created by LZA or
 * a central networking team), omit this configuration entirely - only one
 * endpoint with Private DNS is allowed per service per VPC, and a second one
 * will fail to deploy.
 *
 * Use cases: Private invocation path, enforceVpcOnly support, no-NAT environments
 *
 * AWS: Interface VPC endpoint for com.amazonaws.{region}.bedrock-agentcore
 *
 * Validation: presence of this configuration opts in to endpoint creation
 */
export interface VpcEndpointProperty {
  /**
   * Endpoint policy controlling access through the endpoint.
   * Defaults to allowing any principal ("*") restricted to AgentCore invoke
   * actions - the correct default for OAuth-authenticated runtimes.
   *
   * Use cases: Least-privilege endpoint access for IAM callers
   *
   * AWS: VPC endpoint policy document
   *
   * Validation: Optional; VpcEndpointPolicyProperty
   **/
  readonly endpointPolicy?: VpcEndpointPolicyProperty;
  /**
   * Also create supporting interface endpoints commonly required in VPC mode
   * without internet access: ECR API, ECR Docker, STS, and CloudWatch Logs.
   *
   * This creates those four interface endpoints and nothing else - it is not by itself a complete
   * no-NAT configuration. Validate egress for your own runtime image and workload before removing a
   * NAT gateway, and provision any further endpoints out of band.
   *
   * Use cases: Reaching ECR, STS, and CloudWatch Logs over PrivateLink from private subnets;
   * firewalled environments
   *
   * AWS: AWS::EC2::VPCEndpoint (Interface) for ecr.api, ecr.dkr, sts, logs
   *
   * Validation: Optional; Boolean
   **/
  readonly createSupportingEndpoints?: boolean;
}

export interface CreateAgentCoreVpcEndpointProps {
  /** The VPC ID in which to create the endpoint */
  readonly vpcId: string;
  /** Subnet IDs for the endpoint ENIs (typically the runtime's subnets) */
  readonly subnetIds: string[];
  /** Application security group IDs allowed to reach the endpoint over HTTPS (443) */
  readonly ingressSecurityGroupIds: string[];
  /** VPC endpoint configuration (policy, supporting endpoints) */
  readonly vpcEndpointConfig: VpcEndpointProperty;
  /** MDAA naming module for resource names */
  readonly naming: MdaaConstructProps['naming'];
}

export interface AgentCoreVpcEndpoints {
  /** The AgentCore interface endpoint */
  readonly agentCoreEndpoint: InterfaceVpcEndpoint;
  /** Security group attached to the endpoint ENIs */
  readonly securityGroup: ISecurityGroup;
  /** Supporting endpoints (ECR API/Docker, STS, CloudWatch Logs), if requested */
  readonly supportingEndpoints: InterfaceVpcEndpoint[];
}

/** Supporting endpoints commonly required for VPC-mode runtimes without internet access. */
const SUPPORTING_ENDPOINT_SERVICES: { id: string; service: InterfaceVpcEndpointAwsService }[] = [
  { id: 'EcrApiEndpoint', service: InterfaceVpcEndpointAwsService.ECR },
  { id: 'EcrDockerEndpoint', service: InterfaceVpcEndpointAwsService.ECR_DOCKER },
  { id: 'StsEndpoint', service: InterfaceVpcEndpointAwsService.STS },
  { id: 'LogsEndpoint', service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS },
];

/**
 * Creates the AgentCore interface VPC endpoint (com.amazonaws.{region}.bedrock-agentcore)
 * with the secure defaults recommended by the AgentCore security guidance:
 *
 * - Private DNS enabled, so the default regional endpoint resolves to the private IP
 * - Endpoint ENI security group allowing inbound HTTPS (443) only from the
 *   application security groups - not the entire VPC CIDR
 * - Endpoint policy restricted to AgentCore invoke actions; principals default to "*"
 *   (required for OAuth callers) unless specific IAM principal ARNs are configured
 * - Optional supporting endpoints (ECR API/Docker, STS, CloudWatch Logs) for
 *   fully private environments
 *
 * The shared AgentCore service endpoint this builds serves every non-Gateway
 * resource type (Runtime, Tools, Memory, Identity); the Gateway uses a distinct
 * endpoint (bedrock-agentcore.gateway), not created here.
 *
 * NOTE: this builder provisions endpoints per workload, unlike the sibling Harness L3, whose endpoints
 * are owned by the orchestrating Bedrock Builder module and created once per VPC across every harness
 * that opts in. An interface endpoint with Private DNS is a VPC-wide singleton per service, so a Runtime
 * with createSupportingEndpoints and a harness covering the same service in one VPC will fail mid-deploy
 * on the duplicate. Keep the two out of the same VPC until Runtimes move under that orchestration too.
 */
export function createAgentCoreVpcEndpoint(
  scope: Construct,
  id: string,
  props: CreateAgentCoreVpcEndpointProps,
): AgentCoreVpcEndpoints {
  const vpc = Vpc.fromVpcAttributes(scope, `${id}VpcLookup`, {
    vpcId: props.vpcId,
    availabilityZones: ['dummy'],
  });

  const subnets = props.subnetIds.map(subnetId => Subnet.fromSubnetId(scope, `${id}Subnet${subnetId}`, subnetId));

  // Endpoint ENI security group: inbound HTTPS only from the application
  // security groups, never the whole VPC CIDR.
  const securityGroup = new MdaaSecurityGroup(scope, `${id}Sg`, {
    naming: props.naming,
    securityGroupName: 'agentcore-vpce',
    vpc: vpc,
    allowAllOutbound: false,
    ingressRules: {
      sg: props.ingressSecurityGroupIds.map(sgId => ({
        sgId: sgId,
        protocol: 'tcp',
        port: 443,
        description: 'HTTPS from application security group to AgentCore VPC endpoint',
      })),
    },
  });

  const agentCoreEndpoint = new InterfaceVpcEndpoint(scope, `${id}Endpoint`, {
    vpc: vpc,
    service: InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE,
    privateDnsEnabled: true,
    securityGroups: [securityGroup],
    lookupSupportedAzs: false,
    subnets: { subnets },
    // 'open' would add an ingress rule from the entire VPC CIDR - the security
    // guidance calls this out as a common miss. Access is via application SGs only.
    open: false,
  });

  // Endpoint policy: OAuth/JWT callers have no IAM identity visible here, so the
  // principal defaults to "*"; access control for those callers is enforced by the
  // resource-based policy and JWT authorizer. When IAM principal ARNs are
  // configured, restrict the endpoint to them.
  const allowPrincipals = props.vpcEndpointConfig.endpointPolicy?.allowPrincipals;
  agentCoreEndpoint.addToPolicy(
    new PolicyStatement({
      sid: 'AgentCoreInvokeThroughEndpoint',
      effect: Effect.ALLOW,
      principals: allowPrincipals?.length ? allowPrincipals.map(arn => new ArnPrincipal(arn)) : [new StarPrincipal()],
      actions: DEFAULT_ACTIONS,
      resources: ['*'],
    }),
  );

  // Note: unlike the main AgentCore endpoint above (which sets an explicit policy),
  // these supporting endpoints (ECR/STS/Logs) carry AWS's default full-access endpoint policy. An
  // account-scoped `aws:PrincipalAccount` condition would be cheap defence-in-depth (access is
  // otherwise governed by the execution role's identity policy). The AgentCore Harness construct's
  // interface endpoints share this default - apply the condition in both.
  const supportingEndpoints: InterfaceVpcEndpoint[] = props.vpcEndpointConfig.createSupportingEndpoints
    ? SUPPORTING_ENDPOINT_SERVICES.map(
        ({ id: endpointId, service }) =>
          new InterfaceVpcEndpoint(scope, `${id}${endpointId}`, {
            vpc: vpc,
            service: service,
            privateDnsEnabled: true,
            securityGroups: [securityGroup],
            lookupSupportedAzs: false,
            subnets: { subnets },
            open: false,
          }),
      )
    : [];

  return { agentCoreEndpoint, securityGroup, supportingEndpoints };
}
