/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaSecurityGroup, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  MdaaBoto3LayerVersion,
  MdaaLambdaFunction,
  MdaaLambdaRole
} from "@aws-mdaa/lambda-constructs";
import { CustomResource, Duration } from "aws-cdk-lib";
import { Protocol, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IManagedPolicy, IRole, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnVPCConnection, CfnVPCConnectionProps } from 'aws-cdk-lib/aws-quicksight';
import { Provider } from "aws-cdk-lib/custom-resources";
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface AccountWithNameProps extends AccountProps {
  readonly accountName: string
}

export type AuthenticationMethod = "IAM_AND_QUICKSIGHT" | "IAM_ONLY" | "ACTIVE_DIRECTORY"
export type Edition = "STANDARD" | "ENTERPRISE" | "ENTERPRISE_AND_Q"

export interface AccountProps {
  /**
 * The edition of Amazon QuickSight. 
 * Valid Values: STANDARD | ENTERPRISE | ENTERPRISE_AND_Q
 */
  readonly edition: Edition;
  /**
   * The method to authenticate your Amazon QuickSight account. 
   * Valid Values: 
   */
  readonly authenticationMethod: AuthenticationMethod;
  /**
   * The email address that you want Amazon QuickSight to send notifications.
   */
  readonly notificationEmail: string;
  /**
   * The first name of the author of the Amazon QuickSight account to use for future communications. 
   */
  readonly firstName?: string;
  /**
   * The last name of the author of the Amazon QuickSight account to use for future communications. 
   */
  readonly lastName?: string;
  /**
   * The email address of the author of the Amazon QuickSight account to use for future communications.
   */
  readonly emailAddress?: string;
  /**
   * A 10-digit phone number for the author of the Amazon QuickSight account to use for future communications.
   */
  readonly contactNumber?: string;
  /**
   * The VPC to which the QS Account will be associated.
   */
  readonly vpcId: string;
  /**
   * The Subnet IDs to which the QS Account will be connected.
   */
  readonly subnetIds: string[];
  /**
   * Map of names to security group access definitions. Will be added as egrees/ingress rules to the QuickSight security group, permitting access
   * between the QS account and internal resources on your VPC.
   */
  readonly securityGroupAccess?: MdaaSecurityGroupRuleProps;
  /**
   * List of IP CIDRs which will be provided access to the account via the QuickSight interface. IP access restrictions are disabled by default.
   */
  readonly ipRestrictions?: IpRestrictionProps[]
  /**
   * List of Glue resources to which the QuickSight service role will be granted access.
   */
  readonly glueResourceAccess?: string[];
}

export interface IpRestrictionProps {
  readonly cidr: string
  readonly description?: string
}

export interface QuickSightAccountL3ConstructProps extends MdaaL3ConstructProps {
  readonly qsAccount: AccountProps
}

export class QuickSightAccountL3Construct extends MdaaL3Construct {
  protected readonly props: QuickSightAccountL3ConstructProps


  private boto3Layer: LayerVersion
  constructor( scope: Construct, id: string, props: QuickSightAccountL3ConstructProps ) {
    super( scope, id, props )
    this.props = props
    this.boto3Layer = new MdaaBoto3LayerVersion( this, 'boto3-layer', { naming: this.props.naming } )

    const serviceRole = this.buildQuickSightServiceRole();
    const managedPolicy = this.createServiceManagedPolicy( serviceRole )
    const accountCr = this.createAccount();

    if ( this.props.qsAccount.ipRestrictions ) {
      const ipRestrictionsCr = this.createIpRestrictions( this.props.qsAccount.ipRestrictions )
      ipRestrictionsCr.node.addDependency( accountCr )
    }

    const vpcConnection = this.createVpcConnection( serviceRole )
    vpcConnection.node.addDependency( accountCr )
    vpcConnection.node.addDependency( managedPolicy )

  }

  private createVpcConnection ( serviceRole: IRole ): CfnVPCConnection {

    const sg = this.buildQuickSightSecurityGroup();

    const vpcConnectionProps: CfnVPCConnectionProps = {
      awsAccountId: this.account,
      name: this.props.naming.resourceName( "vpc-connection", 128 ),
      securityGroupIds: [ sg.securityGroupId ],
      roleArn: serviceRole.roleArn,
      subnetIds: this.props.qsAccount.subnetIds,
      vpcConnectionId: this.props.naming.resourceName( "vpc-", 128 )
    }
    return new CfnVPCConnection( this, 'vpc-connection', vpcConnectionProps )
  }

