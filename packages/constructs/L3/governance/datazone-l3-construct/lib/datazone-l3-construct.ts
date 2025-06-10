/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaManagedPolicy, MdaaManagedPolicyProps, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Duration } from 'aws-cdk-lib';

import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaDataZoneDomainSSMConfigParser } from '@aws-mdaa/datazone-constructs';
import { CfnDomain, CfnDomainProps, CfnUserProfile, CfnUserProfileProps } from 'aws-cdk-lib/aws-datazone';
import { Conditions, Effect, IRole, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnResourceShare, CfnResourceShareProps } from 'aws-cdk-lib/aws-ram';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface AdminUser {
  readonly role: MdaaRoleRef;
  readonly userType: 'IAM_ROLE' | 'SSO_USER';
}

export interface NamedAdminUsers {
  /** @jsii ignore */
  readonly [name: string]: AdminUser;
}
export interface AsscociatedAccount {
  readonly account: string;
  readonly glueCatalogKmsKeyArn: string;
  readonly region?: string;
  readonly cdkRoleArn?: string;
  readonly adminUsers?: NamedAdminUsers;
}

export interface NamedAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: AsscociatedAccount;
}

export interface NamedBaseDomainsProps {
  /** @jsii ignore */
  readonly [name: string]: BaseDomainProps;
}
export interface BaseDomainProps {
  readonly dataAdminRole: MdaaRoleRef;
  readonly additionalAdminUsers?: NamedAdminUsers;
  readonly description?: string;
  readonly userAssignment: 'MANUAL' | 'AUTOMATIC';
  readonly associatedAccounts?: NamedAssociatedAccounts;
}

export interface DomainProps extends BaseDomainProps {
  readonly domainVersion?: 'V1' | 'V2';
  readonly singleSignOnType: 'DISABLED' | 'IAM_IDC';
}
export interface NamedDomainsProps {
  /** @jsii ignore */
  readonly [name: string]: DomainProps;
}
export interface DataZoneL3ConstructProps extends MdaaL3ConstructProps {
  readonly glueCatalogKmsKeyArn: string;
  readonly domains: NamedDomainsProps;
}

const DEFAULT_SSO_TYPE = 'DISABLED';
const DEFAULT_USER_ASSIGNMENT = 'MANUAL';

