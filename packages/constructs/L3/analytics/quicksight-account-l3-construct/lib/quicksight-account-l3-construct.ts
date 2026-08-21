/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaSecurityGroup, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaBoto3LayerVersion, MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Protocol, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IManagedPolicy, IRole, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnVPCConnection, CfnVPCConnectionProps } from 'aws-cdk-lib/aws-quicksight';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { sanitizeAccountName } from './utils';

export interface AccountWithNameProps extends AccountProps {
  readonly accountName: string;
}

export type AuthenticationMethod = 'IAM_AND_QUICKSIGHT' | 'IAM_ONLY' | 'ACTIVE_DIRECTORY';
export type Edition = 'STANDARD' | 'ENTERPRISE' | 'ENTERPRISE_AND_Q';

/**
 * QuickSight account configuration controlling edition, authentication, VPC connectivity,
 * and access restrictions. MDAA deploys a service account, security group, and VPC
 * connection for secure data source connectivity.
 *
 * Use cases: Account provisioning; VPC data source connectivity; IP-based access control; Glue catalog integration
 *
 * AWS: Amazon QuickSight account, VPC connection, security group
 *
 * Validation: Required fields: edition, authenticationMethod, notificationEmail, vpcId, subnetIds
 */
export interface AccountProps {
  /**
   * QuickSight edition determining feature set and pricing tier.
   *
   * Use cases: Feature tier selection; Q AI capabilities; Enterprise governance
   *
   * AWS: QuickSight account edition
   *
   * Validation: Required; 'STANDARD' | 'ENTERPRISE' | 'ENTERPRISE_AND_Q'
   */
  readonly edition: Edition;
  /**
   * Authentication method controlling how users sign in to QuickSight.
   *
   * Use cases: IAM federation; Active Directory integration; Mixed authentication
   *
   * AWS: QuickSight account authentication configuration
   *
   * Validation: Required; 'IAM_AND_QUICKSIGHT' | 'IAM_ONLY' | 'ACTIVE_DIRECTORY'
   */
  readonly authenticationMethod: AuthenticationMethod;
  /**
   * Email address for QuickSight account notifications including billing and service alerts.
   *
   * Use cases: Account alerts; Billing notifications; Service communications
   *
   * AWS: QuickSight account notification email
   *
   * Validation: Required; valid email format
   */
  readonly notificationEmail: string;
  /**
   * First name of the QuickSight account administrator.
   *
   * Use cases: Account personalization; AWS support communications
   *
   * AWS: QuickSight account admin contact
   *
   * Validation: Optional; string
   */
  readonly firstName?: string;
  /**
   * Last name of the QuickSight account administrator.
   *
   * Use cases: Account personalization; AWS support communications
   *
   * AWS: QuickSight account admin contact
   *
   * Validation: Optional; string
   */
  readonly lastName?: string;
  /**
   * Email address of the QuickSight account administrator.
   *
   * Use cases: Admin contact; Account management notifications
   *
   * AWS: QuickSight account admin email
   *
   * Validation: Optional; valid email format
   */
  readonly emailAddress?: string;
  /**
   * Phone number for the QuickSight account administrator.
   *
   * Use cases: Admin contact; Support escalation
   *
   * AWS: QuickSight account admin phone
   *
   * Validation: Optional; 10 digits
   */
  readonly contactNumber?: string;
  /**
   * VPC to associate with the QuickSight account for secure data source connectivity.
   * MDAA creates a security group and VPC connection for QuickSight to reach
   * VPC-based resources like Redshift clusters.
   *
   * Use cases: Private data source access; Redshift connectivity; VPC network isolation
   *
   * AWS: QuickSight VPC connection
   *
   * Validation: Required; valid VPC ID (vpc-xxxxxxxx)
   */
  readonly vpcId: string;
  /**
   * Subnets for the QuickSight VPC connection. QuickSight requires at least 2 subnets
   * for multi-AZ availability.
   *
   * Use cases: Multi-AZ data source connectivity; High availability
   *
   * AWS: QuickSight VPC connection subnets
   *
   * Validation: Required; array of valid subnet IDs; minimum 2
   */
  readonly subnetIds: string[];
  /**
   * Security group rules controlling which VPC resources QuickSight can connect to.
   * Defines ingress rules for the MDAA-created security group (e.g., Redshift on port 5439).
   *
   * Use cases: Redshift access; RDS connectivity; Data source network rules
   *
   * AWS: QuickSight security group ingress rules
   *
   * Validation: Optional; valid MdaaSecurityGroupRuleProps with sg/ipv4 rules
   */
  readonly securityGroupAccess?: MdaaSecurityGroupRuleProps;
  /**
   * IP CIDR restrictions for QuickSight console access. When specified, only
   * requests from these IP ranges can access the QuickSight interface.
   *
   * Use cases: Corporate network restrictions; IP allowlisting; Compliance access control
   *
   * AWS: QuickSight IP restriction rules
   *
   * Validation: Optional; array of IpRestrictionProps with valid CIDR blocks
   */
  readonly ipRestrictions?: IpRestrictionProps[];
  /**
   * Glue resource patterns granting the QuickSight service role read access to
   * data catalog databases and tables for data source setup and validation.
   *
   * Use cases: Glue catalog integration; Athena data source discovery; Schema validation
   *
   * AWS: IAM permissions for QuickSight service role on Glue resources
   *
   * Validation: Optional; array of Glue resource patterns (e.g., 'database/my-db*')
   */
  readonly glueResourceAccess?: string[];
  /**
   * Permissions to attach to the account-level QuickSight resource-access role
   * (`aws-quicksight-service-role-v0`) created by this module, so QuickSight data sources can
   * reach the underlying AWS resources (Athena/S3/KMS). This module owns the role, so it attaches
   * both AWS-managed policies and customer-managed policies here in one place. See
   * {@link ResourceAccessRolePermissionsProps}.
   *
   * Use cases: Granting an Athena data source the AWS-managed Athena policy, or a scoped
   * customer-managed policy (e.g. athena:GetTableMetadata / athena:ListTableMetadata on a specific
   * data catalog) for least-privilege access
   *
   * AWS: AWS-managed and customer-managed policies attached to the QuickSight resource-access role
   *
   * Validation: Optional; all sub-properties optional
   */
  readonly resourceAccessRolePermissions?: ResourceAccessRolePermissionsProps;
  /**
   * Names of QuickSight groups (in the default namespace) to create. Groups are the
   * QuickSight identity construct referenced when granting access to data sources, datasets,
   * and folders. Created idempotently (existing groups are left as-is); not deleted on stack
   * removal. Add users to these groups separately (the console or `quicksight create-group-membership`).
   *
   * Use cases: Reader/Author access tiers referenced by data source and folder permissions
   *
   * AWS: QuickSight groups in the default namespace
   *
   * Validation: Optional; array of group names
   */
  readonly groups?: string[];
}

