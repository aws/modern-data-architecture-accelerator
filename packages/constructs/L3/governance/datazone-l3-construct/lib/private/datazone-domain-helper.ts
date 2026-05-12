/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataZoneDomainConstruct, DomainConfig } from '@aws-mdaa/datazone-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';

import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { CfnDomain } from 'aws-cdk-lib/aws-datazone';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { AssociatedAccountProps, DataZoneDomainProps } from '../datazone-l3-construct';
import { CommonDomainHelper, CommonDomainHelperProps } from './common-domain-helper';

export class DataZoneDomainHelper extends CommonDomainHelper {
  constructor(props: CommonDomainHelperProps) {
    super(props);
  }

  public createDataZoneDomain(
    domainName: string,
    domainProps: DataZoneDomainProps,
    lakeformationManageAccessRole: IRole,
  ) {
    const scope = this.props.l3Construct;
    // Create KMS key and resolve admin role
    const { dataAdminRole, kmsKey } = this.createDomainInfrastructure(scope, domainName, domainProps);
    const executionRole = this.createExecutionRole(scope, domainName, kmsKey, 'V1');

    // Create DataZone domain construct with V1 settings
    const domainConstruct = new DataZoneDomainConstruct(scope, `parent-${domainName}-domain`, {
      naming: this.props.naming,
      domainName: domainName,
      domainExecutionRole: executionRole,
      kmsKey: kmsKey,
      description: domainProps.description,
      singleSignOnType: domainProps.singleSignOnType,
      userAssignment: domainProps.userAssignment,
      domainVersion: 'V1',
      dataAdminRole: Role.fromRoleArn(scope, `data-admin-role-${domainName}`, dataAdminRole.arn()),
    });

    const domain = domainConstruct.domain;
    const dataAdminUserProfile = domainConstruct.dataAdminUserProfile;

    // Create domain bucket as child of domain construct
    const domainBucket = new MdaaBucket(domain, 'domain-bucket', {
      naming: this.props.naming,
      encryptionKey: kmsKey,
      bucketName: domainName,
    });

    // Create KMS policies and bucket policy
    const policies = this.setupDomainAccessPolicies(scope, domainName, domainProps, kmsKey);
    const domainBucketUsagePolicy = this.createDomainBucketUsagePolicy(
      scope,
      domainName,
      policies.domainBucketUsagePolicyName,
      domainBucket,
    );
    executionRole.addManagedPolicy(domainBucketUsagePolicy);
    lakeformationManageAccessRole.addManagedPolicy(policies.domainKmsUsagePolicy);
    executionRole.addManagedPolicy(policies.domainKmsUsagePolicy);

    // Create user/group profiles, domain units, and authorization policies
    const associatedAccountCdkUserProfiles = this.createAccountAssociations(
      scope,
      domainName,
      domainProps,
      domain,
      'V1',
    );
    const { createdDomainUnits } = this.setupDomainGovernance(
      scope,
      domainName,
      domainProps,
      domain,
      'V1',
      dataAdminUserProfile,
      associatedAccountCdkUserProfiles,
    );

    // Prepare domain config data and create DataZone-specific resources
    const { domainUnitIds, glueCatalogArns } = this.prepareDomainConfigData(domain, createdDomainUnits, domainProps);
    const domainConfig = this.createDataZoneResources(
      scope,
      domainName,
      domainProps,
      {
        domain,
        kmsKey,
        lakeformationManageAccessRole,
        domainBucket,
      },
      {
        domainUnitIds,
        glueCatalogKmsKeyArns: policies.glueCatalogKmsKeyArns,
        glueCatalogArns,
      },
      {
        domainKmsUsagePolicy: policies.domainKmsUsagePolicy,
        domainBucketUsagePolicy,
      },
    );

    // Setup cross-account sharing
    this.setupCrossAccountResources(domainName, domainProps, {
      domain,
      domainConfig,
      policyNames: {
        kmsUsagePolicyName: policies.domainKmsUsagePolicyName,
        kmsAdminPolicyName: policies.domainKmsAdminPolicyName,
        bucket: policies.domainBucketUsagePolicyName,
      },
      keyAccessAccounts: policies.keyAccessAccounts,
      createAssociatedAccountResources: this.createDataZoneAssociatedAccountStackResources.bind(this),
    });
  }