export class DataZoneL3Construct extends MdaaL3Construct {
  protected readonly props: DataZoneL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataZoneL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    Object.entries(this.props.domains || {}).forEach(entry => {
      const domainName = entry[0];
      const domainProps = entry[1];
      this.createDomain(domainName, domainProps);
    });
  }
  private createDomain(domainName: string, domainProps: DomainProps) {
    const dataAdminRole = this.props.roleHelper.resolveRoleRefWithRefId(domainProps.dataAdminRole, 'admin');

    const kmsKey = this.createDomainKmsKey(domainName, domainProps, dataAdminRole);

    const executionRole = this.createExecutionRole(`${domainName}-execution-role`, kmsKey, domainProps.domainVersion);

    const singleSignOn: CfnDomain.SingleSignOnProperty = {
      type: domainProps.singleSignOnType ?? DEFAULT_SSO_TYPE,
      userAssignment: domainProps.userAssignment ?? DEFAULT_USER_ASSIGNMENT,
    };

    const cfnDomainProps: CfnDomainProps = {
      domainExecutionRole: executionRole.roleArn,
      name: this.props.naming.resourceName(domainName),
      kmsKeyIdentifier: kmsKey.keyArn,
      description: domainProps.description,
      singleSignOn: singleSignOn,
      domainVersion: domainProps.domainVersion,
      serviceRole: domainProps.domainVersion == 'V2' ? this.createServiceRole('service', kmsKey).roleArn : undefined,
    };

    // Create domain
    const domain = new CfnDomain(this, `${domainName}-domain`, cfnDomainProps);

    const adminUserProfileProps: CfnUserProfileProps = {
      domainIdentifier: domain.attrId,
      userIdentifier: dataAdminRole.arn(),
      userType: 'IAM_ROLE',
      status: 'ACTIVATED',
    };
    const adminUserProfile = new CfnUserProfile(this, `${domainName}-admin-user-profile`, adminUserProfileProps);

    const glueCatalogKmsKeyArns = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].glueCatalogKmsKeyArn),
      this.props.glueCatalogKmsKeyArn,
    ];

    const domainKmsUsagePolicyName = this.props.naming.resourceName(`kms-usage-${domainName}`);

    const keyAccessAccounts = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].account),
      this.account,
    ];

    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(
      this,
      domainKmsUsagePolicyName,
      this.region,
      this.account,
      keyAccessAccounts,
      kmsKey.keyArn,
      glueCatalogKmsKeyArns,
    );

    executionRole.addManagedPolicy(domainKmsUsagePolicy);

    Object.entries(domainProps.additionalAdminUsers || {}).forEach(adminUser => {
      const resolvedUserRole = this.props.roleHelper.resolveRoleRefWithRefId(adminUser[1].role, adminUser[0]);
      const accountUserProfileProps: CfnUserProfileProps = {
        domainIdentifier: domain.attrId,
        userIdentifier: adminUser[1].userType == 'IAM_ROLE' ? resolvedUserRole.arn() : resolvedUserRole.name(),
        userType: adminUser[1].userType,
        status: 'ACTIVATED',
      };
      new CfnUserProfile(this, `${domainName}-admin-user-${adminUser[0]}`, accountUserProfileProps);
    });

    new MdaaParamAndOutput(this, {
      resourceType: 'admin-user',
      resourceId: domainName,
      name: 'id',
      value: adminUserProfile.attrId,
      ...this.props,
      tier: ParameterTier.ADVANCED,
    });

    const customEnvBlueprintConfig = this.createCustomBlueprintConfig(
      this,
      domain.attrId,
      [this.region],
      kmsKey.keyArn,
    );

    const configParam = this.createDomainConfigParam(
      domainName,
      domain,
      adminUserProfile,
      customEnvBlueprintConfig.getAttString('id'),
      domain.domainVersion ?? 'V1',
      {
        domainKmsKeyArn: kmsKey.keyArn,
        glueCatalogKmsKeyArns: glueCatalogKmsKeyArns,
        domainKmsUsagePolicyName: domainKmsUsagePolicyName,
      },
    );

    if (domainProps.associatedAccounts) {
      const ramShareProps: CfnResourceShareProps = {
        name: `DataZone-${this.props.naming.resourceName()}-${domain.attrId}`,
        resourceArns: [domain.attrArn],
        principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        permissionArns: ['arn:aws:ram::aws:permission/AWSRAMDefaultPermissionAmazonDataZoneDomain'],
      };
      const associatedAccountRamShare = new CfnResourceShare(this, `domain-ram-share`, ramShareProps);

      if (configParam.param) {
        const ramShareProps: CfnResourceShareProps = {
          name: this.props.naming.resourceName('domain-config-ssm'),
          resourceArns: [configParam.param.parameterArn],
          principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        };
        new CfnResourceShare(this, `domain-config-ram-share`, ramShareProps);

        Object.entries(domainProps.associatedAccounts).forEach(associatedAccount => {
          const accountCdkUserProfileProps: CfnUserProfileProps = {
            domainIdentifier: domain.attrId,
            userIdentifier:
              associatedAccount[1].cdkRoleArn ??
              `arn:${this.partition}:iam::${associatedAccount[1].account}:role/cdk-hnb659fds-cfn-exec-role-${associatedAccount[1].account}-${this.region}`,
            userType: 'IAM_ROLE',
            status: 'ACTIVATED',
          };
          const associatedAccountCdkUserProfile = new CfnUserProfile(
            this,
            `${domainName}-${associatedAccount[1].account}-cdk-user-profile`,
            accountCdkUserProfileProps,
          );

          //Monitor resource share associations
          associatedAccountCdkUserProfile.node.addDependency(associatedAccountRamShare);

          this.createAssociatedAccountStackResources(
            associatedAccount[0],
            associatedAccount[1].account,
            associatedAccount[1].region || this.region,
            configParam.paramName,
            domainKmsUsagePolicyName,
            keyAccessAccounts,
            domainName,
          );
        });
      }
    }
  }

  private createAssociatedAccountStackResources(
    associatedAccountName: string,
    associatedAccountNum: string,
    region: string,
    configParamName: string,
    domainKmsUsagePolicyName: string,
    keyAccessAccounts: string[],
    domainName: string,
  ) {
    if (this.props.crossAccountStacks) {
      const crossAccountStack = this.props.crossAccountStacks[associatedAccountNum];
      if (crossAccountStack) {
        //The cross account stack is going to consume the domain config via RAM-shared Domain Config SSM Param created above
        const domainConfigSsmParamArn = `arn:${this.partition}:ssm:${region}:${this.account}:parameter${configParamName}`;

        const domainConfigParser = new MdaaDataZoneDomainSSMConfigParser(crossAccountStack, 'domain-config-parser', {
          naming: this.props.naming,
          domainConfigSSMParam: domainConfigSsmParamArn,
        });

        //Create a managed policy which can be used to provide access to the Domain and Glue Catalog KMS keys in associated accounts
        this.createDomainKmsUsagePolicy(
          crossAccountStack,
          domainKmsUsagePolicyName,
          associatedAccountNum,
          region,
          keyAccessAccounts,
          domainConfigParser.parsedConfig.domainKmsKeyArn,
          domainConfigParser.parsedConfig.glueCatalogKmsKeyArns,
        );

        //Enable custom blueprints in the target account for this domain
        this.createCustomBlueprintConfig(
          crossAccountStack,
          domainConfigParser.parsedConfig.domainId,
          [region || this.region],
          domainConfigParser.parsedConfig.domainKmsKeyArn,
        );
      } else {
        console.warn(
          `Cross account stack not defined for associated account ${associatedAccountName}/${associatedAccountNum} on domain ${domainName}. Cross account association will not work.`,
        );
      }
    }
  }

  private createDomainKmsUsagePolicy(
    scope: Construct,
    policyName: string,
    account: string,
    region: string,
    keyAccessAccounts: string[],
    domainKmsKeyArn: string,
    glueCatalogKmsKeyArns: string[],
  ) {
    const kmsUsagePolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: policyName,
      verbatimPolicyName: true, //policy name is passed verbatim as it will be the same in all accounts
    };
    const domainKmsUsagePolicy = new MdaaManagedPolicy(scope, 'domain-kms-managed-policy', kmsUsagePolicyProps);

    // Reference https://docs.aws.amazon.com/datazone/latest/userguide/encryption-rest-datazone.html
    //Provide Decrypt on the Domain KMS Key when used within DataZone
    const domainKeyDecryptStatement = new PolicyStatement({
      sid: 'DomainKmsDecrypt',
      effect: Effect.ALLOW,
      resources: [domainKmsKeyArn],
      actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
      conditions: {
        'ForAnyValue:StringEquals': {
          'kms:EncryptionContextKeys': 'aws:datazone:domainId',
        },
      },
    });
    domainKmsUsagePolicy.addStatements(domainKeyDecryptStatement);

    //Provide Decrypt on the Domain KMS Key when used within DataZone
    const domainKeyGrantStatement = new PolicyStatement({
      sid: 'DomainKmsGrant',
      effect: Effect.ALLOW,
      resources: [domainKmsKeyArn],
      actions: ['kms:CreateGrant'],
      conditions: {
        StringLike: {
          'kms:CallerAccount': account,
          'kms:ViaService': `datazone.${region}.amazonaws.com`,
        },
        Bool: {
          'kms:GrantIsForAWSResource': 'true',
        },
        'ForAnyValue:StringEquals': {
          'kms:EncryptionContextKeys': 'aws:datazone:domainId',
        },
      },
    });
    domainKmsUsagePolicy.addStatements(domainKeyGrantStatement);
    //Provide DescribeKey on all Glue Catalog keys for all associated accounts
    const glueCatalogDescribeStatement = new PolicyStatement({
      sid: 'GlueKmsDescribe',
      effect: Effect.ALLOW,
      resources: glueCatalogKmsKeyArns,
      actions: ['kms:DescribeKey'],
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDescribeStatement);

    //Provide Decrypt on all Glue Catalog keys for all associated accounts when used only with glue catalogs for these accounts
    const glueCatalogDecryptStatement = new PolicyStatement({
      sid: 'GlueKmsDecrypt',
      effect: Effect.ALLOW,
      resources: glueCatalogKmsKeyArns,
      actions: ['kms:Decrypt'],
      conditions: {
        StringEquals: {
          'kms:EncryptionContext:glue_catalog_id': keyAccessAccounts,
        },
      },
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDecryptStatement);

    return domainKmsUsagePolicy;
  }

  private createDomainConfigParam(
    domainName: string,
    domain: CfnDomain,
    adminUserProfile: CfnUserProfile,
    customEnvBlueprintConfigId: string,
    domainVersion: string,
    domainKmsConfig: {
      domainKmsKeyArn: string;
      glueCatalogKmsKeyArns: string[];
      domainKmsUsagePolicyName: string;
    },
  ): MdaaParamAndOutput {
    return new MdaaParamAndOutput(this, {
      resourceType: 'domain',
      resourceId: domainName,
      name: 'config',
      tier: ParameterTier.ADVANCED,
      value: JSON.stringify({
        domainId: domain.attrId,
        domainArn: domain.attrArn,
        adminUserProfileId: adminUserProfile.attrId,
        datalakeEnvBlueprintId: customEnvBlueprintConfigId,
        domainVersion: domainVersion,
        domainKmsKeyArn: domainKmsConfig.domainKmsKeyArn,
        glueCatalogKmsKeyArns: domainKmsConfig.glueCatalogKmsKeyArns,
        domainKmsUsagePolicyName: domainKmsConfig.domainKmsUsagePolicyName,
      }),
      ...this.props,
    });
  }

  private createDomainKmsKey(domainName: string, domainProps: DomainProps, dataAdminRole: MdaaResolvableRole): IKey {
    // Create KMS Key
    const kmsKey = new MdaaKmsKey(this, `${domainName}-cmk`, {
      naming: this.props.naming,
      alias: domainName,
      keyAdminRoleIds: [dataAdminRole.id()],
    });

    const keyAccessAccounts = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].account),
      this.account,
    ];
    keyAccessAccounts.forEach(account => {
      //Add a statement that allows anyone in the account to use the key as long as it is via Datazone
      const accountKeyUsagePolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
      });
      accountKeyUsagePolicyStatement.addAnyPrincipal();
      accountKeyUsagePolicyStatement.addCondition('StringEquals', {
        'kms:CallerAccount': account,
        'kms:ViaService': `datazone.${this.region}.amazonaws.com`,
      });
      kmsKey.addToResourcePolicy(accountKeyUsagePolicyStatement);
    });
    return kmsKey;
  }

  /**
   * Creates an Execution Role for a DataZone Domain
   * @param roleName name to use for the role
   * @param kmsArn KMS key ARN created for the domain
   * @returns a Role
   */
  private createServiceRole(roleName: string, kmsKey: IKey): IRole {
    const serviceRoleConditions: Conditions = {
      StringEquals: {
        'aws:SourceAccount': this.account,
      },
    };

    const serviceRole = new MdaaRole(this, roleName, {
      naming: this.props.naming,
      roleName: roleName,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(serviceRoleConditions),
      // managedPolicies: [
      //   MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy'),
      // ],
    });

    serviceRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [kmsKey.keyArn],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      serviceRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
      ],
      true,
    );

    return serviceRole;
  }

  /**
   * Creates an Execution Role for a DataZone Domain
   * @param roleName name to use for the role
   * @param kmsArn KMS key ARN created for the domain
   * @returns a Role
   */
  private createExecutionRole(roleName: string, kmsKey: IKey, domainVersion?: string): IRole {
    const executionRoleCondition: Conditions = {
      StringEquals: {
        'aws:SourceAccount': this.account,
      },
      'ForAllValues:StringLike': {
        'aws:TagKeys': 'datazone*',
      },
    };

    const executionRole = new MdaaRole(this, roleName, {
      naming: this.props.naming,
      roleName: roleName,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition),
      managedPolicies: [
        domainVersion == 'V2'
          ? MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/SageMakerStudioDomainExecutionRolePolicy')
          : MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy'),
      ],
    });

    executionRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:TagSession'],
        principals: [new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition)],
      }),
    );

    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [kmsKey.keyArn],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      executionRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Permissions are related DataZone and only one permission is given to RAM to get share associations.',
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Permission to use Key for DataZone. No other role requires this.',
        },
      ],
      true,
    );

    return executionRole;
  }

  private createCustomBlueprintConfig(
    scope: Construct,
    domainId: string,
    regions: string[],
    domainKmsKeyArn: string,
  ): MdaaCustomResource {
    const envBlueprintConfigsStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:PutEnvironmentBlueprintConfiguration', 'datazone:ListEnvironmentBlueprints'],
      }),
      new PolicyStatement({
        resources: [domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'EnvBlueprintConfig',
      code: Code.fromAsset(`${__dirname}/../src/lambda/blueprint_configuration`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'blueprint_configuration.lambda_handler',
      handlerRolePolicyStatements: envBlueprintConfigsStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'PutEnvironmentBlueprintConfiguration does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        domainIdentifier: domainId,
        enabledRegions: regions,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, 'env-blueprint-config-cr', crProps);
  }
}