/**
 * Permissions to attach to QuickSight's account-level resource-access service role so that
 * QuickSight data sources can reach the underlying AWS resources (Athena, S3, KMS).
 *
 * QuickSight assumes a single account-wide role (`aws-quicksight-service-role-v0`, created by
 * this module) to access AWS services on your behalf. Because this module owns the role — and
 * because QuickSight discovers it by its fixed name and will only assume a role with that exact
 * identity (so it cannot be swapped for a customer-supplied role) — this module attaches both
 * AWS-managed policies (e.g. AWSQuicksightAthenaAccess) and customer-managed policies (for scoped
 * least-privilege grants) to it here.
 *
 * Use cases: Granting an Athena data source access to its workgroup results bucket and the
 * KMS-encrypted data lake it queries, or scoped Athena metadata access via a customer-managed policy
 *
 * AWS: AWS-managed and customer-managed policies attached to the QuickSight resource-access role
 *
 * Validation: all sub-properties optional
 */
export interface ResourceAccessRolePermissionsProps {
  /**
   * AWS managed policy names to attach (e.g. `service-role/AWSQuicksightAthenaAccess` for Athena
   * connectivity). Names are used rather than full ARNs because AWS-managed policies live in the
   * `aws` account and are never cross-account, matching the `awsManagedPolicies` convention in the
   * roles module. Only this module can attach AWS-managed policies, since it owns the role.
   *
   * Data-source-specific S3/KMS grants are NOT configured here — those reference resources
   * (e.g. the Athena results bucket and its KMS key) that are created by other modules which
   * deploy after this one, so they are attached by the consuming data source module
   * (`@aws-mdaa/quicksight-project`) instead.
   *
   * Use cases: Athena API + query-results access via the AWS-managed policy
   *
   * AWS: AWS managed policies attached to the QuickSight resource-access role
   *
   * Validation: Optional; array of AWS managed policy names
   */
  readonly awsManagedPolicies?: string[];
  /**
   * Existing customer-managed policy names to attach to the QuickSight resource-access role.
   * Because QuickSight discovers this role by its fixed name (`aws-quicksight-service-role-v0`)
   * and will only assume a role with that exact identity, the role cannot be swapped for a
   * customer-supplied one; scoped least-privilege permissions must therefore be attached to it as
   * customer-managed policies. Author the policy in the `roles` module (or out-of-band) and
   * reference it here by name — matching the `customerManagedPolicies` convention in that module.
   * Attachment is by the policy's deployed name, so the policy must already exist when this module deploys.
   *
   * Use cases: Granting scoped Athena metadata access (e.g. athena:GetTableMetadata,
   * athena:ListTableMetadata on a specific data catalog) without attaching a broad AWS-managed policy
   *
   * AWS: Customer-managed policies attached to the QuickSight resource-access role
   *
   * Validation: Optional; array of existing customer-managed policy names
   */
  readonly customerManagedPolicies?: string[];
}

