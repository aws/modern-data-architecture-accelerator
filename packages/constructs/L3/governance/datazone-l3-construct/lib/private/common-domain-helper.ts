/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import {
  AuthorizationPolicy,
  DataZoneAuthorizationConstruct,
  DataZoneDomainUnitConstruct,
  DataZoneManagedBlueprintConfigConstruct,
  DomainConfig,
  DomainConfigProps,
  EntityType,
  NamedAuthorizationPolicies,
  PolicyPrincipal,
  ProfileManagementConstruct,
} from '@aws-mdaa/datazone-constructs';
import { GlueCatalogL3Construct } from '@aws-mdaa/glue-catalog-l3-construct';
import { MdaaManagedPolicy, MdaaManagedPolicyProps, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey, USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { MdaaL3Construct } from '@aws-mdaa/l3-construct';
import { Annotations, Duration } from 'aws-cdk-lib';

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper/lib/rolehelper';
import { IMdaaResourceNaming } from '@aws-mdaa/naming/lib/resource-naming';
import {
  CfnDomain,
  CfnEnvironmentBlueprintConfiguration,
  CfnGroupProfile,
  CfnOwner,
  CfnOwnerProps,
  CfnUserProfile,
  CfnUserProfileProps,
} from 'aws-cdk-lib/aws-datazone';
import { Conditions, Effect, IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnResourceShare, CfnResourceShareProps } from 'aws-cdk-lib/aws-ram';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import {
  AssociatedAccountProps,
  BaseDomainProps,
  DataZoneDomainProps,
  NamedDomainUnits,
  SageMakerDomainProps,
} from '../datazone-l3-construct';
import { convertAuthorizationsToNamedPolicies, flattenDomainUnitPaths } from '../utils';

type DomainPropsWithAssociatedAccounts = DataZoneDomainProps | SageMakerDomainProps;
export interface CreatedDomainUnit {
  readonly construct: DataZoneDomainUnitConstruct;
  readonly domainUnits?: { [name: string]: CreatedDomainUnit };
}
export interface CommonDomainHelperProps {
  readonly naming: IMdaaResourceNaming;
  readonly roleHelper: MdaaRoleHelper;
  readonly l3Construct: MdaaL3Construct;
  readonly account: string;
  readonly region: string;
  readonly partition: string;
  readonly glueCatalogKmsKeyArn?: string;
}

export class CommonDomainHelper {
  protected readonly props: CommonDomainHelperProps;

  constructor(props: CommonDomainHelperProps) {
    this.props = props;
  }

  /**
   * Builds the version-appropriate project creation policy
   * (CREATE_PROJECT for V1, CREATE_PROJECT_FROM_PROJECT_PROFILE for V2)
   * with includeChildDomainUnits enabled.
   */
  private static buildProjectCreationPolicy(
    principal: PolicyPrincipal,
    domainVersion: 'V1' | 'V2',
  ): NamedAuthorizationPolicies {
    return domainVersion === 'V1'
      ? {
          'create-project': {
            policyType: 'CREATE_PROJECT',
            principals: [principal],
            includeChildDomainUnits: true,
          },
        }
      : {
          'create-project-from-profile': {
            policyType: 'CREATE_PROJECT_FROM_PROJECT_PROFILE',
            principals: [principal],
            includeChildDomainUnits: true,
          },
        };
  }

  /**
   * Builds the standard set of authorization policies automatically granted to owners.
   * Owners receive ADD_TO_PROJECT_MEMBER_POOL and a version-appropriate project creation
   * policy (CREATE_PROJECT for V1, CREATE_PROJECT_FROM_PROJECT_PROFILE for V2)
   * with includeChildDomainUnits enabled.
   */
  private static buildOwnerAuthorizationPolicies(
    principal: PolicyPrincipal,
    domainVersion: 'V1' | 'V2',
  ): NamedAuthorizationPolicies {
    return {
      'project-membership': {
        policyType: 'ADD_TO_PROJECT_MEMBER_POOL',
        principals: [principal],
        includeChildDomainUnits: true,
      },
      ...CommonDomainHelper.buildProjectCreationPolicy(principal, domainVersion),
    };
  }

  // Creates KMS key with cross-account access policies for DataZone
  public createDomainKmsKey(
    scope: Construct,
    domainName: string,
    domainProps: DomainPropsWithAssociatedAccounts,
    dataAdminRole: MdaaResolvableRole,
  ): IKey {
    const kmsKey = new MdaaKmsKey(scope, `${domainName}-cmk`, {
      naming: this.props.naming,
      alias: domainName,
      keyAdminRoleIds: [dataAdminRole.id()],
    });

    // Grant key access to all associated accounts via DataZone service
    const keyAccessAccounts = [
      ...Object.entries(domainProps.associatedAccounts || {}).map(
        (x: [string, unknown]) => (x[1] as AssociatedAccountProps).account,
      ),
      this.props.account,
    ];

    for (const account of keyAccessAccounts) {
      const datazoneKeyUsagePolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: [...USER_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
      });
      datazoneKeyUsagePolicyStatement.addAnyPrincipal();
      datazoneKeyUsagePolicyStatement.addCondition('StringEquals', {
        'kms:CallerAccount': account,
        'kms:ViaService': `datazone.${this.props.region}.amazonaws.com`,
      });
      kmsKey.addToResourcePolicy(datazoneKeyUsagePolicyStatement);

      const s3KeyUsagePolicyStatement = new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: [...USER_ACTIONS, 'kms:DescribeKey', 'kms:CreateGrant'],
      });
      s3KeyUsagePolicyStatement.addAnyPrincipal();
      s3KeyUsagePolicyStatement.addCondition('StringEquals', {
        'kms:CallerAccount': account,
        'kms:ViaService': `s3.${this.props.region}.amazonaws.com`,
      });
      kmsKey.addToResourcePolicy(s3KeyUsagePolicyStatement);
    }

    return kmsKey;
  }

  // Creates execution role for DataZone domain with version-specific managed policy
  public createExecutionRole(
    scope: Construct,
    domainName: string,
    kmsKey: IKey,
    domainVersion: 'V1' | 'V2',
    sagemakerDomainExecutionRole?: MdaaRoleRef,
  ): IRole {
    // Import existing execution role if provided
    if (sagemakerDomainExecutionRole) {
      return Role.fromRoleArn(
        scope,
        `${domainName}-execution-role-import`,
        this.props.roleHelper.resolveRoleRefWithRefId(sagemakerDomainExecutionRole, 'execution').arn(),
      );
    }

    // Create execution role with DataZone service principal and conditions
    const executionRoleCondition: Conditions = {
      StringEquals: {
        'aws:SourceAccount': this.props.account,
      },
      'ForAllValues:StringLike': {
        'aws:TagKeys': 'datazone*',
      },
    };

    const executionRole = new MdaaRole(scope, `${domainName}-execution-role`, {
      naming: this.props.naming,
      roleName: `${domainName}-execution-role`,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition),
      managedPolicies: [
        domainVersion == 'V2'
          ? MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/SageMakerStudioDomainExecutionRolePolicy')
          : MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDataZoneDomainExecutionRolePolicy'),
      ],
    });

    // Add TagSession permission for DataZone service
    executionRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:TagSession'],
        principals: [new ServicePrincipal('datazone.amazonaws.com').withConditions(executionRoleCondition)],
      }),
    );

    // Grant KMS permissions for domain encryption
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [kmsKey.keyArn],
      }),
    );

    // Grant S3 Access Grants permissions
    executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:CreateAccessGrantsLocation',
          's3:DeleteAccessGrantsLocation',
          's3:GetAccessGrantsLocation',
          's3:ListAccessGrantsLocations',
        ],
        resources: ['*'],
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
          id: 'AwsSolutions-IAM5',
          reason: 'S3 object names not known at deployment time. Access limited to domain bucket.',
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

  // Creates user and group profiles, assigns owners to root domain unit
  public createDomainUsersGroupsOwners(
    scope: Construct,
    domainName: string,
    domainProps: BaseDomainProps,
    domain: CfnDomain,
    domainVersion: 'V1' | 'V2',
  ): ProfileManagementConstruct {
    // Map users to their identifiers (IAM role ARN or SSO ID)
    const users = Object.fromEntries(
      Object.entries(domainProps.users || {}).map(([userName, userProps]) => {
        const userIdentifier = userProps.iamRole
          ? this.props.roleHelper.resolveRoleRefWithRefId(userProps.iamRole, userName).arn()
          : userProps.ssoId;
        const userType: 'IAM_ROLE' | 'SSO_USER' = userProps.iamRole ? 'IAM_ROLE' : 'SSO_USER';

        if (!userType || !userIdentifier) {
          throw new Error(`One of user iamRole or ssoId must be specified in user props for user ${userName}`);
        }

        return [userName, { identifier: userIdentifier, userType: userType }];
      }),
    );

    // Map groups to their SSO IDs
    const groups = Object.fromEntries(
      Object.entries(domainProps.groups || {}).map(([groupName, groupProps]) => [
        groupName,
        { identifier: groupProps.ssoId },
      ]),
    );

    // Create user and group profiles in DataZone
    const profileManagement = new ProfileManagementConstruct(scope, `${domainName}-profiles`, {
      naming: this.props.naming,
      domainId: domain.attrId,
      domainName: domainName,
      users: users,
      groups: groups,
      domainVersion: domainVersion,
    });

    // Assign user owners to root domain unit
    domainProps.ownerUsers?.forEach(ownerName => {
      const ownerUser = profileManagement.userProfiles[ownerName];
      if (!ownerUser) {
        throw new Error(`Unknown owner user ${ownerName} on domain ${domainName}`);
      }
      const cfnOwnerProps: CfnOwnerProps = {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: EntityType.DOMAIN_UNIT,
        owner: {
          user: {
            userIdentifier: ownerUser.attrId,
          },
        },
      };
      new CfnOwner(domain, `owner-user-${ownerName}`, cfnOwnerProps);
      const userPrincipal: PolicyPrincipal = { userIdentifier: { name: ownerName, identifier: ownerUser.attrId } };
      this.createAuthorizationPolicies(
        `owner-auths-${ownerName}`,
        domain,
        domain.attrId,
        domain.attrRootDomainUnitId,
        CommonDomainHelper.buildOwnerAuthorizationPolicies(userPrincipal, domainVersion),
        domainProps,
      );
    });

    // Assign group owners to root domain unit
    domainProps.ownerGroups?.forEach(ownerName => {
      const ownerGroup = profileManagement.groupProfiles[ownerName];
      if (!ownerGroup) {
        throw new Error(`Unknown owner group ${ownerName} on domain ${domainName}`);
      }
      const cfnOwnerProps: CfnOwnerProps = {
        domainIdentifier: domain.attrId,
        entityIdentifier: domain.attrRootDomainUnitId,
        entityType: EntityType.DOMAIN_UNIT,
        owner: {
          group: {
            groupIdentifier: ownerGroup.attrId,
          },
        },
      };
      new CfnOwner(domain, `owner-group-${ownerName}`, cfnOwnerProps);
      const groupPrincipal: PolicyPrincipal = { groupIdentifier: { name: ownerName, identifier: ownerGroup.attrId } };
      this.createAuthorizationPolicies(
        `owner-auths-${ownerName}`,
        domain,
        domain.attrId,
        domain.attrRootDomainUnitId,
        CommonDomainHelper.buildOwnerAuthorizationPolicies(groupPrincipal, domainVersion),
        domainProps,
      );
    });

    // Apply simplified authorizations and explicit authorizationPolicies to root domain unit
    const rootSimplifiedPolicies = convertAuthorizationsToNamedPolicies(domainProps.authorizations, domainVersion);
    const rootAuthPolicies: NamedAuthorizationPolicies | undefined = {
      ...rootSimplifiedPolicies,
      ...domainProps.authorizationPolicies,
    };
    if (rootAuthPolicies && Object.keys(rootAuthPolicies).length > 0) {
      this.createAuthorizationPolicies(
        'root-authorization-policies',
        domain,
        domain.attrId,
        domain.attrRootDomainUnitId,
        rootAuthPolicies,
        domainProps,
      );
    }

    return profileManagement;
  }

  // Recursively creates domain units with ownership and user/group assignments
  public createDomainUnits(
    scope: Construct,
    domainId: string,
    parentDomainId: string,
    domainVersion: 'V1' | 'V2',
    userProfiles: {
      domainUsers: { [name: string]: CfnUserProfile };
      domainGroups: { [name: string]: CfnGroupProfile };
      dataAdminUserProfile: CfnUserProfile;
      associatedAccountCdkUserProfiles: { [name: string]: CfnUserProfile };
    },
    domainUnits?: NamedDomainUnits,
    ownersCollector?: CfnOwner[],
  ): { [name: string]: CreatedDomainUnit } {
    return Object.fromEntries(
      Object.entries(domainUnits ?? {}).map(([domainUnitName, domainUnitProps]) => {
        // Create domain unit with ownership configuration
        const idPrefix = domainVersion == 'V1' ? `parent-` : '';
        const domainUnitConstruct = new DataZoneDomainUnitConstruct(
          scope,
          `${idPrefix}domain-unit-${domainUnitName}`,
          {
            naming: this.props.naming,
            domainId: domainId,
            parentDomainUnitId: parentDomainId,
            name: domainUnitName,
            description: domainUnitProps.description,
            ownership: {
              ownerAccounts: domainUnitProps.ownerAccounts,
              ownerUsers: domainUnitProps.ownerUsers,
              ownerGroups: domainUnitProps.ownerGroups,
            },
            dataAdminUserProfile: userProfiles.dataAdminUserProfile,
            userProfiles: userProfiles.domainUsers,
            groupProfiles: userProfiles.domainGroups,
            associatedAccountUserProfiles: userProfiles.associatedAccountCdkUserProfiles,
            domainVersion: domainVersion,
          },
          ownersCollector || [],
        );

        // Recursively create child domain units
        const childDomainUnits = this.createDomainUnits(
          domainUnitConstruct.domainUnit,
          domainId,
          domainUnitConstruct.domainUnitId,
          domainVersion,
          {
            domainUsers: userProfiles.domainUsers,
            domainGroups: userProfiles.domainGroups,
            dataAdminUserProfile: userProfiles.dataAdminUserProfile,
            associatedAccountCdkUserProfiles: userProfiles.associatedAccountCdkUserProfiles,
          },
          domainUnitProps.domainUnits,
          ownersCollector,
        );
        return [domainUnitName, { construct: domainUnitConstruct, domainUnits: childDomainUnits }];
      }),
    );
  }

  // Creates managed policy for KMS key usage with domain and Glue catalog access
  public createDomainKmsUsagePolicy(
    scope: Construct,
    domainName: string,
    policyName: string,
    kmsConfig: {
      keyAccessAccounts: string[];
      domainKmsKeyArn: string;
      glueCatalogKmsKeyArns: string[];
    },
  ) {
    const kmsUsagePolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: policyName,
      verbatimPolicyName: true,
    };
    const domainKmsUsagePolicy = new MdaaManagedPolicy(
      scope,
      `domain-kms-managed-policy-${domainName}`,
      kmsUsagePolicyProps,
    );

    // Allow decrypt and generate data key for domain KMS key with DataZone context
    const domainKeyDecryptStatement = new PolicyStatement({
      sid: 'DomainKmsUsage',
      effect: Effect.ALLOW,
      resources: [kmsConfig.domainKmsKeyArn],
      actions: [...USER_ACTIONS, 'kms:DescribeKey'],
    });
    domainKmsUsagePolicy.addStatements(domainKeyDecryptStatement);

    // Allow describing Glue catalog KMS keys
    const glueCatalogDescribeStatement = new PolicyStatement({
      sid: 'GlueKmsDescribe',
      effect: Effect.ALLOW,
      resources: kmsConfig.glueCatalogKmsKeyArns,
      actions: ['kms:DescribeKey'],
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDescribeStatement);

    // Allow decrypting Glue catalog data with catalog ID context
    const glueCatalogDecryptStatement = new PolicyStatement({
      sid: 'GlueKmsDecrypt',
      effect: Effect.ALLOW,
      resources: kmsConfig.glueCatalogKmsKeyArns,
      actions: ['kms:Decrypt'],
      conditions: {
        StringEquals: {
          'kms:EncryptionContext:glue_catalog_id': kmsConfig.keyAccessAccounts,
        },
      },
    });
    domainKmsUsagePolicy.addStatements(glueCatalogDecryptStatement);

    return domainKmsUsagePolicy;
  }

  // Creates managed policy for KMS key admin operations (CreateGrant)
  public createDomainKmsAdminPolicy(
    scope: Construct,
    domainName: string,
    policyName: string,
    kmsConfig: {
      account: string;
      region: string;
      domainKmsKeyArn: string;
    },
  ) {
    const kmsAdminPolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: policyName,
      verbatimPolicyName: true,
    };
    const domainKmsAdminPolicy = new MdaaManagedPolicy(
      scope,
      `domain-kms-admin-policy-${domainName}`,
      kmsAdminPolicyProps,
    );

    // Allow creating grants for DataZone service
    const domainKeyGrantStatement = new PolicyStatement({
      sid: 'DomainKmsCreateGrant',
      effect: Effect.ALLOW,
      resources: [kmsConfig.domainKmsKeyArn],
      actions: ['kms:CreateGrant'],
      conditions: {
        StringLike: {
          'kms:CallerAccount': kmsConfig.account,
          'kms:ViaService': `datazone.${kmsConfig.region}.amazonaws.com`,
        },
        Bool: {
          'kms:GrantIsForAWSResource': 'true',
        },
        'ForAnyValue:StringEquals': {
          'kms:EncryptionContextKeys': 'aws:datazone:domainId',
        },
      },
    });
    domainKmsAdminPolicy.addStatements(domainKeyGrantStatement);

    return domainKmsAdminPolicy;
  }

  // Creates managed policy for S3 bucket read/write access
  public createDomainBucketUsagePolicy(
    scope: Construct,
    domainName: string,
    policyName: string,
    domainBucket: IBucket,
  ) {
    const bucketUsagePolicyProps: MdaaManagedPolicyProps = {
      naming: this.props.naming,
      managedPolicyName: policyName,
      verbatimPolicyName: true,
    };
    const domainBucketUsagePolicy = new MdaaManagedPolicy(
      scope,
      `domain-bucket-managed-policy-${domainName}`,
      bucketUsagePolicyProps,
    );

    // Allow read/write operations on domain bucket
    const domainBucketReadWriteStatement = new PolicyStatement({
      sid: 'DomainBucketRead',
      effect: Effect.ALLOW,
      resources: [domainBucket.bucketArn, domainBucket.arnForObjects('*')],
      actions: ['s3:GetObject', 's3:GetObjectVersion', 's3:PutObject', 's3:PutObjectTagging', 's3:DeleteObject'],
    });
    domainBucketUsagePolicy.addStatements(domainBucketReadWriteStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(domainBucketUsagePolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'S3 object names not known at deployment time. Access limited to domain bucket.',
      },
    ]);

    return domainBucketUsagePolicy;
  }

  // Creates Lambda execution role for custom resources with DataZone and KMS permissions
  public createCustomResourceRole(
    scope: Construct,
    domainName: string,
    roleName: string,
    account: string,
    allowedPolicyArns: string[],
  ) {
    const customResourceRole = new MdaaRole(scope, 'custom-resource-role', {
      naming: this.props.naming,
      roleName: roleName,
      verbatimRoleName: true,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const statements: PolicyStatement[] = [
      // DataZone read permissions
      new PolicyStatement({
        resources: ['*'],
        actions: [
          'datazone:GetDomain',
          'datazone:ListEnvironments',
          'datazone:GetEnvironment',
          'datazone:ListConnections',
          'datazone:GetUserProfile',
        ],
      }),
      // iam:GetRole needed by DataZone API calls (aws:ViaAWSService used instead of
      // aws:CalledVia as IAM global endpoint calls don't reliably propagate CalledVia)
      new PolicyStatement({
        resources: ['*'],
        actions: ['iam:GetRole'],
        conditions: {
          Bool: {
            'aws:ViaAWSService': 'true',
          },
        },
      }),
    ];

    // Only add iam:AttachRolePolicy when there are authorized policy ARNs
    if (allowedPolicyArns.length > 0) {
      statements.push(
        new PolicyStatement({
          resources: [`arn:${this.props.partition}:iam::${account}:role/datazone_usr_role_*`],
          actions: ['iam:AttachRolePolicy'],
          conditions: {
            ArnLike: {
              'iam:PolicyARN': allowedPolicyArns,
            },
          },
        }),
      );
    }

    const customResourcePolicy = new MdaaManagedPolicy(scope, `custom-resource-policy-${domainName}`, {
      naming: this.props.naming,
      managedPolicyName: `custom-resource-${domainName}`,
      statements: statements,
    });

    customResourcePolicy.attachToRole(customResourceRole);

    MdaaNagSuppressions.addCodeResourceSuppressions(customResourcePolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'datazone:Get*/List* do not support resource-level permissions ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondatazone.html). ' +
          'iam:GetRole does not support resource-level permissions ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_iam.html) ' +
          'and is further scoped via aws:ViaAWSService condition.',
      },
    ]);
    return customResourceRole;
  }

  // Enables and configures an environment blueprint for the domain
  public createManagedBlueprintConfiguration(
    scope: Construct,
    blueprintConfig: {
      account: string;
      region: string;
      domainName: string;
      domainId: string;
      domainVersion: 'V1' | 'V2';
      blueprintName: string;
      lakeformationManageAccessRole?: IRole;
      regionalParameters?: CfnEnvironmentBlueprintConfiguration.RegionalParameterProperty[];
      authorizedDomainUnits?: { [name: string]: string };
      provisioningRole?: IRole;
    },
  ) {
    const idPrefix = blueprintConfig.domainVersion == 'V1' ? `parent-` : '';
    return new DataZoneManagedBlueprintConfigConstruct(
      scope,
      `${idPrefix}env-blueprint-config-${blueprintConfig.domainName}-${blueprintConfig.blueprintName}`,
      {
        naming: this.props.naming,
        domainName: blueprintConfig.domainName,
        blueprintName: blueprintConfig.blueprintName,
        enabledRegions: [blueprintConfig.region],
        manageAccessRole: blueprintConfig.lakeformationManageAccessRole,
        provisioningRole: blueprintConfig.provisioningRole,
        regionalParameters: blueprintConfig.regionalParameters,
        authorizedDomainUnits: blueprintConfig.authorizedDomainUnits,
        account: blueprintConfig.account,
        domainId: blueprintConfig.domainId,
        domainVersion: blueprintConfig.domainVersion,
      },
    );
  }

  // Creates RAM share for domain and CDK user profiles for associated accounts
  public createAccountAssociations(
    scope: Construct,
    domainName: string,
    domainProps: DataZoneDomainProps,
    domain: CfnDomain,
    domainVersion: 'V1' | 'V2',
  ): { [name: string]: CfnUserProfile } {
    if (domainProps.associatedAccounts) {
      // Select RAM permission ARN based on domain version
      const permissionArns =
        domainVersion == 'V1'
          ? ['arn:aws:ram::aws:permission/AWSRAMDefaultPermissionAmazonDataZoneDomain']
          : ['arn:aws:ram::aws:permission/AWSRAMPermissionsAmazonDatazoneDomainExtendedServiceAccess'];

      // Create RAM share for domain with associated accounts
      const domainramShareProps: CfnResourceShareProps = {
        name: `DataZone-${this.props.naming.resourceName()}-${domain.attrId}`,
        resourceArns: [domain.attrArn],
        principals: Array.from(new Set(Object.entries(domainProps.associatedAccounts).map(x => x[1].account))),
        permissionArns: permissionArns,
      };
      const domainRamShare = new CfnResourceShare(scope, `domain-ram-share-${domainName}`, domainramShareProps);

      // Create CDK user profiles for associated accounts that need them
      const associatedAccountCdkUserProfiles = Object.fromEntries(
        Object.entries(domainProps.associatedAccounts || {})
          .filter(associatedAccountProps => {
            return associatedAccountProps[1].createCdkUser;
          })
          .map(([associatedAccountName, associatedAccountProps]) => {
            // Wait for RAM association to complete before creating user profile
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
                `arn:${this.props.partition}:iam::${associatedAccountProps.account}:role/cdk-hnb659fds-cfn-exec-role-${associatedAccountProps.account}-${this.props.region}`,
              userType: 'IAM_ROLE',
              status: 'ACTIVATED',
            };
            const associatedAccountCdkUserProfile = new CfnUserProfile(
              scope,
              `${domainName}-${associatedAccountName}-cdk-user-profile`,
              accountCdkUserProfileProps,
            );
            associatedAccountCdkUserProfile.node.addDependency(associatedAccountRamShareMonitor);
            return [associatedAccountName, associatedAccountCdkUserProfile];
          }),
      );

      // Assign account CDK users as owners to root domain unit
      domainProps.ownerAccounts?.forEach(ownerName => {
        const ownerUser = associatedAccountCdkUserProfiles[ownerName];
        if (!ownerUser) {
          throw new Error(`Unknown owner account cdk user ${ownerName} on domain ${domainName}`);
        }
        const cfnOwnerProps: CfnOwnerProps = {
          domainIdentifier: domain.attrId,
          entityIdentifier: domain.attrRootDomainUnitId,
          entityType: EntityType.DOMAIN_UNIT,
          owner: {
            user: {
              userIdentifier: ownerUser.attrId,
            },
          },
        };
        new CfnOwner(domain, `owner-cdk-user-${ownerName}`, cfnOwnerProps);
        const accountPrincipal: PolicyPrincipal = {
          userIdentifier: { name: ownerName, identifier: ownerUser.attrId },
        };
        this.createAuthorizationPolicies(
          `owner-account-auths-${ownerName}`,
          domain,
          domain.attrId,
          domain.attrRootDomainUnitId,
          CommonDomainHelper.buildOwnerAuthorizationPolicies(accountPrincipal, domainVersion),
          domainProps,
        );
      });
      return associatedAccountCdkUserProfiles;
    }
    return {};
  }

  // Returns Glue catalog ARNs for a given account
  public createDzGlueAccountStatementResources(account: string): string[] {
    return [
      `arn:${this.props.partition}:glue:${this.props.region}:${account}:catalog`,
      `arn:${this.props.partition}:glue:${this.props.region}:${account}:database/*`,
      `arn:${this.props.partition}:glue:${this.props.region}:${account}:table/*`,
      `arn:${this.props.partition}:glue:${this.props.region}:${account}:tableVersion/*`,
    ];
  }

  // Creates custom resource to monitor RAM share association status
  public getRamAssociationMonitor(
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
      code: Code.fromAsset(`${__dirname}/../../src/lambda/monitor_ram_association`),
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

  // Recursively creates authorization policies for domain units
  public createDomainUnitsAuthorizationPolicies(
    scope: Construct,
    domainId: string,
    userProfiles: {
      domainUsers: { [name: string]: CfnUserProfile };
      domainGroups: { [name: string]: CfnGroupProfile };
      associatedAccountCdkUserProfiles: { [name: string]: CfnUserProfile };
    },
    domainVersion: 'V1' | 'V2',
    domainUnits?: NamedDomainUnits,
    createdDomainUnits?: { [name: string]: CreatedDomainUnit },
    domainProps?: DataZoneDomainProps,
  ): void {
    Object.entries(domainUnits ?? {}).forEach(([domainUnitName, domainUnitProps]) => {
      const domainUnit = createdDomainUnits?.[domainUnitName];
      if (!domainUnit) {
        throw new Error(`Domain unit '${domainUnitName}' not found in created domain units`);
      }

      const allowAllUsersPrincipal: PolicyPrincipal | undefined = domainUnitProps.allowAllUsers
        ? {
            allUsersGrantFilter: true,
          }
        : undefined;

      const allowedUserPrincipals = domainUnitProps.allowedUsers?.map(username => {
        return {
          userName: username,
        };
      });

      const allowedGroupsPrincipals = domainUnitProps.allowedGroups?.map(groupName => {
        return {
          groupName: groupName,
        };
      });

      // Emit deprecation warnings for legacy properties
      if (domainUnitProps.allowAllUsers) {
        Annotations.of(this.props.l3Construct).addWarningV2(
          `@aws-mdaa/datazone-l3-construct:allowAllUsersDeprecated:${domainUnitName}`,
          `Domain unit '${domainUnitName}': 'allowAllUsers' is deprecated and will be removed in v1.8.0. Use 'authorizations.eligibleProjectMembers.all: true' instead.`,
        );
      }
      if (domainUnitProps.allowedUsers) {
        Annotations.of(this.props.l3Construct).addWarningV2(
          `@aws-mdaa/datazone-l3-construct:allowedUsersDeprecated:${domainUnitName}`,
          `Domain unit '${domainUnitName}': 'allowedUsers' is deprecated and will be removed in v1.8.0. Use 'authorizations.eligibleProjectMembers.users' instead.`,
        );
      }
      if (domainUnitProps.allowedGroups) {
        Annotations.of(this.props.l3Construct).addWarningV2(
          `@aws-mdaa/datazone-l3-construct:allowedGroupsDeprecated:${domainUnitName}`,
          `Domain unit '${domainUnitName}': 'allowedGroups' is deprecated and will be removed in v1.8.0. Use 'authorizations.eligibleProjectMembers.groups' instead.`,
        );
      }

      const allowedUserGroupsPolicy: NamedAuthorizationPolicies | undefined =
        allowedUserPrincipals || allowedGroupsPrincipals || allowAllUsersPrincipal
          ? {
              'allowed-users-groups': {
                policyType: 'ADD_TO_PROJECT_MEMBER_POOL',
                principals: [
                  ...(allowedUserPrincipals || []),
                  ...(allowedGroupsPrincipals || []),
                  ...(allowAllUsersPrincipal ? [allowAllUsersPrincipal] : []),
                ],
                includeChildDomainUnits: true,
              },
            }
          : undefined;
      const simplifiedPolicies = convertAuthorizationsToNamedPolicies(domainUnitProps.authorizations, domainVersion);

      // Build owner auto-grant policies for this domain unit
      const ownerUserPolicies: NamedAuthorizationPolicies = Object.fromEntries(
        (domainUnitProps.ownerUsers ?? []).flatMap(ownerName => {
          const ownerUser = userProfiles.domainUsers[ownerName];
          if (!ownerUser) return [];
          const principal: PolicyPrincipal = { userIdentifier: { name: ownerName, identifier: ownerUser.attrId } };
          return Object.entries(CommonDomainHelper.buildOwnerAuthorizationPolicies(principal, domainVersion)).map(
            ([key, policy]) => [`owner-user-${ownerName}-${key}`, policy],
          );
        }),
      );
      const ownerGroupPolicies: NamedAuthorizationPolicies = Object.fromEntries(
        (domainUnitProps.ownerGroups ?? []).flatMap(ownerName => {
          const ownerGroup = userProfiles.domainGroups[ownerName];
          if (!ownerGroup) return [];
          const principal: PolicyPrincipal = {
            groupIdentifier: { name: ownerName, identifier: ownerGroup.attrId },
          };
          return Object.entries(CommonDomainHelper.buildOwnerAuthorizationPolicies(principal, domainVersion)).map(
            ([key, policy]) => [`owner-group-${ownerName}-${key}`, policy],
          );
        }),
      );
      const ownerAccountPolicies: NamedAuthorizationPolicies = Object.fromEntries(
        (domainUnitProps.ownerAccounts ?? []).flatMap(ownerName => {
          const ownerUser = userProfiles.associatedAccountCdkUserProfiles[ownerName];
          if (!ownerUser) return [];
          const principal: PolicyPrincipal = { userIdentifier: { name: ownerName, identifier: ownerUser.attrId } };
          return Object.entries(CommonDomainHelper.buildOwnerAuthorizationPolicies(principal, domainVersion)).map(
            ([key, policy]) => [`owner-account-${ownerName}-${key}`, policy],
          );
        }),
      );

      const authPolicies: NamedAuthorizationPolicies | undefined = {
        ...ownerUserPolicies,
        ...ownerGroupPolicies,
        ...ownerAccountPolicies,
        ...allowedUserGroupsPolicy,
        ...simplifiedPolicies,
        ...domainUnitProps.authorizationPolicies,
      };
      // Create authorization policies for this domain unit
      if (authPolicies && Object.keys(authPolicies).length > 0) {
        this.createAuthorizationPolicies(
          'authorization-policies',
          domainUnit.construct,
          domainId,
          domainUnit.construct.domainUnitId,
          authPolicies,
          domainProps,
        );
      }

      // Recursively process child domain units
      if (domainUnitProps.domainUnits && createdDomainUnits?.[domainUnitName]?.domainUnits) {
        this.createDomainUnitsAuthorizationPolicies(
          scope,
          domainId,
          userProfiles,
          domainVersion,
          domainUnitProps.domainUnits,
          createdDomainUnits[domainUnitName].domainUnits,
          domainProps,
        );
      }
    });
  }

  // Wraps authorization construct creation with error handling
  protected createAuthorizationPolicies(
    id: string,
    scope: Construct,
    domainId: string,
    entityId: string,
    policies: Record<string, AuthorizationPolicy>,
    domainProps?: DataZoneDomainProps,
  ): DataZoneAuthorizationConstruct {
    try {
      const authorizationConstruct = this.createDataZoneAuthorizationConstruct(
        id,
        scope,
        domainId,
        entityId,
        policies,
        domainProps,
      );

      return authorizationConstruct;
    } catch (error) {
      throw new Error(
        `Authorization policies creation failed for domain unit '${entityId}': ${
          error instanceof Error ? error.message : String(error)
        }. CloudFormation deployment may fail. Please check your configuration and try again.`,
      );
    }
  }

  // Creates DataZone authorization construct with resolved user/group/account identifiers
  private createDataZoneAuthorizationConstruct(
    id: string,
    scope: Construct,
    domainId: string,
    entityId: string,
    policies: Record<string, AuthorizationPolicy>,
    domainProps?: DataZoneDomainProps,
  ): DataZoneAuthorizationConstruct {
    // Resolve user identifiers from IAM roles or SSO IDs
    const userIdentifiers: { [name: string]: string } = Object.fromEntries(
      Object.entries(domainProps?.users ?? {})
        .map(([userName, userProps]) => {
          const userIdentifier = userProps.iamRole
            ? this.props.roleHelper.resolveRoleRefWithRefId(userProps.iamRole, userName).arn()
            : userProps.ssoId;
          return [userName, userIdentifier];
        })
        .filter(([, identifier]) => identifier),
    );

    // Resolve group identifiers from SSO IDs
    const groupIdentifiers: { [name: string]: string } = Object.fromEntries(
      Object.entries(domainProps?.groups ?? {}).map(([groupName, groupProps]) => [groupName, groupProps.ssoId]),
    );

    // Resolve account identifiers from CDK role ARNs
    const accountIdentifiers: { [name: string]: string } = Object.fromEntries(
      Object.entries(domainProps?.associatedAccounts ?? {}).map(([accountName, accountProps]) => {
        const accountIdentifier =
          accountProps.cdkRoleArn ??
          `arn:${this.props.partition}:iam::${accountProps.account}:role/cdk-hnb659fds-cfn-exec-role-${accountProps.account}-${this.props.region}`;
        return [accountName, accountIdentifier];
      }),
    );

    try {
      return new DataZoneAuthorizationConstruct(scope, id, {
        naming: this.props.naming,
        domainId: domainId,
        entityId: entityId,
        entityType: EntityType.DOMAIN_UNIT,
        policies: policies,
        userIdentifiers: userIdentifiers,
        groupIdentifiers: groupIdentifiers,
        accountIdentifiers: accountIdentifiers,
      });
    } catch (error) {
      throw new Error(
        `Failed to create DataZoneAuthorizationConstruct for domain unit '${entityId}': ${
          error instanceof Error ? error.message : String(error)
        } This may indicate issues with principal resolution or policy configuration.`,
      );
    }
  }

  // Creates KMS key, S3 bucket, and resolves data admin role
  protected createDomainInfrastructure(scope: Construct, domainName: string, domainProps: BaseDomainProps) {
    const dataAdminRole = this.props.roleHelper.resolveRoleRefWithRefId(domainProps.dataAdminRole, 'admin');
    const kmsKey = this.createDomainKmsKey(scope, domainName, domainProps, dataAdminRole);

    return { dataAdminRole, kmsKey };
  }

  // Creates KMS and S3 bucket usage policies with Glue catalog access
  protected setupDomainAccessPolicies(
    scope: Construct,
    domainName: string,
    domainProps: DomainPropsWithAssociatedAccounts,
    kmsKey: IKey,
  ) {
    const associatedAccountGlueCatalogKmsKeyArns: string[] = Object.entries(domainProps.associatedAccounts || {}).map(
      ([accountName, accountProps]) => {
        return accountProps.glueCatalogKmsKeyArn
          ? accountProps.glueCatalogKmsKeyArn
          : MdaaStringParameter.fromStringParameterArn(
              scope,
              `${accountName}-glue-catalog-key-ssm`,
              `arn:${this.props.partition}:ssm:${this.props.region}:${accountProps.account}:parameter${GlueCatalogL3Construct.ACCOUNT_KEY_SSM_PATH}`,
            ).stringValue;
      },
    );
    // Collects Glue catalog KMS keys from associated accounts and main account
    const glueCatalogKmsKeyArns = [
      ...associatedAccountGlueCatalogKmsKeyArns,
      this.props.glueCatalogKmsKeyArn ||
        MdaaStringParameter.valueForStringParameter(scope, GlueCatalogL3Construct.ACCOUNT_KEY_SSM_PATH),
    ];

    // Collects all accounts that need KMS key access
    const keyAccessAccounts = [
      ...Array.from(
        new Set(
          Object.entries(domainProps.associatedAccounts || {}).map(
            (x: [string, unknown]) => (x[1] as AssociatedAccountProps).account,
          ),
        ),
      ),
      this.props.account,
    ];

    // Create KMS usage policy with domain and Glue catalog permissions
    const domainKmsUsagePolicyName = this.props.naming.resourceName(`domain-kms-use-${domainName}`);
    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(scope, domainName, domainKmsUsagePolicyName, {
      keyAccessAccounts,
      domainKmsKeyArn: kmsKey.keyArn,
      glueCatalogKmsKeyArns: glueCatalogKmsKeyArns,
    });

    const domainKmsAdminPolicyName = this.props.naming.resourceName(`domain-kms-admin-${domainName}`);
    const domainKmsAdminPolicy = this.createDomainKmsAdminPolicy(scope, domainName, domainKmsAdminPolicyName, {
      account: this.props.account,
      region: this.props.region,
      domainKmsKeyArn: kmsKey.keyArn,
    });

    // Create S3 bucket usage policy
    const domainBucketUsagePolicyName = this.props.naming.resourceName(`domain-bucket-use-${domainName}`);

    return {
      glueCatalogKmsKeyArns,
      keyAccessAccounts,
      domainKmsUsagePolicyName,
      domainKmsUsagePolicy,
      domainBucketUsagePolicyName,
      domainKmsAdminPolicyName,
      domainKmsAdminPolicy,
    };
  }

  // Creates user/group profiles, domain units, and applies authorization policies
  protected setupDomainGovernance(
    scope: Construct,
    domainName: string,
    domainProps: BaseDomainProps,
    domain: CfnDomain,
    domainVersion: 'V1' | 'V2',
    dataAdminUserProfile: CfnUserProfile,
    associatedAccountCdkUserProfiles: { [name: string]: CfnUserProfile },
  ) {
    // Create user and group profiles with ownership
    const profileManagement = this.createDomainUsersGroupsOwners(scope, domainName, domainProps, domain, domainVersion);

    // Build cfn-exec role principal — the service auto-creates this user profile,
    // but it has no authorization policies by default
    const cfnExecRoleArn =
      domainProps.cdkRoleArn ??
      `arn:${this.props.partition}:iam::${this.props.account}:role/cdk-hnb659fds-cfn-exec-role-${this.props.account}-${this.props.region}`;
    const cfnExecPrincipal: PolicyPrincipal = {
      userIdentifier: { name: 'cfn-exec', identifier: cfnExecRoleArn },
    };

    // Grant cfn-exec role project creation authorization on root domain unit (V1 only).
    // The service auto-grants ADD_TO_PROJECT_MEMBER_POOL and, for V2 domains,
    // CREATE_PROJECT_FROM_PROJECT_PROFILE to cfn-exec.
    if (domainVersion === 'V1') {
      this.createAuthorizationPolicies(
        'cfn-exec-root-auths',
        domain,
        domain.attrId,
        domain.attrRootDomainUnitId,
        CommonDomainHelper.buildProjectCreationPolicy(cfnExecPrincipal, 'V1'),
        domainProps,
      );
    }

    // Grant data admin owner-level authorizations on root domain unit
    const dataAdminPrincipal: PolicyPrincipal = {
      userIdentifier: { name: 'data-admin', identifier: dataAdminUserProfile.attrId },
    };
    this.createAuthorizationPolicies(
      'data-admin-root-auths',
      domain,
      domain.attrId,
      domain.attrRootDomainUnitId,
      CommonDomainHelper.buildOwnerAuthorizationPolicies(dataAdminPrincipal, domainVersion),
      domainProps,
    );

    // Create domain units hierarchy
    const createdDomainUnits = this.createDomainUnits(
      domain,
      domain.attrId,
      domain.attrRootDomainUnitId,
      domainVersion,
      {
        domainUsers: profileManagement.userProfiles,
        domainGroups: profileManagement.groupProfiles,
        dataAdminUserProfile: dataAdminUserProfile,
        associatedAccountCdkUserProfiles: associatedAccountCdkUserProfiles || {},
      },
      domainProps.domainUnits,
    );

    // Apply authorization policies if any are defined
    this.createDomainUnitsAuthorizationPolicies(
      domain,
      domain.attrId,
      {
        domainUsers: profileManagement.userProfiles,
        domainGroups: profileManagement.groupProfiles,
        associatedAccountCdkUserProfiles: associatedAccountCdkUserProfiles || {},
      },
      domainVersion,
      domainProps.domainUnits,
      createdDomainUnits,
      domainProps,
    );

    return { profileManagement, createdDomainUnits };
  }

  // Prepares domain unit IDs and Glue catalog ARNs for domain configuration
  protected prepareDomainConfigData(
    domain: CfnDomain,
    createdDomainUnits: { [name: string]: CreatedDomainUnit },
    domainProps: DomainPropsWithAssociatedAccounts,
  ) {
    // Flatten domain unit hierarchy into path-to-ID mapping
    const domainUnitIds: { [key: string]: string } = {
      '/root': domain.attrRootDomainUnitId,
      ...flattenDomainUnitPaths('', createdDomainUnits),
    };

    // Collect Glue catalog ARNs from all accounts
    const glueCatalogArns = [
      ...this.createDzGlueAccountStatementResources(this.props.account),
      ...Object.entries(domainProps.associatedAccounts || {}).flatMap((x: [string, unknown]) =>
        this.createDzGlueAccountStatementResources((x[1] as AssociatedAccountProps).account),
      ),
    ];

    return { domainUnitIds, glueCatalogArns };
  }

  // Sets up RAM sharing of domain config parameters with associated accounts
  protected setupCrossAccountResources(
    domainName: string,
    domainProps: DataZoneDomainProps,
    crossAccountConfig: {
      domain: CfnDomain;
      domainConfig: DomainConfig;
      policyNames: {
        kmsUsagePolicyName: string;
        kmsAdminPolicyName: string;
        bucket: string;
      };
      keyAccessAccounts: string[];
      createAssociatedAccountResources: (
        domainName: string,
        accountName: string,
        accountProps: AssociatedAccountProps,
        resourceConfig: {
          domainConfig: DomainConfig;
          kmsUsagePolicyName: string;
          kmsAdminPolicyName: string;
          bucketPolicy: string;
          keyAccounts: string[];
        },
      ) => void;
    },
  ) {
    if (!domainProps.associatedAccounts) return;

    // Create RAM share for domain config SSM parameters
    const configParamRamShareProps: CfnResourceShareProps = {
      name: this.props.naming.resourceName(`domain-config-ssm-${domainName}`),
      resourceArns: crossAccountConfig.domainConfig.configParamArns,
      principals: Object.entries(domainProps.associatedAccounts).map(x => x[1].account),
    };
    const configRamShare = new CfnResourceShare(
      this.props.l3Construct,
      `domain-config-ram-share-${domainName}`,
      configParamRamShareProps,
    );

    // Monitor RAM associations and create resources in each associated account
    for (const [accountName, accountProps] of Object.entries(domainProps.associatedAccounts)) {
      this.getRamAssociationMonitor(
        crossAccountConfig.domain,
        `domain-config-ram-association-monitor-${accountName}`,
        configRamShare,
        accountProps.account,
      );
      crossAccountConfig.createAssociatedAccountResources(domainName, accountName, accountProps, {
        domainConfig: crossAccountConfig.domainConfig,
        kmsUsagePolicyName: crossAccountConfig.policyNames.kmsUsagePolicyName,
        kmsAdminPolicyName: crossAccountConfig.policyNames.kmsAdminPolicyName,
        bucketPolicy: crossAccountConfig.policyNames.bucket,
        keyAccounts: crossAccountConfig.keyAccessAccounts,
      });
    }
  }

  // Parses domain config from SSM parameters in cross-account stack
  protected parseCrossAccountDomainConfig(
    crossAccountStack: Construct,
    domainName: string,
    region: string,
    domainConfigSsmParamBase: string,
  ) {
    const domainConfigSsmParamArn = `arn:${this.props.partition}:ssm:${region}:${this.props.account}:parameter${domainConfigSsmParamBase}`;
    return new DomainConfig(crossAccountStack, `domain-config-parser-${domainName}`, {
      ssmParamBase: domainConfigSsmParamArn,
      naming: this.props.naming,
    });
  }

  // Creates KMS and bucket usage policies in cross-account stack
  protected createCrossAccountPolicies(
    crossAccountStack: Construct,
    domainName: string,
    accountId: string,
    region: string,
    policyNames: { kmsUsage: string; kmsAdmin: string; bucket: string },
    keyAccessAccounts: string[],
    crossAccountDomainConfig: DomainConfig,
  ) {
    const domainBucketUsagePolicy = this.createDomainBucketUsagePolicy(
      crossAccountStack,
      domainName,
      policyNames.bucket,
      Bucket.fromBucketArn(
        crossAccountStack,
        `domain-bucket-import-${domainName}`,
        crossAccountDomainConfig.domainBucketArn,
      ),
    );
    const domainKmsUsagePolicy = this.createDomainKmsUsagePolicy(crossAccountStack, domainName, policyNames.kmsUsage, {
      keyAccessAccounts,
      domainKmsKeyArn: crossAccountDomainConfig.domainKmsKeyArn,
      glueCatalogKmsKeyArns: crossAccountDomainConfig.glueCatalogKmsKeyArns,
    });
    const domainKmsAdminPolicy = this.createDomainKmsAdminPolicy(crossAccountStack, domainName, policyNames.kmsAdmin, {
      account: accountId,
      region: region,
      domainKmsKeyArn: crossAccountDomainConfig.domainKmsKeyArn,
    });

    return { domainBucketUsagePolicy, domainKmsUsagePolicy, domainKmsAdminPolicy };
  }

  // Resolves LakeFormation manage access role from ARN or SSM parameter
  protected resolveLakeFormationRole(scope: Construct, domainName: string, roleArn?: string): IRole {
    return roleArn
      ? Role.fromRoleArn(scope, `lf-manage-access-role-import-${domainName}`, roleArn)
      : Role.fromRoleArn(
          scope,
          `lf-manage-access-role-import-${domainName}`,
          MdaaStringParameter.valueForStringParameter(
            scope,
            LakeFormationSettingsL3Construct.DZ_MANAGE_ACCESS_ROLE_SSM_PATH,
          ),
        );
  }

  // Creates domain config with common properties
  protected createDomainConfig(
    scope: Construct,
    domainName: string,
    domainResources: {
      domain: CfnDomain;
      domainVersion: 'V1' | 'V2';
      kmsKey: IKey;
      domainBucket: IBucket;
    },
    domainData: {
      domainUnitIds: { [name: string]: string };
      blueprintIds?: { [name: string]: string };
      glueCatalogKmsKeyArns: string[];
      glueCatalogArns: string[];
    },
    policies: {
      domainKmsUsagePolicy: MdaaManagedPolicy;
      domainBucketUsagePolicy: MdaaManagedPolicy;
    },
    customResourceRoleName: string,
  ): DomainConfig {
    const domainConfigProps: DomainConfigProps = {
      naming: this.props.naming,
      domainName: domainResources.domain.name,
      domainArn: domainResources.domain.attrArn,
      domainId: domainResources.domain.attrId,
      domainVersion: domainResources.domainVersion,
      domainKmsKeyArn: domainResources.kmsKey.keyArn,
      glueCatalogKmsKeyArns: domainData.glueCatalogKmsKeyArns,
      domainKmsUsagePolicyName: policies.domainKmsUsagePolicy.managedPolicyName,
      domainBucketUsagePolicyName: policies.domainBucketUsagePolicy.managedPolicyName,
      domainUnitIds: domainData.domainUnitIds,
      glueCatalogArns: domainData.glueCatalogArns,
      domainBucketArn: domainResources.domainBucket.bucketArn,
      ssmParamBase: this.props.naming.ssmPath(`domain/${domainName}/config`),
      customResourceRoleName,
      createConfigParams: true,
      blueprintIds: domainData.blueprintIds,
    };
    return new DomainConfig(scope, `domain-config-${domainName}`, domainConfigProps);
  }

  // Creates custom resource role and user profile
  protected createCustomResourceRoleAndProfile(
    scope: Construct,
    domainName: string,
    domain: CfnDomain,
    domainKmsUsagePolicy: ManagedPolicy,
    domainProps: BaseDomainProps,
  ): { roleName: string; role: IRole } {
    const customResourceRoleName = this.props.naming.resourceName(`${domainName}-custom-resource`, 64);
    const customResourceRole = this.createCustomResourceRole(
      scope,
      domainName,
      customResourceRoleName,
      this.props.account,
      [domainKmsUsagePolicy.managedPolicyArn],
    );

    domainKmsUsagePolicy.attachToRole(customResourceRole);
    const customResourceUserProfile = new CfnUserProfile(scope, 'custom-resource-user-profile', {
      domainIdentifier: domain.attrId,
      userIdentifier: customResourceRole.roleArn,
      userType: 'IAM_ROLE',
      status: 'ACTIVATED',
    });

    const authorizonPolicy: AuthorizationPolicy = {
      policyType: 'ADD_TO_PROJECT_MEMBER_POOL',
      principals: [{ userIdentifier: { name: 'custom-resource-user', identifier: customResourceUserProfile.attrId } }],
      includeChildDomainUnits: true,
    };
    this.createAuthorizationPolicies(
      `custom-resource-role-auth`,
      domain,
      domain.attrId,
      domain.attrRootDomainUnitId,
      { 'custom-resource-role-auth': authorizonPolicy },
      domainProps,
    );

    return { roleName: customResourceRoleName, role: customResourceRole };
  }
}