  private createDataZoneResources(
    scope: Construct,
    domainName: string,
    domainProps: DataZoneDomainProps,
    domainResources: {
      domain: CfnDomain;
      kmsKey: IKey;
      lakeformationManageAccessRole: IRole;
      domainBucket: IBucket;
    },
    domainData: {
      domainUnitIds: { [name: string]: string };
      glueCatalogKmsKeyArns: string[];
      glueCatalogArns: string[];
    },
    policies: {
      domainKmsUsagePolicy: MdaaManagedPolicy;
      domainBucketUsagePolicy: MdaaManagedPolicy;
    },
  ) {
    // Enable CustomAwsService blueprint for DataZone V1
    this.createManagedBlueprintConfiguration(domainResources.domain, {
      account: this.props.account,
      region: this.props.region,
      domainName,
      domainId: domainResources.domain.attrId,
      blueprintName: 'CustomAwsService',
      lakeformationManageAccessRole: domainResources.lakeformationManageAccessRole,
      domainVersion: 'V1',
    });

    // Create custom resource role and user profile
    const { roleName } = this.createCustomResourceRoleAndProfile(
      domainResources.domain,
      domainName,
      domainResources.domain,
      policies.domainKmsUsagePolicy,
      domainProps,
    );

    // Create and return domain configuration
    return this.createDomainConfig(
      scope,
      domainName,
      {
        domain: domainResources.domain,
        domainVersion: 'V1',
        kmsKey: domainResources.kmsKey,
        domainBucket: domainResources.domainBucket,
      },
      domainData,
      policies,
      roleName,
    );
  }

  private createDataZoneAssociatedAccountStackResources(
    domainName: string,
    associatedAccountName: string,
    associatedAccountProps: AssociatedAccountProps,
    resourceConfig: {
      domainConfig: DomainConfig;
      kmsUsagePolicyName: string;
      kmsAdminPolicyName: string;
      bucketPolicy: string;
      keyAccounts: string[];
    },
  ) {
    const region = associatedAccountProps.region || this.props.region;
    const crossAccountStack = this.props.l3Construct.getCrossAccountStack(associatedAccountProps.account, region);
    if (!crossAccountStack) {
      throw new Error(
        `Cross account stack not defined for associated account ${associatedAccountName}/${associatedAccountProps.account} on domain ${domainName}. Cross account association will not work.`,
      );
    }

    // Parse domain config from SSM parameters in cross-account
    const crossAccountDomainConfig = this.parseCrossAccountDomainConfig(
      crossAccountStack,
      domainName,
      region,
      resourceConfig.domainConfig.ssmParamBase,
    );

    // Create bucket and KMS usage policies in cross-account
    const { domainKmsUsagePolicy } = this.createCrossAccountPolicies(
      crossAccountStack,
      domainName,
      associatedAccountProps.account,
      region,
      {
        kmsUsage: resourceConfig.kmsUsagePolicyName,
        kmsAdmin: resourceConfig.kmsAdminPolicyName,
        bucket: resourceConfig.bucketPolicy,
      },
      resourceConfig.keyAccounts,
      crossAccountDomainConfig,
    );

    // Resolve or import LakeFormation manage access role
    const lakeformationManageAccessRole = this.resolveLakeFormationRole(
      crossAccountStack,
      domainName,
      associatedAccountProps.lakeformationManageAccessRoleArn,
    );
    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    // Enable CustomAwsService blueprint in cross-account
    this.createManagedBlueprintConfiguration(crossAccountStack, {
      account: associatedAccountProps.account,
      region: associatedAccountProps.region ?? this.props.region,
      domainName,
      domainVersion: 'V1',
      domainId: crossAccountDomainConfig.domainId,
      blueprintName: 'CustomAwsService',
      lakeformationManageAccessRole,
    });
  }
}