/**
 * IP restriction rule for QuickSight console access control.
 *
 * Use cases: Corporate network allowlisting; Compliance IP restrictions
 *
 * AWS: QuickSight IP restriction configuration
 *
 * Validation: cidr is required; description is optional
 */
export interface IpRestrictionProps {
  /**
   * CIDR block defining the allowed IP range for QuickSight access.
   *
   * Use cases: Network allowlisting; IP-based access control
   *
   * AWS: QuickSight IP restriction CIDR
   *
   * Validation: Required; valid CIDR notation (e.g., 'a.b.c.d/n')
   */
  readonly cidr: string;
  /**
   * Human-readable description of the IP restriction rule.
   *
   * Use cases: Rule documentation; Administrative clarity
   *
   * AWS: QuickSight IP restriction metadata
   *
   * Validation: Optional; string
   */
  readonly description?: string;
}

export interface QuickSightAccountL3ConstructProps extends MdaaL3ConstructProps {
  /** QuickSight account configuration. */
  readonly qsAccount: AccountProps;
}

export class QuickSightAccountL3Construct extends MdaaL3Construct {
  protected readonly props: QuickSightAccountL3ConstructProps;

  private boto3Layer: LayerVersion;

  constructor(scope: Construct, id: string, props: QuickSightAccountL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    this.boto3Layer = new MdaaBoto3LayerVersion(this, 'boto3-layer', { naming: this.props.naming });

    const serviceRole = this.buildQuickSightServiceRole();
    const managedPolicy = this.createServiceManagedPolicy(serviceRole);
    const accountCr = this.createAccount();

    this.buildDefaultResourceAccessRole();

    if (this.props.qsAccount.ipRestrictions) {
      const ipRestrictionsCr = this.createIpRestrictions(this.props.qsAccount.ipRestrictions);
      ipRestrictionsCr.node.addDependency(accountCr);
    }

    if (this.props.qsAccount.groups && this.props.qsAccount.groups.length > 0) {
      const groupsCr = this.createGroups(this.props.qsAccount.groups);
      groupsCr.node.addDependency(accountCr);
    }

    const vpcConnection = this.createVpcConnection(serviceRole);
    vpcConnection.node.addDependency(accountCr);
    vpcConnection.node.addDependency(managedPolicy);
  }

  private createVpcConnection(serviceRole: IRole): CfnVPCConnection {
    const sg = this.buildQuickSightSecurityGroup();

    const vpcConnectionProps: CfnVPCConnectionProps = {
      awsAccountId: this.account,
      name: this.props.naming
        .withResourceType(MdaaResourceType.QUICKSIGHT_VPC_CONNECTION)
        .resourceName('vpc-connection', 128),
      securityGroupIds: [sg.securityGroupId],
      roleArn: serviceRole.roleArn,
      subnetIds: this.props.qsAccount.subnetIds,
      vpcConnectionId: this.props.naming
        .withResourceType(MdaaResourceType.QUICKSIGHT_VPC_CONNECTION)
        .resourceName('vpc-', 128),
    };
    return new CfnVPCConnection(this, 'vpc-connection', vpcConnectionProps);
  }

