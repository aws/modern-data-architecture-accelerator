/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaSecurityGroup, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
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
 * Q-ENHANCED-INTERFACE
 * AccountProps configuration interface for business intelligence and data visualization.
 * Use cases: Business intelligence; Data visualization; Interactive dashboards; BI reporting
 * AWS: Amazon QuickSight configuration for business intelligence and data visualization
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon QuickSight and MDAA requirements
 */
export interface AccountProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required Amazon QuickSight edition determining the feature set and capabilities available for business intelligence and data visualization. Controls access to advanced features like machine learning insights, embedded analytics, and enterprise governance capabilities.
   *
   * Use cases: Feature set selection; Cost optimization; Enterprise capabilities; ML insights access
   * AWS: Amazon QuickSight account edition configuration for feature availability and pricing tier
   * Validation: Must be one of 'STANDARD', 'ENTERPRISE', or 'ENTERPRISE_AND_Q'; required for account setup
   *   */
  readonly edition: Edition;
  /**
   * Q-ENHANCED-PROPERTY
   * Required authentication method for Amazon QuickSight account access controlling how users authenticate to the business intelligence platform. Determines the identity provider integration and user management approach for QuickSight dashboard and analytics access.
   *
   * Use cases: Identity provider integration; User authentication control; Enterprise SSO integration; Access management strategy
   * AWS: Amazon QuickSight account authentication method configuration for user access control
   * Validation: Must be one of 'IAM_AND_QUICKSIGHT', 'IAM_ONLY', or 'ACTIVE_DIRECTORY'; required for account setup
   *   */
  readonly authenticationMethod: AuthenticationMethod;
  /**
   * Q-ENHANCED-PROPERTY
   * Required email address for Amazon QuickSight account notifications including billing alerts, service updates, and administrative communications. Primary contact point for all QuickSight account-related notifications and system alerts.
   *
   * Use cases: Account notifications; Billing alerts; Service updates; Administrative communications
   * AWS: Amazon QuickSight account notification email for system alerts and account communications
   * Validation: Must be valid email format; required field for account setup
   *   */
  readonly notificationEmail: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional first name of the Amazon QuickSight account administrator used for AWS communications and account personalization. Provides personal identification for account-related communications and support interactions.
   *
   * Use cases: Account personalization; AWS support communications; Administrator identification; Account management
   * AWS: Amazon QuickSight account administrator first name for personalized communications
   * Validation: String value if provided; optional field for account setup
   *   */
  readonly firstName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional last name of the Amazon QuickSight account administrator used for AWS communications and account personalization. Provides personal identification for account-related communications and support interactions.
   *
   * Use cases: Account personalization; AWS support communications; Administrator identification; Account management
   * AWS: Amazon QuickSight account administrator last name for personalized communications
   * Validation: String value if provided; optional field for account setup
   *   */
  readonly lastName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional email address of the Amazon QuickSight account administrator used for AWS communications and account management notifications. Provides contact information for account-related updates, billing notifications, and administrative communications.
   *
   * Use cases: Account administrator contact; AWS communications; Account notifications; Administrative updates
   * AWS: Amazon QuickSight account administrator email for AWS communications and notifications
   * Validation: Must be valid email format if provided; optional field for account setup
   *   */
  readonly emailAddress?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional 10-digit phone number for the Amazon QuickSight account administrator used for AWS support communications and account notifications. Provides contact information for account-related communications and support escalations.
   *
   * Use cases: Account administrator contact; AWS support communications; Account notifications; Emergency contact information
   * AWS: Amazon QuickSight account contact number for administrator communications and support
   * Validation: Must be exactly 10 digits if provided; optional field for account setup
   *   */
  readonly contactNumber?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier for Amazon QuickSight account network association enabling secure connectivity to data sources within the VPC. Establishes network isolation and secure access to VPC-based resources like RDS databases and private data sources.
   *
   * Use cases: VPC network association; Secure data source connectivity; Network isolation; Private resource access
   * AWS: Amazon QuickSight VPC connection configuration for secure network access to data sources
   * Validation: Must be valid VPC ID format (vpc-xxxxxxxx); required for VPC-based deployments
   *   */
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet identifiers for Amazon QuickSight VPC connection enabling network connectivity to data sources across multiple availability zones. Provides high availability and network redundancy for secure data source access within the VPC.
   *
   * Use cases: Multi-AZ connectivity; High availability; Network redundancy; Secure data source access
   * AWS: Amazon QuickSight VPC connection subnet configuration for multi-AZ data source connectivity
   * Validation: Must be array of valid subnet IDs (subnet-xxxxxxxx); required for VPC-based deployments
   *   */
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group access definitions for Amazon QuickSight VPC connectivity enabling controlled network access to internal resources. Defines ingress and egress rules for the QuickSight security group to permit secure communication with VPC-based data sources and services.
   *
   * Use cases: VPC resource access control; Data source connectivity; Network security rules; Internal service communication
   * AWS: Amazon QuickSight VPC security group rules for controlled access to internal resources
   * Validation: Must be valid MdaaSecurityGroupRuleProps if provided; optional for VPC deployments
   *   */
  readonly securityGroupAccess?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IP CIDR blocks for Amazon QuickSight account access restrictions enabling network-based access control. Defines allowed IP ranges for QuickSight interface access, providing additional security layer for business intelligence platform access.
   *
   * Use cases: Network access control; IP-based security; Corporate network restrictions; Geographic access limitations
   * AWS: Amazon QuickSight IP restriction configuration for network-based access control
   * Validation: Must be array of valid IpRestrictionProps if provided; optional for enhanced security
   *   */
  readonly ipRestrictions?: IpRestrictionProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of AWS Glue resource ARNs for Amazon QuickSight service role access enabling data catalog integration. Grants QuickSight permissions to access specific Glue databases, tables, and crawlers for data source discovery and metadata management.
   *
   * Use cases: Glue data catalog integration; Metadata access; Data source discovery; Table schema access
   * AWS: Amazon QuickSight service role permissions for AWS Glue resource access
   * Validation: Must be array of valid Glue resource ARNs if provided; optional for Glue integration
   *   */
  readonly glueResourceAccess?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * IpRestrictionProps configuration interface for business intelligence and data visualization.
 * Use cases: Business intelligence; Data visualization; Interactive dashboards; BI reporting
 * AWS: Amazon QuickSight configuration for business intelligence and data visualization
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon QuickSight and MDAA requirements
 */
