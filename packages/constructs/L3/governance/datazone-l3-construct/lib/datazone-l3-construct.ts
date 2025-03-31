/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { Duration } from 'aws-cdk-lib';

import { CfnDomain, CfnDomainProps, CfnUserProfile, CfnUserProfileProps } from 'aws-cdk-lib/aws-datazone';
import { Conditions, Effect, IRole, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnResourceShare, CfnResourceShareProps } from 'aws-cdk-lib/aws-ram';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
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
  readonly region?: string;
  readonly cdkRoleArn?: string;
  readonly adminUsers?: NamedAdminUsers;
}

export interface NamedAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: AsscociatedAccount;
}

export interface DomainProps {
  /**
   * List of data admin role ids which will administer project resources
   */
  readonly dataAdminRole: MdaaRoleRef;
  readonly additionalAdminUsers?: NamedAdminUsers;
  readonly description?: string;
  readonly singleSignOnType: string;
  readonly userAssignment: string;
  readonly associatedAccounts?: NamedAssociatedAccounts;
}
export interface NamedDomainsProps {
  /** @jsii ignore */
  readonly [name: string]: DomainProps;
}
export interface DataZoneL3ConstructProps extends MdaaL3ConstructProps {
  readonly domains?: NamedDomainsProps;
}

const DEFAULT_SSO_TYPE = 'DISABLED';
const DEFAULT_USER_ASSIGNMENT = 'MANUAL';

export class DataZoneL3Construct extends MdaaL3Construct {
  protected readonly props: DataZoneL3ConstructProps;
  private static CUSTOM_ENV_BLUEPRINT_ID = 'dqsdikgj5tspu2';

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

    const kmsKeyArnParam = new MdaaParamAndOutput(this, {
      resourceType: 'kms-cmk',
      resourceId: domainName,
      name: 'arn',
      value: kmsKey.keyArn,
      ...this.props,
      tier: ParameterTier.ADVANCED,
    });

    // Resolve Execution Role
    const executionRole = this.createExecutionRole(`${domainName}-execution-role`, kmsKey.keyArn);

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

    new MdaaParamAndOutput(this, {
      resourceType: 'custom-datalake-env-blueprint',
      resourceId: domainName,
      name: 'id',
      value: customEnvBlueprintConfig.getAttString('id'),
      ...this.props,
      tier: ParameterTier.ADVANCED,
    });
    const domainIdParam = new MdaaParamAndOutput(this, {
      resourceType: 'domain',
      resourceId: domainName,
      name: 'id',
      value: domain.attrId,
      ...this.props,
      tier: ParameterTier.ADVANCED,
    });

    const domainArnParam = new MdaaParamAndOutput(this, {
      resourceType: 'domain',
      resourceId: domainName,
      name: 'arn',
      value: domain.attrArn,
      tier: ParameterTier.ADVANCED,
      ...this.props,
    });

    const configParam = this.createDomainConfigParam(
      domainName,
      domain,
      adminUserProfile,
      customEnvBlueprintConfig.getAttString('id'),
    );

    if (domainProps.associatedAccounts) {
      const ramShareProps: CfnResourceShareProps = {
        name: `DataZone-${this.props.naming.resourceName('domain-config-ssm')}-${domain.attrId}`,
        resourceArns: [domain.attrArn],
        principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        permissionArns: ['arn:aws:ram::aws:permission/AWSRAMDefaultPermissionAmazonDataZoneDomain'],
      };
      new CfnResourceShare(this, `domain-ram-share`, ramShareProps);

      if (configParam.param) {
        const ramShareProps: CfnResourceShareProps = {
          name: this.props.naming.resourceName('domain-config-ssm'),
          resourceArns: [configParam.param.parameterArn],
          principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        };
        new CfnResourceShare(this, `domain-config-ram-share`, ramShareProps);
      }

      if (domainArnParam.param) {
        const ramShareProps: CfnResourceShareProps = {
          name: this.props.naming.resourceName('domain-arn-ssm'),
          resourceArns: [domainArnParam.param.parameterArn],
          principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        };
        new CfnResourceShare(this, `domain-arn-ram-share`, ramShareProps);
      }

      if (domainIdParam.param && kmsKeyArnParam.param) {
        const domainIdShareProps: CfnResourceShareProps = {
          name: this.props.naming.resourceName('domain-id-ssm'),
          resourceArns: [domainIdParam.param.parameterArn],
          principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        };
        new CfnResourceShare(this, `domain-id-ram-share`, domainIdShareProps);

        const domainKeyArnShareProps: CfnResourceShareProps = {
          name: this.props.naming.resourceName('domain-key-arn-ssm'),
          resourceArns: [kmsKeyArnParam.param.parameterArn],
          principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        };
        new CfnResourceShare(this, `domain-key-arn-ram-share`, domainKeyArnShareProps);

        Object.entries(domainProps.associatedAccounts).forEach(associatedAccount => {
          const accountCdkUserProfileProps: CfnUserProfileProps = {
            domainIdentifier: domain.attrId,
            userIdentifier:
              associatedAccount[1].cdkRoleArn ??
              `arn:${this.partition}:iam::${associatedAccount[1].account}:role/cdk-hnb659fds-cfn-exec-role-${associatedAccount[1].account}-${this.region}`,
            userType: 'IAM_ROLE',
            status: 'ACTIVATED',
          };
          new CfnUserProfile(
            this,
            `${domainName}-${associatedAccount[1].account}-cdk-user-profile`,
            accountCdkUserProfileProps,
          );

          if (this.props.crossAccountStacks) {
            const crossAccountStack = this.props.crossAccountStacks[associatedAccount[1].account];
            if (crossAccountStack) {
              const domainIdSsmParamArn = `arn:${this.partition}:ssm:${associatedAccount[1].region ?? this.region}:${
                this.account
              }:parameter${domainIdParam.paramName}`;
              const kmsKeyArnParamArn = `arn:${this.partition}:ssm:${associatedAccount[1].region ?? this.region}:${
                this.account
              }:parameter${kmsKeyArnParam.paramName}`;
              this.createCustomBlueprintConfig(
                crossAccountStack,
                StringParameter.fromStringParameterArn(
                  crossAccountStack,
                  `domain-id-import-${associatedAccount}`,
                  domainIdSsmParamArn,
                ).stringValue,
                [associatedAccount[1].region || this.region],
                StringParameter.fromStringParameterArn(
                  crossAccountStack,
                  `domain-key-arn-id-import-${associatedAccount}`,
                  kmsKeyArnParamArn,
                ).stringValue,
              );
            } else {
              console.warn(
                `Cross account stack not defined for associated account ${associatedAccount[0]}/${associatedAccount[1].account} on domain ${domainName}`,
              );
            }
          }
        });
      }
    }
  }

  private createDomainConfigParam(
    domainName: string,
    domain: CfnDomain,
    adminUserProfile: CfnUserProfile,
    customEnvBlueprintConfigId: string,
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
  private createExecutionRole(roleName: string, kmsArn: string): IRole {
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
        MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy'),
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
        resources: [kmsArn],
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
        actions: ['datazone:PutEnvironmentBlueprintConfiguration'],
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
        environmentBlueprintIdentifier: DataZoneL3Construct.CUSTOM_ENV_BLUEPRINT_ID,
        enabledRegions: regions,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerLayers: [new MdaaBoto3LayerVersion(scope, 'boto3-layer', { naming: this.props.naming })],
      handlerTimeout: Duration.seconds(120),
    };

    return new MdaaCustomResource(scope, 'env-blueprint-config-cr', crProps);
  }
}