  private createIpRestrictions(ipRestrictions: IpRestrictionProps[]): MdaaCustomResource {
    const crStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['quicksight:UpdateIpRestriction', 'quicksight:DescribeIpRestriction'],
      resources: ['*'],
    });

    const ipRestrictionsMap = Object.fromEntries(
      ipRestrictions.map(restriction => {
        return [restriction.cidr, restriction.description || `Restriction for ${restriction.cidr}`];
      }),
    );

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'ip-restrictions',
      code: Code.fromAsset(`${__dirname}/../src/python/ip_restrictions`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'ip_restrictions.lambda_handler',
      handlerRolePolicyStatements: [crStatement],
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'quicksight:UpdateIpRestriction and quicksight:DescribeIpRestriction do not accept a resource',
        },
      ],
      handlerProps: {
        accountId: this.account,
        ipRestrictionsMap: ipRestrictionsMap,
      },
      naming: this.props.naming,
      handlerLayers: [this.boto3Layer],
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    return new MdaaCustomResource(this, 'update-ip-restrictions-cr', crProps);
  }

  // Creates the configured QuickSight groups (idempotently) via a custom resource.
  private createGroups(groups: string[]): MdaaCustomResource {
    // The group names are known at synth time and created in the 'default' namespace, so
    // CreateGroup can be scoped to their ARNs. The region segment is wildcarded because the
    // handler resolves the QuickSight identity region at runtime (it may differ from this stack's
    // region). DescribeAccountSettings does not support resource-level permissions.
    const createGroupStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['quicksight:CreateGroup'],
      resources: groups.map(
        groupName => `arn:${this.partition}:quicksight:*:${this.account}:group/default/${groupName}`,
      ),
    });
    const describeStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['quicksight:DescribeAccountSettings'],
      resources: ['*'],
    });

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'qs-groups',
      code: Code.fromAsset(`${__dirname}/../src/python/groups`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'groups.lambda_handler',
      handlerRolePolicyStatements: [createGroupStatement, describeStatement],
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'quicksight:DescribeAccountSettings does not support resource-level permissions ' +
            '(see https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonquicksight.html). ' +
            'quicksight:CreateGroup is scoped to the specific group ARNs but uses a region-segment wildcard ' +
            'because the QuickSight identity region is resolved by the handler at runtime.',
        },
      ],
      handlerProps: {
        accountId: this.account,
        groups: groups,
      },
      naming: this.props.naming,
      handlerLayers: [this.boto3Layer],
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    return new MdaaCustomResource(this, 'qs-groups-cr', crProps);
  }

  // Creates Custom Resource to Manage Quicksight Account - Handles OnCreate, OnUpdate, OnDelete Stack Events
  private createAccountCr(accountProvider: Provider, accountProps: AccountWithNameProps): CustomResource {
    const crProps = {
      ...accountProps,
      vpcId: undefined,
      securityGroupAccess: undefined,
      glueResourceAccess: undefined,
    };

    return new CustomResource(this, 'account-cr', {
      serviceToken: accountProvider.serviceToken,
      properties: {
        accountDetail: crProps,
      },
    });
  }

  //Creates Custom Lambda Provider to create QS Account
  private createAccountProvider(): Provider {
    //Create a role which will be used by the QS Account Custom Resource Lambda Function
    const accountCrRole = new MdaaLambdaRole(this, 'qsAccount-cr-role', {
      description: 'CR Lambda Role',
      roleName: 'qsAccount-cr',
      naming: this.props.naming,
      logGroupNames: [this.props.naming.resourceName('qsAccount-cr-func')],
      createParams: false,
      createOutputs: false,
    });

    const accountCrManagedPolicy = new ManagedPolicy(this, 'qsAccount-cr-lambda', {
      managedPolicyName: this.props.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('qsAccount-cr-lambda'),
      roles: [accountCrRole],
    });
    const accountPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:user/*`],
      actions: ['quicksight:CreateAdmin'],
    });
    accountCrManagedPolicy.addStatements(accountPolicyStatement);

    // Quicksight manages users via Directory Service
    const accountPolicyStatement2 = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:ds:${this.region}:${this.account}:directory/*`],
      actions: ['ds:AuthorizeApplication', 'ds:UnauthorizeApplication', 'ds:CreateAlias'],
    });
    accountCrManagedPolicy.addStatements(accountPolicyStatement2);

    const accountPolicyStatement3 = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ds:CreateIdentityPoolDirectory',
        'ds:DescribeTrusts',
        'ds:DescribeDirectories',
        'ds:CheckAlias',
        'ds:DeleteDirectory',
        'iam:ListAccountAliases',
        'quicksight:CreateAccountSubscription',
        'quicksight:GetGroupMapping',
        'quicksight:SetGroupMapping',
        'quicksight:SearchDirectoryGroups',
        'quicksight:DescribeAccountSettings',
        'quicksight:DescribeAccountSubscription',
        'quicksight:UpdateAccountSettings',
        'quicksight:Subscribe',
      ],
    });
    accountCrManagedPolicy.addStatements(accountPolicyStatement3);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      accountCrManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },
        {
          id: 'NIST.800.53.R5-IAMPolicyNoStatementsWithFullAccess',
          reason: "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },
        {
          id: 'HIPAA.Security-IAMPolicyNoStatementsWithFullAccess',
          reason: "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },
        {
          id: 'PCI.DSS.321-IAMPolicyNoStatementsWithFullAccess',
          reason: "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },
      ],
      true,
    );
    const srcDir = `${__dirname}/../src/python/quicksight_account`;
    // This Lambda is used as a Custom Resource in order to create the QuickSight Account
    const accountCrLambda = new MdaaLambdaFunction(this, 'qsAccount-cr-func', {
      functionName: 'qsAccount-cr-func',
      naming: this.props.naming,
      code: Code.fromAsset(srcDir),
      handler: 'quicksight_account.lambda_handler',
      runtime: Runtime.PYTHON_3_14,
      timeout: Duration.seconds(300),
      environment: {
        ACCOUNT_ID: this.account,
        LOG_LEVEL: 'INFO',
      },
      role: accountCrRole,
      layers: [this.boto3Layer],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      accountCrLambda,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    const accountCrProviderFunctionName = this.props.naming
      .withResourceType(MdaaResourceType.LAMBDA_FUNCTION)
      .resourceName('qsAccount-cr-prov', 64);
    const accountCrProviderRole = new MdaaLambdaRole(this, 'qsAccount-cr-prov-role', {
      description: 'CR Role',
      roleName: 'qsAccount-cr-prov',
      naming: this.props.naming,
      logGroupNames: [accountCrProviderFunctionName],
      createParams: false,
      createOutputs: false,
    });
    const accountCrProvider = new Provider(this, 'qsAccount-cr-provider', {
      providerFunctionName: accountCrProviderFunctionName,
      onEventHandler: accountCrLambda,
      frameworkOnEventRole: accountCrProviderRole,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      accountCrProviderRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
      ],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      accountCrProvider,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda function Runtime set by CDK Provider Framework',
        },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    return accountCrProvider;
  }

  //Parses the Config and preps for QS Account API arguments
  private createAccount(): CustomResource {
    const accountProvider: Provider = this.createAccountProvider();
    const accountCreateProps: AccountWithNameProps = {
      ...this.props.qsAccount,
      ...{
        accountName: sanitizeAccountName(this.props.naming.resourceName(undefined, 55)),
      },
    };
    return this.createAccountCr(accountProvider, accountCreateProps);
  }

  private buildQuickSightSecurityGroup(): SecurityGroup {
    //Import the VPC by id for use in creating the QuickSight Security Group
    const vpc = Vpc.fromVpcAttributes(this, 'referencedVPC', {
      vpcId: this.props.qsAccount.vpcId,
      availabilityZones: ['dummy'],
    });
    /**
     For every sgAccess in the config, add appropriate ingress/egress rules to the QuickSight SG
     Note that the QuickSight SG is not stateless and thus both egress (QuickSight to peer)
     and ingress (peer to QuickSight) rules are required.
     See https://docs.aws.amazon.com/quicksight/latest/user/vpc-security-groups.html
     These below ingress rules will allow traffic from data sources in the VPC
     to return to the QS service via the VPC connection it creates (to which the security group is attached.)
     */
    const ingressRules: MdaaSecurityGroupRuleProps = {
      ipv4: this.props.qsAccount.securityGroupAccess?.ipv4?.map(rule => {
        return { cidr: rule.cidr, protocol: Protocol.TCP, port: 1, toPort: 65535 };
      }),
      sg: this.props.qsAccount.securityGroupAccess?.sg?.map(rule => {
        return { sgId: rule.sgId, protocol: Protocol.TCP, port: 1, toPort: 65535 };
      }),
      prefixList: this.props.qsAccount.securityGroupAccess?.prefixList?.map(rule => {
        return { prefixList: rule.prefixList, protocol: Protocol.TCP, port: 1, toPort: 65535 };
      }),
    };

    //Create the SecurityGroup
    return new MdaaSecurityGroup(this, `quicksight-sg`, {
      naming: this.props.naming,
      securityGroupName: 'quicksight-sg',
      vpc: vpc,
      description: 'QuickSight Security Group',
      allowAllOutbound: false,
      ingressRules: ingressRules,
      egressRules: this.props.qsAccount.securityGroupAccess,
      useParentSSMScope: true,
    });
  }

  private buildQuickSightServiceRole(): IRole {
    return new MdaaRole(this, `service-role`, {
      assumedBy: new ServicePrincipal('quicksight.amazonaws.com'),
      description: 'QuickSight Service Role',
      roleName: `service-role`,
      naming: this.props.naming,
    });
  }

  /**
   * Creates QuickSight's account-level resource-access service role using the verbatim name
   * `aws-quicksight-service-role-v0` that QuickSight discovers by convention. This mirrors the
   * role the QuickSight console creates under "Security & permissions -> AWS resources", so
   * data sources can be deployed without the manual console step.
   *
   * The role is created with only the QuickSight trust policy and no data-access permissions.
   * Consuming data source modules (e.g. `@aws-mdaa/quicksight-project`) attach the policies
   * their data sources require, since only they know which AWS resources are needed.
   *
   * This module is only deployed onto accounts that do not already have a QuickSight account
   * (and therefore cannot already have this console-managed role), so creating it
   * unconditionally is safe.
   */
  private buildDefaultResourceAccessRole(): IRole {
    const role = new MdaaRole(this, 'default-resource-access-role', {
      assumedBy: new ServicePrincipal('quicksight.amazonaws.com'),
      description: 'QuickSight default resource-access service role',
      // QuickSight discovers this role by its fixed name and path; do not apply MDAA naming.
      roleName: 'aws-quicksight-service-role-v0',
      verbatimRoleName: true,
      path: '/service-role/',
      naming: this.props.naming,
    });

    if (this.props.qsAccount.resourceAccessRolePermissions) {
      this.attachResourceAccessRolePermissions(role, this.props.qsAccount.resourceAccessRolePermissions);
    }

    return role;
  }

  /**
   * Attaches AWS-managed and customer-managed policies (e.g. AWSQuicksightAthenaAccess, or a scoped
   * Athena-metadata policy) to the account-level resource-access role. Only this module can attach
   * policies to the role, since it owns it and QuickSight discovers the role by its fixed name.
   * Data-source-specific S3/KMS grants are attached by the consuming data source module
   * (`@aws-mdaa/quicksight-project`), because those resources are created by modules that deploy
   * after this one.
   */
  private attachResourceAccessRolePermissions(role: IRole, config: ResourceAccessRolePermissionsProps): void {
    // Attach AWS-managed policies by name (e.g. service-role/AWSQuicksightAthenaAccess). Only this
    // module can do this, since it owns the role; attaching them to an imported role elsewhere is a
    // CDK no-op. Names (not full ARNs) are used because AWS-managed policies are never cross-account,
    // matching the awsManagedPolicies convention in the roles module. The construct ID is derived
    // from a sanitized fragment of the name (not the array index) so reordering the config does not
    // change CloudFormation logical IDs.
    const awsManagedPolicies = config.awsManagedPolicies || [];
    awsManagedPolicies.forEach(policyName => {
      role.addManagedPolicy(MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition(this, policyName));
    });

    // Attach customer-managed policies by name, mirroring the customerManagedPolicies convention in
    // the roles module. Routes through MdaaManagedPolicy.fromManagedPolicyName for consistency with
    // the AWS-managed line above (both attachment paths use the MDAA wrapper). Referencing by name
    // avoids a hard CFN dependency on the policy's stack; the policy must already exist when this
    // module deploys. The construct ID is derived from the name (not the array index) so reordering
    // the config does not change CloudFormation logical IDs.
    const customerManagedPolicies = config.customerManagedPolicies || [];
    customerManagedPolicies.forEach(policyName => {
      role.addManagedPolicy(MdaaManagedPolicy.fromManagedPolicyNameWithPartition(this, policyName));
    });

    if (awsManagedPolicies.length > 0) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        role,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason:
              'AWS-managed policies (e.g. AWSQuicksightAthenaAccess, see ' +
              'https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSQuicksightAthenaAccess.html) ' +
              'are explicitly configured for the QuickSight resource-access role to grant data sources access to ' +
              'their underlying services.',
            appliesTo: awsManagedPolicies.map(name => `Policy::arn:${this.partition}:iam::aws:policy/${name}`),
          },
        ],
        true,
      );
    }
  }

  private createServiceManagedPolicy(role: IRole): IManagedPolicy {
    const quickSightServiceManagedPolicy = new ManagedPolicy(this, 'quicksight-service-policy', {
      managedPolicyName: this.props.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('quicksight-service-access'),
      roles: [role],
    });

    const getGlueDBsStatement = new PolicyStatement({
      sid: 'GlueGetDBsAccess',
      effect: Effect.ALLOW,
      actions: ['glue:GetDatabases'],
      resources: ['*'],
    });
    quickSightServiceManagedPolicy.addStatements(getGlueDBsStatement);

    const glueResourceArns = (this.props.qsAccount.glueResourceAccess || []).map(resource => {
      if (resource.includes('*')) {
        console.warn(
          `Glue resource access '${resource}' contains wildcard (*). Consider revising to specific resources.`,
        );
      }
      return `arn:${this.partition}:glue:${this.region}:${this.account}:${resource}`;
    });
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:catalog`);
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:database/default`);
    glueResourceArns.push(`arn:${this.partition}:glue:${this.region}:${this.account}:catalog`);

    const accessGlueStatement = new PolicyStatement({
      sid: 'GlueAccess',
      effect: Effect.ALLOW,
      actions: [
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:GetTable',
        'glue:GetTables',
        'glue:GetPartition',
        'glue:GetPartitions',
        'glue:SearchTables',
      ],
      resources: glueResourceArns,
    });
    quickSightServiceManagedPolicy.addStatements(accessGlueStatement);

    const accessLakeFormationStatement = new PolicyStatement({
      sid: 'LakeFormationAccess',
      effect: Effect.ALLOW,
      actions: ['lakeformation:GetDataAccess'],
      resources: ['*'],
    });
    quickSightServiceManagedPolicy.addStatements(accessLakeFormationStatement);

    const accessListAthenaWorkgroupStatement = new PolicyStatement({
      sid: 'AthenaListWorkgroupAccess',
      effect: Effect.ALLOW,
      actions: ['athena:ListWorkGroups', 'athena:ListDataCatalogs', 'athena:ListDatabases'],
      resources: ['*'],
    });
    quickSightServiceManagedPolicy.addStatements(accessListAthenaWorkgroupStatement);

    const accessAthenaListTableMetaStatement = new PolicyStatement({
      sid: 'AthenaListTableMeta',
      effect: Effect.ALLOW,
      actions: ['athena:ListTableMetadata'],
      resources: [`arn:${this.partition}:athena:${this.region}:${this.account}:datacatalog/AwsDataCatalog`],
    });

    quickSightServiceManagedPolicy.addStatements(accessAthenaListTableMetaStatement);

    const accessRedShiftDescribeStatement = new PolicyStatement({
      sid: 'RedShiftDescribe',
      effect: Effect.ALLOW,
      actions: ['redshift:DescribeClusters'],
      resources: ['*'],
    });
    quickSightServiceManagedPolicy.addStatements(accessRedShiftDescribeStatement);

    // Required for creating VPC Connections
    const vpcReadStatement = new PolicyStatement({
      sid: 'VpcReadAccess',
      effect: Effect.ALLOW,
      actions: ['ec2:DescribeSubnets', 'ec2:DescribeSecurityGroups'],
      resources: ['*'],
    });
    quickSightServiceManagedPolicy.addStatements(vpcReadStatement);

    const vpcCreateStatement = new PolicyStatement({
      sid: 'VpcCreateAccess',
      effect: Effect.ALLOW,
      actions: ['ec2:CreateNetworkInterface'],
      resources: ['*'],
    });
    quickSightServiceManagedPolicy.addStatements(vpcCreateStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      quickSightServiceManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Ec2:DescribeSubnets, ec2:DescribeSecurityGroups, ec2:CreateNetworkInterface, redshift:DescribeClusters,lakeformation:GetDataAccess,athena:ListWorkGroups does not take resources. Resource wildcards may originate from app config. Warnings logged.',
        },
      ],
      true,
    );
    return quickSightServiceManagedPolicy;
  }
}
