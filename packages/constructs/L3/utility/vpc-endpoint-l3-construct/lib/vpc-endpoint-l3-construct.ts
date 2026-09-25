/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Token } from 'aws-cdk-lib';
import {
  CfnVPCEndpoint,
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpoint,
  IInterfaceVpcEndpointService,
  IVpc,
  Subnet,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { ArnPrincipal, Effect, PolicyDocument, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Effect applied by an endpoint-policy statement.
 *
 * AWS: IAM policy Effect
 */
export enum VpcEndpointPolicyEffect {
  /** Allow matching requests through the endpoint. */
  ALLOW = 'Allow',
  /** Deny matching requests through the endpoint. */
  DENY = 'Deny',
}

/**
 * One statement in a VPC endpoint policy.
 *
 * AWS: VPC endpoint policy statement
 *
 * Validation: actions must not be empty
 */
export interface VpcEndpointPolicyStatementProperty {
  /** IAM actions allowed or denied by this statement. At least one. */
  readonly actions: string[];
  /**
   * Resources matched by this statement, each an ARN or `*`. Omitting it matches every resource, which a
   * gateway endpoint's statement may not do: it carries every subnet on its route tables, so defaulting
   * to `*` there would grant them all the statement's actions across the whole service. State `["*"]` on
   * a gateway statement to accept that deliberately.
   */
  readonly resources?: string[];
  /**
   * IAM principal ARNs allowed or denied by this statement. Omit it, or use `*`, for an endpoint policy
   * that relies on identity policy and endpoint security groups for principal control.
   */
  readonly principals?: string[];
  /** IAM effect for the statement. */
  readonly effect: VpcEndpointPolicyEffect;
  /** Statement identifier, so the rendered endpoint policy is readable in the console. */
  readonly sid?: string;
  /**
   * IAM condition block for this statement, in the `{ Operator: { key: value } }` shape - for example
   * `{ StringEquals: { 'aws:PrincipalAccount': '111122223333' } }`. Passed through verbatim.
   *
   * This is how a statement is scoped when its `principals` cannot be narrowed: an endpoint policy is
   * evaluated with the caller's account and organization in the request context even where the calling
   * role's ARN is not matchable, so an account- or org-scoped condition narrows a statement that would
   * otherwise have to stay on `"*"`.
   */
  readonly conditions?: { [operator: string]: unknown };
}

/**
 * Complete endpoint policy applied to one endpoint.
 *
 * An interface endpoint's policy applies to every workload in the VPC that resolves it through Private
 * DNS; a gateway endpoint's applies to every subnet on its route tables. Configure either with that
 * blast radius in mind.
 *
 * AWS: VPC endpoint policy document
 *
 * Validation: statements must not be empty
 */
export interface VpcEndpointPolicyProperty {
  /** Policy statements applied to the endpoint. At least one. */
  readonly statements: VpcEndpointPolicyStatementProperty[];
}

/**
 * One interface VPC endpoint to create.
 *
 * Each gets its own security group, created with no ingress. Consumers add their own narrowly scoped
 * ingress rule to that group, so this construct never needs to know every workload security group, and a
 * consumer reaching only some services is granted only those.
 *
 * AWS: AWS::EC2::VPCEndpoint with VpcEndpointType Interface
 */
export interface InterfaceVpcEndpointProperty {
  /**
   * The endpoint service, as an `aws-cdk-lib` service object - `InterfaceVpcEndpointAwsService.STS`,
   * `...ECR_DOCKER`, `...STS_FIPS` - or any `InterfaceVpcEndpointService` the caller builds for a
   * service the catalogue does not list. The service object renders the full endpoint service name for
   * the deployment's region and partition and carries the port, so neither is configured here, and MDAA
   * governs no service table of its own.
   */
  readonly service: IInterfaceVpcEndpointService;
  /**
   * Name segment for this endpoint's construct id, security group name, and its entry in
   * {@link VpcEndpointL3Construct.interfaceEndpointSecurityGroupIds}. Supplied rather than read off the
   * service, because the `IInterfaceVpcEndpointService` interface carries no name a construct id can use
   * - only the concrete AWS-service class does, and a caller may pass a custom service instead.
   */
  readonly name: string;
  /**
   * Subnet IDs in which AWS creates the endpoint ENIs. At most one per availability zone; an interface
   * endpoint is reachable from any zone, so covering fewer costs less in ENI hours and more in
   * cross-zone data.
   */
  readonly subnetIds: string[];
  /**
   * Endpoint policy. Omitting it leaves the endpoint on the AWS default policy, which is appropriate for
   * a multi-action service endpoint: Private DNS makes an interface endpoint VPC-wide, so a restrictive
   * default would deny traffic from unrelated workloads, and what a workload may do through the endpoint
   * is otherwise governed by its own IAM identity policy.
   */
  readonly policy?: VpcEndpointPolicyProperty;
}

/**
 * One gateway VPC endpoint to create.
 *
 * A gateway endpoint installs prefix-list routes into route tables rather than placing ENIs in subnets,
 * so it intercepts all traffic to its service from every subnet on those route tables. It has no
 * security group, so its policy is the only control on it - hence the policy is required.
 *
 * AWS: AWS::EC2::VPCEndpoint with VpcEndpointType Gateway
 */
export interface GatewayVpcEndpointProperty {
  /**
   * The endpoint service, as an `aws-cdk-lib` service object: AWS offers gateway endpoints for
   * `GatewayVpcEndpointAwsService.S3`, `S3_EXPRESS` and `DYNAMODB` only.
   */
  readonly service: GatewayVpcEndpointAwsService;
  /** Name segment for this endpoint's construct id. */
  readonly name: string;
  /** Route table IDs that receive the service's prefix-list route. */
  readonly routeTableIds: string[];
  /**
   * Endpoint policy. Required, unlike on an interface endpoint: a gateway endpoint carries every subnet
   * on its route tables and has no security group, and the AWS default policy grants those subnets full
   * access to the service, so there is no safe implicit default to fall back on.
   */
  readonly policy: VpcEndpointPolicyProperty;
}

/** Properties for {@link VpcEndpointL3Construct}. */
export interface VpcEndpointL3ConstructProps extends MdaaL3ConstructProps {
  /** VPC ID in which the endpoints are created. */
  readonly vpcId: string;
  /**
   * Qualifier woven into each endpoint security group's physical name, so several instances of this
   * construct in one module (one per VPC) do not synthesize colliding security group names. MDAA naming
   * scopes an explicit name only to the module, so the qualifier has to come from the caller.
   */
  readonly nameScope: string;
  /** Interface endpoints to create. */
  readonly interfaces?: InterfaceVpcEndpointProperty[];
  /** Gateway endpoints to create. */
  readonly gateways?: GatewayVpcEndpointProperty[];
}

/**
 * Creates the AWS service endpoints of one VPC and exposes each interface endpoint's security group to
 * the orchestrating module, which wires its own workloads to them.
 *
 * A nested primitive rather than a module of its own: it takes `aws-cdk-lib` service objects and
 * pre-built policies, so it holds no service catalogue, no per-service knowledge, and no configuration
 * vocabulary - the orchestrating module owns all three and decides which endpoints exist.
 *
 * Interface endpoint security groups intentionally start with no ingress. Each consumer creates a unique
 * client security group and is granted access to only the endpoints it uses, so workloads sharing a VPC
 * can share endpoints without a shared workload security group.
 */
export class VpcEndpointL3Construct extends MdaaL3Construct {
  /**
   * Security group id of each interface endpoint created, keyed by its `name`. The contract the orchestrating module wires its workloads against: a consumer adds an ingress rule for
   * its own client security group to the groups of the services it uses. Gateway endpoints have no
   * security group and so contribute no entry.
   */
  public readonly interfaceEndpointSecurityGroupIds: { [endpointName: string]: string };

  protected readonly props: VpcEndpointL3ConstructProps;

  constructor(scope: Construct, id: string, props: VpcEndpointL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    validateVpcEndpoints(props);
    const vpc = Vpc.fromVpcAttributes(this, 'vpc', {
      vpcId: props.vpcId,
      // Endpoint placement is driven by the explicit subnetIds below and lookupSupportedAzs is off, so
      // no AZ list is consulted. fromVpcAttributes requires the property regardless.
      availabilityZones: ['unused-az'],
    });
    this.interfaceEndpointSecurityGroupIds = Object.fromEntries(
      (props.interfaces ?? []).map(endpoint => [endpoint.name, this.createInterfaceEndpoint(endpoint, vpc)]),
    );
    (props.gateways ?? []).forEach(endpoint => this.createGatewayEndpoint(endpoint));
  }

  /**
   * Creates one interface endpoint and its own ingress-less security group.
   *
   * @returns the endpoint security group id, for the consumer wiring contract
   */
  private createInterfaceEndpoint(endpoint: InterfaceVpcEndpointProperty, vpc: IVpc): string {
    const nameSegment = toNameSegment(endpoint.name);
    const subnets = Array.from(new Set(endpoint.subnetIds)).map((subnetId, index) =>
      Subnet.fromSubnetId(this, `${nameSegment}-subnet-${index}`, subnetId),
    );
    const endpointSecurityGroup = new MdaaSecurityGroup(this, `${nameSegment}-security-group`, {
      naming: this.props.naming,
      securityGroupName: `vpc-endpoint-${this.props.nameScope}-${nameSegment}`,
      description: `Consumer access to the ${endpoint.name} VPC endpoint`,
      vpc,
      allowAllOutbound: false,
    });
    const created = new InterfaceVpcEndpoint(this, `${nameSegment}-endpoint`, {
      vpc,
      service: endpoint.service,
      privateDnsEnabled: true,
      securityGroups: [endpointSecurityGroup],
      lookupSupportedAzs: false,
      subnets: { subnets },
      // 'open' would add an ingress rule from the entire VPC CIDR. Access is granted per consumer.
      open: false,
    });
    endpoint.policy?.statements.forEach(statement => created.addToPolicy(toPolicyStatement(statement)));
    return endpointSecurityGroup.securityGroupId;
  }

  private createGatewayEndpoint(endpoint: GatewayVpcEndpointProperty): void {
    new CfnVPCEndpoint(this, `${toNameSegment(endpoint.name)}-gateway-endpoint`, {
      vpcId: this.props.vpcId,
      serviceName: endpoint.service.name,
      vpcEndpointType: 'Gateway',
      routeTableIds: Array.from(new Set(endpoint.routeTableIds)),
      policyDocument: new PolicyDocument({
        statements: endpoint.policy.statements.map(statement => toPolicyStatement(statement)),
      }).toJSON(),
    });
  }
}

/**
 * A service short name is a construct-id and security-group-name segment, and the CDK spells some
 * services with a `.` (`ecr.api`, `bedrock-agentcore.gateway`). `/` is the only character a construct id
 * strictly forbids, but a `-` segment keeps ids and physical names uniform.
 */
function toNameSegment(name: string): string {
  return name.replace(/\./g, '-');
}

/**
 * Fail-fast validation before any resource is built.
 *
 * The service catalogue is the CDK's, and the caller passes service objects rather than names, so there
 * is no service name to validate. What is left is a duplicate endpoint - which would otherwise surface
 * as an opaque construct-id collision - and policies CloudFormation would reject or silently widen.
 */
function validateVpcEndpoints(props: VpcEndpointL3ConstructProps): void {
  validateNotEmpty(props);
  validateNoDuplicateServices(props);
  validatePolicies(props);
  validatePlacementUniqueness(props);
}

/**
 * Rejects a configuration that creates no endpoint. It deploys cleanly and provisions nothing, so a
 * workload wired to it fails later with an error that points at the consumer rather than here.
 */
function validateNotEmpty(props: VpcEndpointL3ConstructProps): void {
  if ((props.interfaces?.length ?? 0) + (props.gateways?.length ?? 0) === 0) {
    throw new Error(
      `VPC endpoints for VPC "${props.vpcId}" declare no endpoints. Provide at least one entry under ` +
        `"interfaces" or "gateways".`,
    );
  }
}

/**
 * Rejects one service listed twice. AWS allows only one Private DNS interface endpoint per service per
 * VPC, and this construct provisions one VPC, so a duplicate could never deploy - and it would first
 * fail as a construct-id collision naming neither the service nor the reason.
 *
 * Compared on the name segment rather than the raw name: `toNameSegment` turns a `.` into a `-`, so
 * `ecr.api` and `ecr-api` are two spellings of one endpoint, and comparing raw names would let that pair
 * through to the collision this check exists to replace.
 */
function validateNoDuplicateServices(props: VpcEndpointL3ConstructProps): void {
  const interfaceNames = (props.interfaces ?? []).map(endpoint => endpoint.name);
  const gatewayNames = (props.gateways ?? []).map(endpoint => endpoint.name);
  [
    { category: 'Interface', names: interfaceNames },
    { category: 'Gateway', names: gatewayNames },
  ].forEach(({ category, names }) => {
    const segments = names.map(toNameSegment);
    const duplicate = segments.find((segment, index) => segments.indexOf(segment) !== index);
    if (duplicate === undefined) {
      return;
    }
    // The duplicate is a segment, which is the raw name unless a `.` was folded. Report the spelling the
    // caller wrote where there is only one, and name both where they differ - a bare segment would
    // otherwise point at a string the configuration does not contain.
    const spellings = Array.from(new Set(names.filter((_, index) => segments[index] === duplicate)));
    const quotedSpellings = spellings.map(name => `"${name}"`).join(' and ');
    const named = spellings.length === 1 ? quotedSpellings : `"${duplicate}", spelled ${quotedSpellings},`;
    throw new Error(
      `${category} VPC endpoint ${named} is listed more than once for VPC "${props.vpcId}". ` +
        `Provide each service once.`,
    );
  });
}

/**
 * Rejects policies CloudFormation would only reject mid-deploy, or would silently widen.
 *
 * An empty statement list renders as no policy document at all, which makes AWS apply its own
 * full-access default - the opposite of what configuring a policy asks for, and on a gateway endpoint
 * that reaches every subnet on its route tables. An empty `resources` or `principals` list renders an
 * empty `Resource`/`Principal` element, which IAM rejects as a malformed document.
 */
function validatePolicies(props: VpcEndpointL3ConstructProps): void {
  const endpoints: { location: string; isGateway: boolean; policy?: VpcEndpointPolicyProperty }[] = [
    ...(props.interfaces ?? []).map(endpoint => ({
      location: `Interface VPC endpoint "${endpoint.name}"`,
      isGateway: false,
      policy: endpoint.policy,
    })),
    ...(props.gateways ?? []).map(endpoint => ({
      location: `Gateway VPC endpoint "${endpoint.name}"`,
      isGateway: true,
      policy: endpoint.policy,
    })),
  ];
  endpoints.forEach(({ location, isGateway, policy }) => {
    if (!policy) {
      return;
    }
    if (policy.statements.length === 0) {
      throw new Error(
        `${location} has an endpoint policy with no statements, which AWS would replace with its ` +
          `default full-access policy. Provide at least one statement, or omit "policy".`,
      );
    }
    policy.statements.forEach((statement, index) => validatePolicyStatement(location, isGateway, statement, index));
  });
}

/** Rejects the ways one statement can be malformed, or wider than it reads. */
function validatePolicyStatement(
  location: string,
  isGateway: boolean,
  statement: VpcEndpointPolicyStatementProperty,
  index: number,
): void {
  const at = statement.sid ? `statement "${statement.sid}"` : `statement ${index}`;
  (['actions', 'resources', 'principals'] as const).forEach(field => {
    if (statement[field]?.length === 0) {
      throw new Error(`${location} ${at} has an empty "${field}" list. Provide an entry, or omit it.`);
    }
  });
  // An empty condition block renders as no condition at all, so a statement written to be scoped by one
  // applies unscoped instead.
  if (statement.conditions && Object.keys(statement.conditions).length === 0) {
    throw new Error(`${location} ${at} has an empty "conditions" block. Provide a condition, or omit it.`);
  }
  if (isGateway && !statement.resources) {
    throw new Error(
      `${location} ${at} omits "resources", which renders as Resource "*". A gateway endpoint carries ` +
        `every subnet on its route tables, so that grants all of them the statement's actions across the ` +
        `whole service - the reach the required policy exists to narrow. Name the resources, or state ` +
        `["*"] to accept it deliberately.`,
    );
  }
  statement.resources?.forEach(resource => validatePolicyResource(location, at, resource));
}

/**
 * Rejects a `resources` entry that is neither an ARN nor `*`, the only two forms IAM matches.
 *
 * A bare bucket name or a mistyped ARN yields a statement that silently matches nothing, so an endpoint
 * policy meant to grant access denies it instead - and on an endpoint whose deploy takes minutes to fail.
 */
function validatePolicyResource(location: string, at: string, resource: string): void {
  if (Token.isUnresolved(resource) || resource === '*' || resource.startsWith('arn:')) {
    return;
  }
  throw new Error(
    `${location} ${at} names resource "${resource}", which is neither an ARN nor "*". IAM matches only ` +
      `those forms, so give the full ARN (arn:<partition>:<service>:<region>:<account>:<resource>).`,
  );
}

/**
 * Rejects a subnet or route table repeated within one endpoint. Both lists are deduplicated on the way
 * to CloudFormation, so a repeat deploys cleanly and the check exists to reject an obviously mistaken
 * configuration rather than silently accept it.
 *
 * A repeat means something different in each list, and the subnet case is the one worth catching: a
 * route table can carry a given service's prefix-list route only once, so the duplicate is merely
 * redundant, while duplicated subnets collapse a multi-AZ placement to one ENI in one availability zone.
 * An interface endpoint is reachable from every zone, so that endpoint works - until its zone is
 * impaired, which is the failure the second subnet was there to survive.
 *
 * What this cannot check is two *different* subnets in one availability zone, which AWS rejects at
 * deploy: a subnet id carries no zone, so placement per zone is only knowable there.
 */
function validatePlacementUniqueness(props: VpcEndpointL3ConstructProps): void {
  [
    ...(props.interfaces ?? []).map(endpoint => ({
      location: `Interface VPC endpoint "${endpoint.name}"`,
      field: 'subnet',
      ids: endpoint.subnetIds,
    })),
    ...(props.gateways ?? []).map(endpoint => ({
      location: `Gateway VPC endpoint "${endpoint.name}"`,
      field: 'route table',
      ids: endpoint.routeTableIds,
    })),
  ].forEach(({ location, field, ids }) => {
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) {
      throw new Error(
        `${location} in VPC "${props.vpcId}" lists ${field} "${duplicate}" more than once. Name each ` +
          `${field} once.`,
      );
    }
  });
}

/**
 * Renders a configured statement through CDK's policy model so `Principal` is emitted in a form IAM
 * accepts (`"*"` or `{"AWS": ...}`) rather than a bare array.
 */
function toPolicyStatement(props: VpcEndpointPolicyStatementProperty): PolicyStatement {
  const principals = props.principals?.map(principal =>
    principal === '*' ? new StarPrincipal() : new ArnPrincipal(principal),
  ) ?? [new StarPrincipal()];
  return new PolicyStatement({
    sid: props.sid,
    effect: props.effect === VpcEndpointPolicyEffect.ALLOW ? Effect.ALLOW : Effect.DENY,
    actions: props.actions,
    resources: props.resources ?? ['*'],
    principals,
    conditions: props.conditions,
  });
}
