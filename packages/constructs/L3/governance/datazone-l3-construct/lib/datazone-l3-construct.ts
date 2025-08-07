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
import { Duration, Stack } from 'aws-cdk-lib';

import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR

import { DomainConfig, DomainConfigProps } from '@aws-mdaa/datazone-constructs';
import {
  CfnDomain,
  CfnDomainProps,
  CfnDomainUnit,
  CfnDomainUnitProps,
  CfnGroupProfile,
  CfnGroupProfileProps,
  CfnOwner,
  CfnOwnerProps,
  CfnUserProfile,
  CfnUserProfileProps,
} from 'aws-cdk-lib/aws-datazone';
import { Conditions, Effect, IRole, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnResourceShare, CfnResourceShareProps } from 'aws-cdk-lib/aws-ram';
import { ParameterTier, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { flattenDomainUnitPaths } from './utils';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { GlueCatalogL3Construct } from '@aws-mdaa/glue-catalog-l3-construct';

export interface DataZoneUser {
  readonly iamRole?: MdaaRoleRef;
  readonly ssoId?: string;
}

export interface DataZoneGroup {
  readonly ssoId: string;
}
export interface NamedDataZoneGroups {
  /** @jsii ignore */
  readonly [name: string]: DataZoneGroup;
}
export interface NamedDataZoneUsers {
  /** @jsii ignore */
  readonly [name: string]: DataZoneUser;
}
export interface AsscociatedAccount {
  readonly account: string;
  readonly glueCatalogKmsKeyArn: string;
  readonly lakeformationManageAccessRoleArn?: string;
  readonly region?: string;
  readonly cdkRoleArn?: string;
  readonly createCdkUser?: boolean;
}

export interface NamedAssociatedAccounts {
  /** @jsii ignore */
  [name: string]: AsscociatedAccount;
}

export interface NamedBaseDomainsProps {
  /** @jsii ignore */
  readonly [name: string]: BaseDomainProps;
}

export interface DomainUnit {
  readonly ownerAccounts?: string[];
  readonly ownerUsers?: string[];
  readonly ownerGroups?: string[];
  readonly description?: string;
  readonly domainUnits?: NamedDomainUnits;
}
export interface NamedDomainUnits {
  /** @jsii ignore */
  readonly [name: string]: DomainUnit;
}

export interface BaseDomainProps {
  readonly dataAdminRole: MdaaRoleRef;
  readonly description?: string;
  readonly userAssignment: 'MANUAL' | 'AUTOMATIC';
  readonly associatedAccounts?: NamedAssociatedAccounts;
  readonly domainUnits?: NamedDomainUnits;
  readonly users?: NamedDataZoneUsers;
  readonly groups?: NamedDataZoneGroups;
  readonly ownerUsers?: string[];
  readonly ownerGroups?: string[];
  readonly ownerAccounts?: string[];
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
  readonly glueCatalogKmsKeyArn?: string;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  readonly domains: NamedDomainsProps;
}

const DEFAULT_SSO_TYPE = 'DISABLED';
const DEFAULT_USER_ASSIGNMENT = 'MANUAL';

export interface CreatedDomainUnit {
  readonly id: string;
  readonly domainUnits?: { [name: string]: CreatedDomainUnit };
}

export class DataZoneL3Construct extends MdaaL3Construct {
  protected readonly props: DataZoneL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataZoneL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const lakeformationManageAccessRole = props.lakeformationManageAccessRole
      ? Role.fromRoleArn(
          this,
          `lf-manage-access-role-import`,
          this.props.roleHelper
            .resolveRoleRefWithRefId(props.lakeformationManageAccessRole, 'lf-manage-access-role')
            .arn(),
        )
      : Role.fromRoleArn(
          this,
          `lf-manage-access-role-import`,
          StringParameter.valueForStringParameter(
            this,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );

    Object.entries(this.props.domains || {}).forEach(entry => {
      const domainName = entry[0];
      const domainProps = entry[1];
      this.createDomain(domainName, domainProps, lakeformationManageAccessRole);
    });
  }
  private createDomain(domainName: string, domainProps: DomainProps, lakeformationManageAccessRole: IRole) {
    const dataAdminRole = this.props.roleHelper.resolveRoleRefWithRefId(domainProps.dataAdminRole, 'admin');

    const domainVersion = domainProps.domainVersion ?? 'V1';

    const kmsKey = this.createDomainKmsKey(domainName, domainProps, dataAdminRole);

    const executionRole = this.createExecutionRole(`${domainName}-execution-role`, kmsKey, domainVersion);

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
      serviceRole: domainVersion == 'V2' ? this.createServiceRole(`service-${domainName}`, kmsKey).roleArn : undefined,
    };

    // Create domain
    const domain = new CfnDomain(this, `${domainName}-domain`, cfnDomainProps);

    const domainCdkUserId = this.getDomainCdkUserId(domainName, domain, domain.attrId, kmsKey.keyArn);

    const customEnvBlueprintConfig = this.createCustomBlueprintConfig(
      domainName,
      this,
      domain.attrId,
      [this.region],
      kmsKey.keyArn,
      domainVersion,
    );

    const dataAdminUserProfileProps: CfnUserProfileProps = {
      domainIdentifier: domain.attrId,
      userIdentifier: dataAdminRole.arn(),
      userType: 'IAM_ROLE',
      status: 'ACTIVATED',
    };
    const dataAdminUserProfile = new CfnUserProfile(
      this,
      `${domainName}-admin-user-profile`,
      dataAdminUserProfileProps,
    );

    const admincfnOwnerProps: CfnOwnerProps = {
      domainIdentifier: domain.attrId,
      entityIdentifier: domain.attrRootDomainUnitId,
      entityType: 'DOMAIN_UNIT',
      owner: {
        user: {
          userIdentifier: dataAdminUserProfile.attrId,
        },
      },
    };
    new CfnOwner(domain, `owner-user-data-admin`, admincfnOwnerProps);

    const glueCatalogKmsKeyArns = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].glueCatalogKmsKeyArn),
      this.props.glueCatalogKmsKeyArn ||
        StringParameter.valueForStringParameter(this, GlueCatalogL3Construct.ACCOUNT_KEY_SSM_PATH),
    ];

    const domainKmsUsagePolicyName = this.props.naming.resourceName(`domain-kms-use-${domainName}`);

    const keyAccessAccounts = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(x => x[1].account),
      this.account,
    ];

    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(
      domainName,
      this,
      domainKmsUsagePolicyName,
      this.region,
      this.account,
      keyAccessAccounts,
      {
        domainKmsKeyArn: kmsKey.keyArn,
        glueCatalogKmsKeyArns: glueCatalogKmsKeyArns,
      },
    );

    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    executionRole.addManagedPolicy(domainKmsUsagePolicy);

    const domainUsers = Object.fromEntries(
      Object.entries(domainProps.users || {}).map(([userName, userProps]) => {
        const userIdentifier = userProps.iamRole
          ? this.props.roleHelper.resolveRoleRefWithRefId(userProps.iamRole, userName).arn()
          : userProps.ssoId;
        const userType = userProps.iamRole ? 'IAM_ROLE' : 'SSO_USER';

        if (!userType || !userIdentifier) {
          throw new Error(`One of user iamRole or ssoId must be specified in user props for user ${userName}`);
        }

        const userProfileProps: CfnUserProfileProps = {
          domainIdentifier: domain.attrId,
          userIdentifier: userIdentifier,
          userType: userType,
          status: 'ACTIVATED',
        };
        const user = new CfnUserProfile(this, `${domainName}-user-${userName}`, userProfileProps);
        return [userName, user];
      }),
    );

    const domainGroups = Object.fromEntries(
      Object.entries(domainProps.groups || {}).map(([groupName, groupProps]) => {
        const groupProfileProps: CfnGroupProfileProps = {
          domainIdentifier: domain.attrId,
          groupIdentifier: groupProps.ssoId,

          status: 'ASSIGNED',
        };
        const user = new CfnGroupProfile(this, `${domainName}-group-${groupName}`, groupProfileProps);
        return [groupName, user];
      }),
    );

    domainProps.ownerUsers?.forEach(ownerName => {
      const ownerUser = domainUsers[ownerName];
      if (!ownerUser) {
        throw new Error(`Unknown owner user ${ownerName} on domain ${domainName}`);
      }
      const cfnOwnerProps: CfnOwnerProps = {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: 'DOMAIN_UNIT',
        owner: {
          user: {
            userIdentifier: ownerUser.attrId,
          },
        },
      };
      new CfnOwner(domain, `owner-user-${ownerName}`, cfnOwnerProps);
    });

    domainProps.ownerGroups?.forEach(ownerName => {
      const ownerGroup = domainGroups[ownerName];
      if (!ownerGroup) {
        throw new Error(`Unknown owner group ${ownerName} on domain ${domainName}`);
      }
      const cfnOwnerProps: CfnOwnerProps = {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: 'DOMAIN_UNIT',
        owner: {
          group: {
            groupIdentifier: ownerGroup.attrId,
          },
        },
      };
      new CfnOwner(domain, `owner-group-${ownerName}`, cfnOwnerProps);
    });

    if (domainProps.associatedAccounts) {
      const domainramShareProps: CfnResourceShareProps = {
        name: `DataZone-${this.props.naming.resourceName()}-${domain.attrId}`,
        resourceArns: [domain.attrArn],
        principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
        permissionArns: ['arn:aws:ram::aws:permission/AWSRAMDefaultPermissionAmazonDataZoneDomain'],
      };
      const domainRamShare = new CfnResourceShare(this, `domain-ram-share-${domainName}`, domainramShareProps);
      const associatedAccountCdkUserProfiles = Object.fromEntries(
        Object.entries(domainProps.associatedAccounts || {})
          .filter(associatedAccountProps => {
            return associatedAccountProps[1].createCdkUser;
          })
          .map(([associatedAccountName, associatedAccountProps]) => {
            const associatedAccountRamShareMonitor = this.getRamAssociationMonitor(
              domain,
              `domain-ram-association-monitor-${associatedAccountName}`,
              domainRamShare,
              associatedAccountProps.account,
            );

            const accountCdkUserProfileProps: CfnUserProfileProps = {
              domainIdentifier: domain.attrId,
              userIdentifier:
                associatedAccountProps.cdkRoleArn ??
                `arn:${this.partition}:iam::${associatedAccountProps.account}:role/cdk-hnb659fds-cfn-exec-role-${associatedAccountProps.account}-${this.region}`,
              userType: 'IAM_ROLE',
              status: 'ACTIVATED',
            };
            const associatedAccountCdkUserProfile = new CfnUserProfile(
              this,
              `${domainName}-${associatedAccountName}-cdk-user-profile`,
              accountCdkUserProfileProps,
            );
            associatedAccountCdkUserProfile.node.addDependency(associatedAccountRamShareMonitor);
            return [associatedAccountName, associatedAccountCdkUserProfile];
          }),
      );
      domainProps.ownerAccounts?.forEach(ownerName => {
        const ownerUser = associatedAccountCdkUserProfiles[ownerName];
        if (!ownerUser) {
          throw new Error(`Unknown owner account cdk user ${ownerName} on domain ${domainName}`);
        }
        const cfnOwnerProps: CfnOwnerProps = {
          domainIdentifier: domain.attrId,
          entityIdentifier: domain.attrRootDomainUnitId,
          entityType: 'DOMAIN_UNIT',
          owner: {
            user: {
              userIdentifier: ownerUser.attrId,
            },
          },
        };
        new CfnOwner(domain, `owner-cdk-user-${ownerName}`, cfnOwnerProps);
      });

      const createdDomainUnits = this.createDomainUnits(
        domain,
        domain.attrId,
        domain.attrRootDomainUnitId,
        {
          domainUsers: domainUsers,
          domainGroups: domainGroups,
          dataAdminUserProfile: dataAdminUserProfile,
          associatedAccountCdkUserProfiles: associatedAccountCdkUserProfiles,
        },
        domainProps.domainUnits,
      );

      this.createDomainUnitGrant(domain, `root-grant-create-project`, kmsKey.keyArn, domainName, domain, {
        policyType: 'CREATE_PROJECT',
        detail: {
          createProject: {
            includeChildDomainUnits: true,
          },
        },
        principal: {
          user: {
            userIdentifier: domainCdkUserId,
          },
        },
      });

      this.createDomainUnitGrant(domain, `root-grant-project-members`, kmsKey.keyArn, domainName, domain, {
        policyType: 'ADD_TO_PROJECT_MEMBER_POOL',

        detail: {
          addToProjectMemberPool: {
            includeChildDomainUnits: true,
          },
        },
        principal: {
          user: {
            allUsersGrantFilter: {},
          },
        },
      });
      const glueCatalogArns = [
        ...this.createDzGlueAccountStatementResources(this.account),
        ...Object.entries(domainProps.associatedAccounts || {}).flatMap(x =>
          this.createDzGlueAccountStatementResources(x[1].account),
        ),
      ];

      const domainUnitIds = flattenDomainUnitPaths('', createdDomainUnits);

      const domainConfigProps: DomainConfigProps = {
        naming: this.props.naming,
        domainName: domain.name,
        domainArn: domain.attrArn,
        domainId: domain.attrId,
        adminUserProfileId: dataAdminUserProfile.attrId,
        domainVersion,
        domainKmsKeyArn: kmsKey.keyArn,
        glueCatalogKmsKeyArns: glueCatalogKmsKeyArns,
        domainKmsUsagePolicyName: domainKmsUsagePolicy.managedPolicyName,
        domainUnits: domainUnitIds,
        glueCatalogArns: glueCatalogArns,
        domainCustomEnvBlueprintId: customEnvBlueprintConfig?.getAttString('id'),
      };

      const domainConfig = new DomainConfig(this, `domain-config-${domainName}`, domainConfigProps);
      const configParamArns = domainConfig.createDomainConfigParams(domainName);

      const baseConfigParam = new MdaaParamAndOutput(this, {
        createOutputs: false,
        resourceType: 'domain',
        resourceId: domainName,
        name: `config`,
        tier: ParameterTier.ADVANCED,
        value: JSON.stringify(configParamArns, undefined, 2),
        ...this.props,
      });

      const configParamRamShareProps: CfnResourceShareProps = {
        name: this.props.naming.resourceName(`domain-config-ssm-${domainName}`),
        resourceArns: [baseConfigParam.param!.parameterArn, ...configParamArns],
        principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
      };
      const configRamShare = new CfnResourceShare(
        this,
        `domain-config-ram-share-${domainName}`,
        configParamRamShareProps,
      );

      Object.entries(domainProps.associatedAccounts).forEach(associatedAccount => {
        this.getRamAssociationMonitor(
          domain,
          `domain-config-ram-association-monitor-${associatedAccount[0]}`,
          configRamShare,
          associatedAccount[1].account,
        );
        this.createAssociatedAccountStackResources(
          associatedAccount[0],
          associatedAccount[1],
          baseConfigParam.paramName,
          domainKmsUsagePolicyName,
          keyAccessAccounts,
          domainName,
        );
      });
    }
  }
  private createDzGlueAccountStatementResources(account: string): string[] {
    return [
      `arn:${this.partition}:glue:${this.region}:${account}:catalog`,
      `arn:${this.partition}:glue:${this.region}:${account}:database/*`,
      `arn:${this.partition}:glue:${this.region}:${account}:table/*`,
      `arn:${this.partition}:glue:${this.region}:${account}:tableVersion/*`,
    ];
  }
  private createDomainUnits(
    scope: Construct,
    domainId: string,
    parentDomainId: string,
    userProfiles: {
      domainUsers: { [name: string]: CfnUserProfile };
      domainGroups: { [name: string]: CfnGroupProfile };
      dataAdminUserProfile: CfnUserProfile;
      associatedAccountCdkUserProfiles: { [name: string]: CfnUserProfile };
    },
    domainUnits?: NamedDomainUnits,
  ): { [name: string]: CreatedDomainUnit } {
    return Object.fromEntries(
      Object.entries(domainUnits ?? {}).map(([domainUnitName, domainUnitProps]) => {
        const cfnDomainUnitProps: CfnDomainUnitProps = {
          domainIdentifier: domainId,
          name: domainUnitName,
          parentDomainUnitIdentifier: parentDomainId,
          description: domainUnitProps.description,
        };
        const domainUnit = new CfnDomainUnit(scope, `domain-unit-${domainUnitName}`, cfnDomainUnitProps);

        const dataAdminOwnerProps: CfnOwnerProps = {
          domainIdentifier: domainId,
          entityIdentifier: domainUnit.attrId,
          entityType: 'DOMAIN_UNIT',
          owner: {
            user: {
              userIdentifier: userProfiles.dataAdminUserProfile.attrId,
            },
          },
        };
        new CfnOwner(domainUnit, `owner-user-data-admin`, dataAdminOwnerProps);

        domainUnitProps.ownerAccounts?.forEach(ownerName => {
          const ownerUser = userProfiles.associatedAccountCdkUserProfiles[ownerName];
          if (!ownerUser) {
            throw new Error(`Unknown owner account ${ownerName} for domainUnit ${domainUnitName}`);
          }
          const cfnOwnerProps: CfnOwnerProps = {
            domainIdentifier: domainId,
            entityIdentifier: domainUnit.attrId,
            entityType: 'DOMAIN_UNIT',
            owner: {
              user: {
                userIdentifier: ownerUser.attrId,
              },
            },
          };
          new CfnOwner(domainUnit, `owner-cdk-user-${ownerName}`, cfnOwnerProps);
        });

        domainUnitProps.ownerUsers?.forEach(ownerName => {
          const ownerUser = userProfiles.domainUsers[ownerName];
          if (!ownerUser) {
            throw new Error(`Unknown owner user ${ownerName} for domainUnit ${domainUnitName}`);
          }
          const cfnOwnerProps: CfnOwnerProps = {
            domainIdentifier: domainId,
            entityIdentifier: domainUnit.attrId,
            entityType: 'DOMAIN_UNIT',
            owner: {
              user: {
                userIdentifier: ownerUser.attrId,
              },
            },
          };
          new CfnOwner(domainUnit, `owner-user-${ownerName}`, cfnOwnerProps);
        });

        domainUnitProps.ownerGroups?.forEach(ownerName => {
          const ownerGroup = userProfiles.domainGroups[ownerName];
          if (!ownerGroup) {
            throw new Error(`Unknown owner group ${ownerName} for domainUnit ${domainUnitName}`);
          }
          const cfnOwnerProps: CfnOwnerProps = {
            domainIdentifier: domainId,
            entityIdentifier: domainUnit.attrId,
            entityType: 'DOMAIN_UNIT',
            owner: {
              group: {
                groupIdentifier: ownerGroup.attrId,
              },
            },
          };
          new CfnOwner(domainUnit, `owner-group-${ownerName}`, cfnOwnerProps);
        });

        const childDomainUnits = this.createDomainUnits(
          domainUnit,
          domainId,
          domainUnit.attrId,
          {
            domainUsers: userProfiles.domainUsers,
            domainGroups: userProfiles.domainGroups,
            dataAdminUserProfile: userProfiles.dataAdminUserProfile,
            associatedAccountCdkUserProfiles: userProfiles.associatedAccountCdkUserProfiles,
          },
          domainUnitProps.domainUnits,
        );
        return [domainUnitName, { id: domainUnit.attrId, domainUnits: childDomainUnits }];
      }),
    );
  }

  private createAssociatedAccountStackResources(
    associatedAccountName: string,
    assocatedAccountProps: AsscociatedAccount,
    domainConfigSsmParamName: string,
    domainKmsUsagePolicyName: string,
    keyAccessAccounts: string[],
    domainName: string,
  ) {
    const crossAccountStack = this.getCrossAccountStack(assocatedAccountProps.account);
    if (!crossAccountStack) {
      console.warn(
        `Cross account stack not defined for associated account ${associatedAccountName}/${assocatedAccountProps.account} on domain ${domainName}. Cross account association will not work.`,
      );
      return;
    }
    const region = assocatedAccountProps.region || this.region;
    //The cross account stack is going to consume the domain config via RAM-shared Domain Config SSM Param created above
    const domainConfigSsmParamArn = `arn:${this.partition}:ssm:${region}:${this.account}:parameter${domainConfigSsmParamName}`;

    const domainConfig = DomainConfig.fromSsm(
      crossAccountStack,
      `domain-config-parser-${domainName}`,
      domainConfigSsmParamArn,
      this.props.naming,
    );

    //Create a managed policy which can be used to provide access to the Domain and Glue Catalog KMS keys in associated accounts
    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(
      domainName,
      crossAccountStack,
      domainKmsUsagePolicyName,
      assocatedAccountProps.account,
      region,
      keyAccessAccounts,
      {
        domainKmsKeyArn: domainConfig.domainKmsKeyArn,
        glueCatalogKmsKeyArns: domainConfig.glueCatalogKmsKeyArns,
      },
    );
    const lakeformationManageAccessRole = assocatedAccountProps.lakeformationManageAccessRoleArn
      ? Role.fromRoleArn(
          crossAccountStack,
          `lf-manage-access-role-import-${domainName}`,
          assocatedAccountProps.lakeformationManageAccessRoleArn,
        )
      : Role.fromRoleArn(
          crossAccountStack,
          `lf-manage-access-role-import-${domainName}`,
          StringParameter.valueForStringParameter(
            crossAccountStack,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );
    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    //Enable custom blueprints in the target account for this domain
    this.createCustomBlueprintConfig(
      domainName,
      crossAccountStack,
      domainConfig.domainId,
      [region || this.region],
      domainConfig.domainKmsKeyArn,
      domainConfig.domainVersion,
    );
  }

  private createDomainKmsUsagePolicy(
    domainName: string,
    scope: Construct,
    policyName: string,
    account: string,
    region: string,
    keyAccessAccounts: string[],
    kmsArns: {
      domainKmsKeyArn: string;
      glueCatalogKmsKeyArns: string[];
    },
  ) {
    const kmsUsagePolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: policyName,
      verbatimPolicyName: true, //policy name is passed verbatim as it will be the same in all accounts
    };
    const domainKmsUsagePolicy = new MdaaManagedPolicy(
      scope,
      `domain-kms-managed-policy-${domainName}`,
      kmsUsagePolicyProps,
    );

    // Reference https://docs.aws.amazon.com/datazone/latest/userguide/encryption-rest-datazone.html
    //Provide Decrypt on the Domain KMS Key when used within DataZone
    const domainKeyDecryptStatement = new PolicyStatement({
      sid: 'DomainKmsDecrypt',
      effect: Effect.ALLOW,
      resources: [kmsArns.domainKmsKeyArn],
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
      resources: [kmsArns.domainKmsKeyArn],
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
      resources: kmsArns.glueCatalogKmsKeyArns,
      actions: ['kms:DescribeKey'],
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDescribeStatement);

    //Provide Decrypt on all Glue Catalog keys for all associated accounts when used only with glue catalogs for these accounts
    const glueCatalogDecryptStatement = new PolicyStatement({
      sid: 'GlueKmsDecrypt',
      effect: Effect.ALLOW,
      resources: kmsArns.glueCatalogKmsKeyArns,
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
    domainName: string,
    scope: Construct,
    domainId: string,
    regions: string[],
    domainKmsKeyArn: string,
    domainVersion: string,
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
        domainVersion: domainVersion,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, `env-blueprint-config-cr-${domainName}`, crProps);
  }

  private createDomainUnitGrant(
    scope: Construct,
    grantId: string,
    domainKmsKeyArn: string,
    domainName: string,
    domain: CfnDomain,
    grantProps: {
      policyType:
        | 'CREATE_DOMAIN_UNIT'
        | 'OVERRIDE_DOMAIN_UNIT_OWNERS'
        | 'ADD_TO_PROJECT_MEMBER_POOL'
        | 'OVERRIDE_PROJECT_OWNERS'
        | 'CREATE_GLOSSARY'
        | 'CREATE_FORM_TYPE'
        | 'CREATE_ASSET_TYPE'
        | 'CREATE_PROJECT'
        | 'CREATE_ENVIRONMENT_PROFILE'
        | 'DELEGATE_CREATE_ENVIRONMENT_PROFILE'
        | 'CREATE_ENVIRONMENT'
        | 'CREATE_ENVIRONMENT_FROM_BLUEPRINT'
        | 'CREATE_PROJECT_FROM_PROJECT_PROFILE'
        | 'USE_ASSET_TYPE';
      detail: unknown;
      principal: unknown;
    },
  ) {
    const addPolicyGrantStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:AddPolicyGrant'],
      }),
      new PolicyStatement({
        resources: [domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'AddPolicyGrant',
      code: Code.fromAsset(`${__dirname}/../src/lambda/add_policy_grant`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'add_policy_grant.lambda_handler',
      handlerRolePolicyStatements: addPolicyGrantStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'AddPolicyGrant does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: 'DOMAIN_UNIT',
        policyType: grantProps.policyType,
        detail: grantProps.detail,
        principal: grantProps.principal,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    const grantCr = new MdaaCustomResource(scope, grantId, crProps);

    if (grantCr.handlerFunction.role) {
      const stack = Stack.of(scope);
      const ownerResourceId = `${domainName}-owner-grant-cr-user-profile`;
      const existingOwner = stack.node.tryFindChild(ownerResourceId);
      if (!existingOwner) {
        const dataAdminUserProfileProps: CfnUserProfileProps = {
          domainIdentifier: domain.attrId,
          userIdentifier: grantCr.handlerFunction.role?.roleArn,
          userType: 'IAM_ROLE',
          status: 'ACTIVATED',
        };
        const dataAdminUserProfile = new CfnUserProfile(
          this,
          `${domainName}-grant-cr-user-profile`,
          dataAdminUserProfileProps,
        );
        const adminCfnOwnerProps: CfnOwnerProps = {
          domainIdentifier: domain.attrId,
          entityIdentifier: domain.attrRootDomainUnitId,
          entityType: 'DOMAIN_UNIT',
          owner: {
            user: {
              userIdentifier: dataAdminUserProfile.attrId,
            },
          },
        };
        const grantCrOwner = new CfnOwner(stack, ownerResourceId, adminCfnOwnerProps);
        grantCr.node.addDependency(grantCrOwner);
      }
    }
  }
  private getDomainCdkUserId(domainName: string, scope: Construct, domainId: string, domainKmsKeyArn: string): string {
    const searchUserProfileStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['datazone:SearchUserProfiles'],
      }),
      new PolicyStatement({
        resources: [domainKmsKeyArn],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'DomainCdkUserId',
      code: Code.fromAsset(`${__dirname}/../src/lambda/get_user_profile`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'get_user_profile.lambda_handler',
      handlerRolePolicyStatements: searchUserProfileStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'SearchUserProfiles does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        domainIdentifier: domainId,
        arn: `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-cfn-exec-role-${this.account}-${this.region}`,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, `domain-cdk-user-id-cr-${domainName}`, crProps).getAttString('id');
  }

  private getRamAssociationMonitor(
    scope: Construct,
    id: string,
    domainRamShare: CfnResourceShare,
    associatedAccount: string,
  ) {
    const searchUserProfileStatements = [
      new PolicyStatement({
        resources: ['*'],
        actions: ['ram:GetResourceShareAssociations'],
      }),
    ];

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'RamAssociationMonitor',
      code: Code.fromAsset(`${__dirname}/../src/lambda/monitor_ram_association`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'monitor_ram_association.lambda_handler',
      handlerRolePolicyStatements: searchUserProfileStatements,
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'GetResourceShareAssociations does not take a resource: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html ',
        },
      ],
      handlerProps: {
        resourceShareArn: domainRamShare.attrArn,
        associatedEntity: associatedAccount,
      },
      naming: this.props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    return new MdaaCustomResource(scope, id, crProps);
  }
}