export interface IpRestrictionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CIDR block for QuickSight IP-based access restriction enabling network-level security control. Defines the IP address range that will be allowed to access QuickSight dashboards and analytics, providing network-level security for business intelligence and data visualization access.
   *
   * Use cases: Network-level security; IP-based access control; Corporate network restrictions; Security compliance; Access management
   *
   * AWS: Amazon QuickSight IP restriction CIDR block for network-level access control and security
   *
   * Validation: Must be valid CIDR block format; required for IP restriction configuration
   **/
  readonly cidr: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description for QuickSight IP restriction rule enabling documentation and management of access control policies. Provides human-readable description of the IP restriction rule for administrative purposes and access control documentation.
   *
   * Use cases: Access control documentation; Rule management; Administrative clarity; Policy documentation; Security governance
   *
   * AWS: Amazon QuickSight IP restriction rule description for access control documentation and management
   *
   * Validation: Must be descriptive string if provided; optional for rule documentation
   **/
  readonly description?: string;
}

export interface QuickSightAccountL3ConstructProps extends MdaaL3ConstructProps {
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

    if (this.props.qsAccount.ipRestrictions) {
      const ipRestrictionsCr = this.createIpRestrictions(this.props.qsAccount.ipRestrictions);
      ipRestrictionsCr.node.addDependency(accountCr);
    }

    const vpcConnection = this.createVpcConnection(serviceRole);
    vpcConnection.node.addDependency(accountCr);
    vpcConnection.node.addDependency(managedPolicy);
  }

  private createVpcConnection(serviceRole: IRole): CfnVPCConnection {
    const sg = this.buildQuickSightSecurityGroup();

    const vpcConnectionProps: CfnVPCConnectionProps = {
      awsAccountId: this.account,
      name: this.props.naming.resourceName('vpc-connection', 128),
      securityGroupIds: [sg.securityGroupId],
      roleArn: serviceRole.roleArn,
      subnetIds: this.props.qsAccount.subnetIds,
      vpcConnectionId: this.props.naming.resourceName('vpc-', 128),
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
      runtime: Runtime.PYTHON_3_13,
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
      managedPolicyName: this.props.naming.resourceName('qsAccount-cr-lambda'),
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
      runtime: Runtime.PYTHON_3_13,
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
    const accountCrProviderFunctionName = this.props.naming.resourceName('qsAccount-cr-prov', 64);
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

  private createServiceManagedPolicy(role: IRole): IManagedPolicy {
    const quickSightServiceManagedPolicy = new ManagedPolicy(this, 'quicksight-service-policy', {
      managedPolicyName: this.props.naming.resourceName('quicksight-service-access'),
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