  private createIpRestrictions ( ipRestrictions: IpRestrictionProps[] ): MdaaCustomResource {
    const crStatement: PolicyStatement = new PolicyStatement( {
      effect: Effect.ALLOW,
      actions: [
        "quicksight:UpdateIpRestriction",
        "quicksight:DescribeIpRestriction"
      ],
      resources: [ "*" ]
    } )

    const ipRestrictionsMap = Object.fromEntries( ipRestrictions.map( restriction => {
      return [ restriction.cidr, restriction.description || `Restriction for ${ restriction.cidr }` ]
    } ) )

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'ip-restrictions',
      code: Code.fromAsset( `${ __dirname }/../src/python/ip_restrictions` ),
      runtime: Runtime.PYTHON_3_13,
      handler: 'ip_restrictions.lambda_handler',
      handlerRolePolicyStatements: [ crStatement ],
      handlerPolicySuppressions: [ { id: 'AwsSolutions-IAM5', reason: 'quicksight:UpdateIpRestriction and quicksight:DescribeIpRestriction do not accept a resource' } ],
      handlerProps: {
        accountId: this.account,
        ipRestrictionsMap: ipRestrictionsMap
      },
      naming: this.props.naming,
      handlerLayers: [ this.boto3Layer ],
    }
    return new MdaaCustomResource( this, 'update-ip-restrictions-cr', crProps )
  }

  // Creates Custom Resource to Manage Quicksight Account - Handles OnCreate, OnUpdate, OnDelete Stack Events
  private createAccountCr (
    accountProvider: Provider,
    accountProps: AccountWithNameProps
  ): CustomResource {

    const crProps = {
      ...accountProps,
      vpcId: undefined,
      securityGroupAccess: undefined,
      glueResourceAccess: undefined
    }

    const accountResource = new CustomResource(
      this,
      'account-cr',
      {
        serviceToken: accountProvider.serviceToken,
        properties: {
          accountDetail: crProps,
        },
      }
    );
    return accountResource;
  }

  //Creates Custom Lambda Provider to create QS Account
  private createAccountProvider (): Provider {
    //Create a role which will be used by the QS Account Custom Resource Lambda Function
    const accountCrRole = new MdaaLambdaRole( this, "qsAccount-cr-role", {
      description: "CR Lambda Role",
      roleName: "qsAccount-cr",
      naming: this.props.naming,
      logGroupNames: [ this.props.naming.resourceName( "qsAccount-cr-func" ) ],
      createParams: false,
      createOutputs: false
    } );

    const accountCrManagedPolicy = new ManagedPolicy(
      this,
      "qsAccount-cr-lambda",
      {
        managedPolicyName: this.props.naming.resourceName(
          "qsAccount-cr-lambda"
        ),
        roles: [ accountCrRole ],
      }
    );
    const accountPolicyStatement = new PolicyStatement( {
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:quicksight:${ this.region }:${ this.account }:user/*`
      ],
      actions: [
        "quicksight:CreateAdmin"
      ],
    } );
    accountCrManagedPolicy.addStatements( accountPolicyStatement );

    // Quicksight manages users via Directory Service
    const accountPolicyStatement2 = new PolicyStatement( {
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:ds:${ this.region }:${ this.account }:directory/*`
      ],
      actions: [
        "ds:AuthorizeApplication",
        "ds:UnauthorizeApplication",
        "ds:CreateAlias"
      ],
    } );
    accountCrManagedPolicy.addStatements( accountPolicyStatement2 );

    const accountPolicyStatement3 = new PolicyStatement( {
      effect: Effect.ALLOW,
      resources: [ '*' ],
      actions: [
        "ds:CreateIdentityPoolDirectory",
        "ds:DescribeTrusts",
        "ds:DescribeDirectories",
        "ds:CheckAlias",
        "ds:DeleteDirectory",
        "iam:ListAccountAliases",
        "quicksight:CreateAccountSubscription",
        "quicksight:GetGroupMapping",
        "quicksight:SetGroupMapping",
        "quicksight:SearchDirectoryGroups",
        "quicksight:DescribeAccountSettings",
        "quicksight:DescribeAccountSubscription",
        "quicksight:UpdateAccountSettings",
        "quicksight:Subscribe",
      ],
    } );
    accountCrManagedPolicy.addStatements( accountPolicyStatement3 );

    NagSuppressions.addResourceSuppressions(
      accountCrManagedPolicy,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },
        {
          id: "NIST.800.53.R5-IAMPolicyNoStatementsWithFullAccess",
          reason:
            "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },
        {
          id: "HIPAA.Security-IAMPolicyNoStatementsWithFullAccess",
          reason:
            "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        },{
          id: "PCI.DSS.321-IAMPolicyNoStatementsWithFullAccess",
          reason:
            "quicksight, directory service and iam api's in accountPolicyStatement3 Takes no resource.",
        }
      ],
      true
    );
    const srcDir = `${ __dirname }/../src/python/quicksight_account`;
    // This Lambda is used as a Custom Resource in order to create the QuickSight Account
    const accountCrLambda = new MdaaLambdaFunction(
      this,
      "qsAccount-cr-func",
      {
        functionName: "qsAccount-cr-func",
        naming: this.props.naming,
        code: Code.fromAsset( srcDir ),
        handler: "quicksight_account.lambda_handler",
        runtime: Runtime.PYTHON_3_13,
        timeout: Duration.seconds( 300 ),
        environment: {
          ACCOUNT_ID: this.account,
        },
        role: accountCrRole,
        layers: [ this.boto3Layer ]
      }
    );

    NagSuppressions.addResourceSuppressions(
      accountCrLambda,
      [
        {
          id: "NIST.800.53.R5-LambdaDLQ",
          reason:
            "Function is for custom resource and error handling will be handled by CloudFormation.",
        },
        {
          id: "NIST.800.53.R5-LambdaInsideVPC",
          reason:
            "Function is for custom resource and will interact only with QuickSight APIs.",
        },
        {
          id: "NIST.800.53.R5-LambdaConcurrency",
          reason:
            "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
        },
        {
          id: "HIPAA.Security-LambdaDLQ",
          reason:
            "Function is for custom resource and error handling will be handled by CloudFormation.",
        },
        {
          id: "HIPAA.Security-LambdaInsideVPC",
          reason:
            "Function is for custom resource and will interact only with QuickSight APIs.",
        },
        {
          id: "HIPAA.Security-LambdaConcurrency",
          reason:
            "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
        },
        {
          id: "PCI.DSS.321-LambdaDLQ",
          reason:
            "Function is for custom resource and error handling will be handled by CloudFormation.",
        },
        {
          id: "PCI.DSS.321-LambdaInsideVPC",
          reason:
            "Function is for custom resource and will interact only with QuickSight APIs.",
        },
        {
          id: "PCI.DSS.321-LambdaConcurrency",
          reason:
            "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
        }
      ],
      true
    );
    const accountCrProviderFunctionName = this.props.naming.resourceName(
      "qsAccount-cr-prov",
      64
    );
    const accountCrProviderRole = new MdaaLambdaRole(
      this,
      "qsAccount-cr-prov-role",
      {
        description: "CR Role",
        roleName: "qsAccount-cr-prov",
        naming: this.props.naming,
        logGroupNames: [ accountCrProviderFunctionName ],
        createParams: false,
        createOutputs: false
      }
    );
    const accountCrProvider = new Provider( this, "qsAccount-cr-provider", {
      providerFunctionName: accountCrProviderFunctionName,
      onEventHandler: accountCrLambda,
      role: accountCrProviderRole,
    } );
    NagSuppressions.addResourceSuppressions(
      accountCrProviderRole,
      [
        {
          id: "NIST.800.53.R5-IAMNoInlinePolicy",
          reason:
            "Role is for Custom Resource Provider. Inline policy automatically added.",
        },
        {
          id: "HIPAA.Security-IAMNoInlinePolicy",
          reason:
            "Role is for Custom Resource Provider. Inline policy automatically added.",
        },
        {
          id: "PCI.DSS.321-IAMNoInlinePolicy",
          reason:
            "Role is for Custom Resource Provider. Inline policy automatically added.",
        },
      ],
      true
    );

    NagSuppressions.addResourceSuppressions(
      accountCrProvider,
      [
        {
          id: "AwsSolutions-L1",
          reason: "Lambda function Runtime set by CDK Provider Framework",
        },
        {
          id: "NIST.800.53.R5-LambdaDLQ",
          reason:
            "Function is for custom resource and error handling will be handled by CloudFormation.",
        },
        {
          id: "NIST.800.53.R5-LambdaInsideVPC",
          reason:
            "Function is for custom resource and will interact only with QuickSight APIs.",
        },
        {
          id: "NIST.800.53.R5-LambdaConcurrency",
          reason:
            "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
        },
        {
          id: "HIPAA.Security-LambdaDLQ",
          reason:
            "Function is for custom resource and error handling will be handled by CloudFormation.",
        },
        {
          id: "HIPAA.Security-LambdaInsideVPC",
          reason:
            "Function is for custom resource and will interact only with QuickSight APIs.",
        },
        {
          id: "HIPAA.Security-LambdaConcurrency",
          reason:
            "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
        },
        {
          id: "PCI.DSS.321-LambdaDLQ",
          reason:
            "Function is for custom resource and error handling will be handled by CloudFormation.",
        },
        {
          id: "PCI.DSS.321-LambdaInsideVPC",
          reason:
            "Function is for custom resource and will interact only with QuickSight APIs.",
        },
        {
          id: "PCI.DSS.321-LambdaConcurrency",
          reason:
            "Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.",
        },
      ],
      true
    );
    return accountCrProvider;
  }

  //Parses the Config and preps for QS Account API arguments
  private createAccount (): CustomResource {
    const accountProvider: Provider = this.createAccountProvider();
    const accountCreateProps: AccountWithNameProps = {
      ...this.props.qsAccount, ...{
        accountName: this.props.naming.resourceName()
      }
    }
    return this.createAccountCr( accountProvider, accountCreateProps )
  }

  private buildQuickSightSecurityGroup (): SecurityGroup {

    //Import the VPC by id for use in creating the QuickSight Security Group
    const vpc = Vpc.fromVpcAttributes( this, 'referencedVPC', { vpcId: this.props.qsAccount.vpcId, availabilityZones: [ "dummy" ] } )
    /**
    For every sgAccess in the config, add appropriate ingress/egress rules to the QuickSight SG
    Note that the QuickSight SG is not stateless and thus both egress (QuickSight to peer)
    and ingress (peer to QuickSight) rules are required.
    See https://docs.aws.amazon.com/quicksight/latest/user/vpc-security-groups.html
    These below ingress rules will allow traffic from data sources in the VPC 
    to return to the QS service via the VPC connection it creates (to which the security group is attached.)
    */
    const ingressRules: MdaaSecurityGroupRuleProps = {
      ipv4: this.props.qsAccount.securityGroupAccess?.ipv4?.map( rule => { return { cidr: rule.cidr, protocol: Protocol.TCP, port: 1, toPort: 65535 } } ),
      sg: this.props.qsAccount.securityGroupAccess?.sg?.map( rule => { return { sgId: rule.sgId, protocol: Protocol.TCP, port: 1, toPort: 65535 } } ),
      prefixList: this.props.qsAccount.securityGroupAccess?.prefixList?.map( rule => { return { prefixList: rule.prefixList, protocol: Protocol.TCP, port: 1, toPort: 65535 } } )
    }

    //Create the SecurityGroup
    const quickSightSecurityGroup = new MdaaSecurityGroup( this, `quicksight-sg`, {
      naming: this.props.naming,
      securityGroupName: "quicksight-sg",
      vpc: vpc,
      description: 'QuickSight Security Group',
      allowAllOutbound: false,
      ingressRules: ingressRules,
      egressRules: this.props.qsAccount.securityGroupAccess
    } );

    return quickSightSecurityGroup;
  }

  private buildQuickSightServiceRole (): IRole {
    const role = new MdaaRole( this, `service-role`, {
      assumedBy: new ServicePrincipal( 'quicksight.amazonaws.com' ),
      description: 'QuickSight Service Role',
      roleName: `service-role`,
      naming: this.props.naming
    } )

    return role;
  }

  private createServiceManagedPolicy ( role: IRole ): IManagedPolicy {

    const quickSightServiceManagedPolicy = new ManagedPolicy( this, "quicksight-service-policy", {
      managedPolicyName: this.props.naming.resourceName( "quicksight-service-access" ),
      roles: [ role ]
    } )

    const getGlueDBsStatement = new PolicyStatement( {
      sid: 'GlueGetDBsAccess',
      effect: Effect.ALLOW,
      actions: [
        "glue:GetDatabases",
      ],
      resources: [ '*' ]
    } )
    quickSightServiceManagedPolicy.addStatements( getGlueDBsStatement )

    const glueResourceArns = ( this.props.qsAccount.glueResourceAccess || [] ).map( resource => {
      if ( resource.includes( "*" ) ) {
        console.warn( `Glue resource access '${ resource }' contains wildcard (*). Consider revising to specific resources.` )
      }
      return `arn:${ this.partition }:glue:${ this.region }:${ this.account }:${ resource }`
    } )
    glueResourceArns.push( `arn:${ this.partition }:glue:${ this.region }:${ this.account }:catalog` )
    glueResourceArns.push( `arn:${ this.partition }:glue:${ this.region }:${ this.account }:database/default` )
    glueResourceArns.push( `arn:${ this.partition }:glue:${ this.region }:${ this.account }:catalog` )

    const accessGlueStatement = new PolicyStatement( {
      sid: 'GlueAccess',
      effect: Effect.ALLOW,
      actions: [
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:GetTable",
        "glue:GetTables",
        "glue:GetPartition",
        "glue:GetPartitions",
        "glue:SearchTables"
      ],
      resources: glueResourceArns
    } )
    quickSightServiceManagedPolicy.addStatements( accessGlueStatement )


    const accessLakeFormationStatement = new PolicyStatement( {
      sid: 'LakeFormationAccess',
      effect: Effect.ALLOW,
      actions: [
        "lakeformation:GetDataAccess"
      ],
      resources: [
        '*'
      ]
    } )
    quickSightServiceManagedPolicy.addStatements( accessLakeFormationStatement )

    const accessListAthenaWorkgroupStatement = new PolicyStatement( {
      sid: 'AthenaListWorkgroupAccess',
      effect: Effect.ALLOW,
      actions: [
        "athena:ListWorkGroups",
        "athena:ListDataCatalogs",
        "athena:ListDatabases"
      ],
      resources: [ '*' ]
    } )
    quickSightServiceManagedPolicy.addStatements( accessListAthenaWorkgroupStatement )

    const accessAthenaListTableMetaStatement = new PolicyStatement( {
      sid: 'AthenaListTableMeta',
      effect: Effect.ALLOW,
      actions: [
        "athena:ListTableMetadata"
      ],
      resources: [ `arn:${ this.partition }:athena:${ this.region }:${ this.account }:datacatalog/AwsDataCatalog` ]
    } )

    quickSightServiceManagedPolicy.addStatements( accessAthenaListTableMetaStatement )


    const accessRedShiftDescribeStatement = new PolicyStatement( {
      sid: 'RedShiftDescribe',
      effect: Effect.ALLOW,
      actions: [
        "redshift:DescribeClusters"
      ],
      resources: [ "*" ]

    } )
    quickSightServiceManagedPolicy.addStatements( accessRedShiftDescribeStatement )

    // Required for creating VPC Connections
    const vpcReadStatement = new PolicyStatement( {
      sid: 'VpcReadAccess',
      effect: Effect.ALLOW,
      actions: [
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups"
      ],
      resources: [ "*" ]
    } )
    quickSightServiceManagedPolicy.addStatements( vpcReadStatement )

    const vpcCreateStatement = new PolicyStatement( {
      sid: 'VpcCreateAccess',
      effect: Effect.ALLOW,
      actions: [
        "ec2:CreateNetworkInterface"
      ],
      resources: [ "*" ]
    } )
    quickSightServiceManagedPolicy.addStatements( vpcCreateStatement )

    NagSuppressions.addResourceSuppressions(
      quickSightServiceManagedPolicy,
      [
        { id: 'AwsSolutions-IAM5', reason: 'Ec2:DescribeSubnets, ec2:DescribeSecurityGroups, ec2:CreateNetworkInterface, redshift:DescribeClusters,lakeformation:GetDataAccess,athena:ListWorkGroups does not take resources. Resource wildcards may originate from app config. Warnings logged.' }
      ],
      true
    );
    return quickSightServiceManagedPolicy
  }
}