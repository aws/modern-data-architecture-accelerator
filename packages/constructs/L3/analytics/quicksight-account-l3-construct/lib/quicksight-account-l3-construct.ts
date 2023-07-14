/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroup, CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import {
  CaefBoto3LayerVersion,
  CaefLambdaFunction,
  CaefLambdaRole
} from "@aws-caef/lambda-constructs";
import { CustomResource, Duration } from "aws-cdk-lib";
import { Protocol, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IRole, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
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
     * The VPC to which the security group will be associated.
     */
  readonly vpcId: string;
  /**
   * Map of names to security group access definitions. Will be added as egrees/ingress rules to the QuickSight security group
   */
  readonly securityGroupAccess?: CaefSecurityGroupRuleProps;
  /**
   * List of Glue resources to which the QuickSight service role will be granted access.
   */
  readonly glueResourceAccess?: string[];
}

export interface QuickSightAccountL3ConstructProps extends CaefL3ConstructProps {
  readonly qsAccount: AccountProps
}

//This stack creates the security group for a QuickSight VPC connections
export class QuickSightAccountL3Construct extends CaefL3Construct<QuickSightAccountL3ConstructProps> {
  constructor( scope: Construct, id: string, props: QuickSightAccountL3ConstructProps ) {
    super( scope, id, props );
    this.buildQuickSightSecurityGroup();
    this.buildQuickSightServiceRole();
    const accountProvider: Provider = this.createAccountProvider();
    this.createAccount( accountProvider );
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
    const accountCrRole = new CaefLambdaRole( this, "qsAccount-cr-role", {
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
        },
      ],
      true
    );
    const srcDir = `${ __dirname }/../src/python/quicksight_account`;
    // This Lambda is used as a Custom Resource in order to create the QuickSight Account
    const accountCrLambda = new CaefLambdaFunction(
      this,
      "qsAccount-cr-func",
      {
        functionName: "qsAccount-cr-func",
        naming: this.props.naming,
        code: Code.fromAsset( srcDir ),
        handler: "quicksight_account.lambda_handler",
        runtime: Runtime.PYTHON_3_10,
        timeout: Duration.seconds( 300 ),
        environment: {
          ACCOUNT_ID: this.account,
        },
        role: accountCrRole,
        layers: [ new CaefBoto3LayerVersion( this, 'boto3-layer', { naming: this.props.naming } ) ]
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
      ],
      true
    );
    const accountCrProviderFunctionName = this.props.naming.resourceName(
      "qsAccount-cr-prov",
      64
    );
    const accountCrProviderRole = new CaefLambdaRole(
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
      ],
      true
    );
    return accountCrProvider;
  }

  //Parses the Config and preps for QS Account API arguments
  private createAccount ( accountProvider: Provider ): void {
    const accountCreateProps: AccountWithNameProps = {
      ...this.props.qsAccount, ...{
        accountName: this.props.naming.resourceName()
      }
    }
    this.createAccountCr( accountProvider, accountCreateProps )
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
    const ingressRules: CaefSecurityGroupRuleProps = {
      ipv4: this.props.qsAccount.securityGroupAccess?.ipv4?.map( rule => { return { cidr: rule.cidr, protocol: Protocol.TCP, port: 1, toPort: 65535 } } ),
      sg: this.props.qsAccount.securityGroupAccess?.sg?.map( rule => { return { sgId: rule.sgId, protocol: Protocol.TCP, port: 1, toPort: 65535 } } ),
      prefixList: this.props.qsAccount.securityGroupAccess?.prefixList?.map( rule => { return { prefixList: rule.prefixList, protocol: Protocol.TCP, port: 1, toPort: 65535 } } )
    }

    //Create the SecurityGroup
    const quickSightSecurityGroup = new CaefSecurityGroup( this, `quicksight-sg`, {
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
    const role = new CaefRole( this, `service-role`, {
      assumedBy: new ServicePrincipal( 'quicksight.amazonaws.com' ),
      description: 'QuickSight Service Role',
      roleName: `service-role`,
      naming: this.props.naming
    } )
    this.createManagedPolicies( role )
    return role;
  }

  private createManagedPolicies ( role: IRole ) {

    const quickSightServiceGlueManagedPolicy = new ManagedPolicy( this, "quicksight-glue-policy", {
      managedPolicyName: this.props.naming.resourceName( "quicksight-glue-policy" ),
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
    quickSightServiceGlueManagedPolicy.addStatements( getGlueDBsStatement )

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
    quickSightServiceGlueManagedPolicy.addStatements( accessGlueStatement )

    NagSuppressions.addResourceSuppressions(
      quickSightServiceGlueManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource wildcards may originate from app config. Warnings logged.'
        }
      ],
      true
    );

    const quickSightServiceAthenaLFManagedPolicy = new ManagedPolicy( this, "quicksight-athena-lf-policy", {
      managedPolicyName: this.props.naming.resourceName( "quicksight-athena-lf-policy" ),
      roles: [ role ]
    } )

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
    quickSightServiceAthenaLFManagedPolicy.addStatements( accessLakeFormationStatement )

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
    quickSightServiceAthenaLFManagedPolicy.addStatements( accessListAthenaWorkgroupStatement )

    const accessAthenaListTableMetaStatement = new PolicyStatement( {
      sid: 'AthenaListTableMeta',
      effect: Effect.ALLOW,
      actions: [
        "athena:ListTableMetadata"
      ],
      resources: [ `arn:${ this.partition }:athena:${ this.region }:${ this.account }:datacatalog/AwsDataCatalog` ]
    } )

    quickSightServiceAthenaLFManagedPolicy.addStatements( accessAthenaListTableMetaStatement )

    NagSuppressions.addResourceSuppressions(
      quickSightServiceAthenaLFManagedPolicy,
      [
        { id: 'AwsSolutions-IAM5', reason: 'lakeformation:GetDataAccess,athena:ListWorkGroups do not take resources.' }
      ],
      true
    );

    const quickSightServiceRedshiftManagedPolicy = new ManagedPolicy( this, "quicksight-redshift-policy", {
      managedPolicyName: this.props.naming.resourceName( "quicksight-redshift-policy" ),
      roles: [ role ]
    } )
    const accessRedShiftDescribeStatement = new PolicyStatement( {
      sid: 'RedShiftDescribe',
      effect: Effect.ALLOW,
      actions: [
        "redshift:DescribeClusters"
      ],
      resources: [ "*" ]

    } )
    quickSightServiceRedshiftManagedPolicy.addStatements( accessRedShiftDescribeStatement )
    NagSuppressions.addResourceSuppressions(
      quickSightServiceRedshiftManagedPolicy,
      [
        { id: 'AwsSolutions-IAM5', reason: 'redshift:DescribeClusters does not take resources.' }
      ],
      true
    );
  }
}