/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import {
  AuthorizationPolicy,
  DataZoneDomainConstruct,
  DomainConfig,
  LEGACY_DATAZONE_SCOPE_CONTEXT_KEY,
  MdaaSageMakerCustomBlueprintConstruct,
  MdaaSageMakerCustomBlueprintConstructProps,
} from '@aws-mdaa/datazone-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey, USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Stack } from 'aws-cdk-lib';

import { MdaaL3Construct } from '@aws-mdaa/l3-construct/lib/l3construct';
import { CfnDomain, CfnEnvironmentBlueprintConfiguration, CfnUserProfile } from 'aws-cdk-lib/aws-datazone';
import { Conditions, Effect, IRole, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { CloudFormationTemplate } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import {
  CustomEnabledBlueprintProps,
  EnabledBlueprintProps,
  SageMakerAssociatedAccountProps,
  SageMakerDomainProps,
  ToolingBlueprintProps,
} from '../datazone-l3-construct';
import { CommonDomainHelper, CommonDomainHelperProps } from './common-domain-helper';

export class SageMakerDomainHelper extends CommonDomainHelper {
  private secondStageStack?: Stack;

  constructor(props: CommonDomainHelperProps) {
    super(props);
  }

  private mapAuthorizedDomainUnits(
    authorizedUnits: string[] | undefined,
    domainUnitIds: { [key: string]: string } | DomainConfig,
  ): { [key: string]: string } {
    const getUnitId = (unit: string): string | undefined => {
      return domainUnitIds instanceof DomainConfig ? domainUnitIds.getDomainUnitId(unit) : domainUnitIds[unit];
    };

    return Object.fromEntries(
      (authorizedUnits ?? ['/root'])
        .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
        .map(unit => [unit, getUnitId(unit)])
        .filter(([_unit, id]) => id !== undefined),
    );
  }

  public createSageMakerDomains(
    scope: Construct,
    sageMakerDomainBuildProps: { [name: string]: SageMakerDomainProps },
    lakeformationManageAccessRole: IRole,
  ) {
    Object.entries(sageMakerDomainBuildProps).forEach(([domainName, domainProps]) => {
      this.createSageMakerDomain(scope, domainName, domainProps, lakeformationManageAccessRole);
    });
  }

  private createSageMakerDomain(
    scope: Construct,
    domainName: string,
    domainProps: SageMakerDomainProps,
    lakeformationManageAccessRole: IRole,
  ) {
    // Create KMS key and resolve admin role
    const { dataAdminRole, kmsKey } = this.createDomainInfrastructure(scope, domainName, domainProps);
    const executionRole = this.createExecutionRole(scope, domainName, kmsKey, 'V2');
    const serviceRole = this.createSageMakerServiceRole(scope, `service-${domainName}`);

    // Create DataZone domain construct with V2 settings
    const idPrefix = scope.node.tryGetContext(LEGACY_DATAZONE_SCOPE_CONTEXT_KEY) ? `parent-` : '';
    const domainConstruct = new DataZoneDomainConstruct(scope, `${idPrefix}${domainName}-domain`, {
      naming: this.props.naming,
      domainName: domainName,
      domainExecutionRole: executionRole,
      kmsKey: kmsKey,
      description: domainProps.description,
      singleSignOnType: 'IAM_IDC',
      userAssignment: domainProps.userAssignment,
      domainVersion: 'V2',
      serviceRole: serviceRole,
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
    policies.domainKmsUsagePolicy.attachToRole(serviceRole);
    executionRole.addManagedPolicy(domainBucketUsagePolicy);
    lakeformationManageAccessRole.addManagedPolicy(policies.domainKmsUsagePolicy);
    executionRole.addManagedPolicy(policies.domainKmsUsagePolicy);

    // Create user/group profiles, domain units, and authorization policies
    const associatedAccountCdkUserProfiles = this.createAccountAssociations(
      scope,
      domainName,
      domainProps,
      domain,
      'V2',
    );
    const { createdDomainUnits } = this.setupDomainGovernance(
      scope,
      domainName,
      domainProps,
      domain,
      dataAdminUserProfile,
      associatedAccountCdkUserProfiles,
    );

    // Prepare domain config data and create SageMaker-specific resources
    const { domainUnitIds, glueCatalogArns } = this.prepareDomainConfigData(domain, createdDomainUnits, domainProps);
    const domainConfig = this.createSageMakerResources(
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

    // Setup cross-account sharing with second stage stack for user profiles
    if (domainProps.associatedAccounts) {
      const secondStageStack = this.getSecondStageStack(scope);
      const secondStageStackDomainConfig = new DomainConfig(secondStageStack, `domain-config-${domainName}`, {
        ssmParamBase: domainConfig.ssmParamBase,
        naming: this.props.naming.withSuffix('user-profiles'),
      });

      this.setupCrossAccountResources(scope, domainName, domainProps, {
        domain,
        domainConfig,
        policyNames: {
          kms: policies.domainKmsUsagePolicyName,
          bucket: policies.domainBucketUsagePolicyName,
        },
        keyAccessAccounts: policies.keyAccessAccounts,
        createAssociatedAccountResources: (scope, domainName, accountName, accountProps, resourceConfig) => {
          this.createSageMakerAssociatedAccountStackResources(
            scope,
            domainName,
            domainProps,
            {
              accountName,
              accountProps: accountProps as SageMakerAssociatedAccountProps,
              secondStageStack,
              secondStageStackDomainConfig,
            },
            resourceConfig,
          );
        },
      });
    }
  }

  public createSageMakerServiceRole(scope: Construct, roleName: string): IRole {
    const serviceRoleConditions: Conditions = {
      StringEquals: {
        'aws:SourceAccount': this.props.account,
      },
    };

    const serviceRole = new MdaaRole(scope, roleName, {
      naming: this.props.naming,
      roleName: roleName,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(serviceRoleConditions),
    });

    return serviceRole;
  }

  private createSageMakerResources(
    scope: Construct,
    domainName: string,
    domainProps: SageMakerDomainProps,
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
  ): DomainConfig {
    // Create provisioning role and tooling resources (KMS, bucket)
    const domainBlueprintProvisioningRole = this.createProvisioningRole(
      domainResources.domain,
      this.props.account,
      domainName,
      domainResources.kmsKey.keyArn,
    );
    domainBlueprintProvisioningRole.addManagedPolicy(policies.domainKmsUsagePolicy);
    domainBlueprintProvisioningRole.addManagedPolicy(policies.domainBucketUsagePolicy);
    const toolingProvisioningRole = domainProps.tooling.provisioningRoleArn
      ? Role.fromRoleArn(domainResources.domain, 'tooling-provisioning-role', domainProps.tooling.provisioningRoleArn)
      : domainBlueprintProvisioningRole;
    const toolingResourceParams = this.createToolingResources(
      domainResources.domain,
      domainName,
      this.props.account,
      this.props.region,
      domainProps.tooling,
    );
    const toolingParams = { ...domainProps.tooling?.parameters, ...toolingResourceParams };

    // Map authorized domain units for tooling blueprint
    const toolingAuthorizedDomainUnitIds = this.mapAuthorizedDomainUnits(
      domainProps.tooling?.authorizedDomainUnits,
      domainData.domainUnitIds,
    );

    // Enable Tooling and DataLake blueprints (required for SageMaker)
    this.createBlueprintConfiguration(domainResources.domain, {
      account: this.props.account,
      region: this.props.region,
      domainName,
      domainId: domainResources.domain.attrId,
      blueprintName: 'Tooling',
      lakeformationManageAccessRole: domainResources.lakeformationManageAccessRole,
      regionalParameters: this.createBlueprintRegionalParams({ parameters: toolingParams }, this.props.region),
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    this.createBlueprintConfiguration(domainResources.domain, {
      account: this.props.account,
      region: this.props.region,
      domainName,
      domainId: domainResources.domain.attrId,
      blueprintName: 'DataLake',
      lakeformationManageAccessRole: domainResources.lakeformationManageAccessRole,
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    this.createManagedBlueprintConfigs(
      domainName,
      domainProps,
      domainResources.domain,
      domainData.domainUnitIds,
      domainBlueprintProvisioningRole,
      domainResources.lakeformationManageAccessRole,
    );

    // Create custom resource role and user profile
    const { roleName } = this.createCustomResourceRoleAndProfile(
      domainResources.domain,
      domainName,
      domainResources.domain,
      domainResources.kmsKey.keyArn,
    );

    // Create and return domain configuration
    const domainConfig = this.createDomainConfig(
      scope,
      domainName,
      {
        domain: domainResources.domain,
        domainVersion: 'V2',
        kmsKey: domainResources.kmsKey,
        domainBucket: domainResources.domainBucket,
      },
      domainData,
      policies,
      roleName,
    );
    this.createCustomBlueprints(
      domainProps,
      domainResources.domain,
      domainData.domainUnitIds,
      domainBlueprintProvisioningRole,
      domainResources.domainBucket,
      domainConfig,
    );
    return domainConfig;
  }

  private createCustomBlueprints(
    domainProps: SageMakerDomainProps,
    domain: CfnDomain,
    domainUnitIds: { [key: string]: string },
    domainBlueprintProvisioningRole: IRole,
    domainBucket: IBucket,
    domainConfig: DomainConfig,
  ) {
    // Enable additional managed blueprints
    return Object.fromEntries(
      Object.entries(domainProps.customBlueprints ?? {}).map(([blueprintName, customBlueprintProps]) => {
        if (blueprintName.toLowerCase() === 'tooling') {
          throw new Error("Tooling blueprint must be configured under 'tooling'");
        } else {
          // Create provisioning role
          const provisioningRole = customBlueprintProps.provisioningRoleArn
            ? Role.fromRoleArn(domain, `${blueprintName}-provisioning-role`, customBlueprintProps.provisioningRoleArn)
            : domainBlueprintProvisioningRole;

          const templateUrl = this.resolveTemplateUrl(domain, customBlueprintProps);
          const authorizedDomainUnits = Object.fromEntries(
            (customBlueprintProps.authorizedDomainUnits ?? ['/root'])
              .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
              .map(unit => [unit, domainUnitIds[unit]]),
          );
          const blueprintProps: MdaaSageMakerCustomBlueprintConstructProps = {
            domainConfig: domainConfig,
            provisioningRoleArn: provisioningRole.roleArn,
            blueprintName: blueprintName,
            templateUrl: templateUrl,
            domainBucket: domainBucket,
            enabledRegions: [this.props.region],
            region: this.props.region,
            account: this.props.account,
            naming: this.props.naming,
            authorizedDomainUnits: authorizedDomainUnits,
          };
          const blueprint = new MdaaSageMakerCustomBlueprintConstruct(
            domain,
            `${blueprintName}-custom-blueprint`,
            blueprintProps,
          );

          return [blueprintName, blueprint];
        }
      }),
    );
  }
  private resolveTemplateUrl(scope: Construct, customBlueprintProps: CustomEnabledBlueprintProps): string {
    if (!customBlueprintProps.path && !customBlueprintProps.url) {
      throw new Error('Exactly one of path or url must be specified');
    }

    try {
      if (customBlueprintProps.path) {
        const template = CloudFormationTemplate.fromAsset(customBlueprintProps.path);
        return template.bind(Stack.of(scope)).httpUrl;
      } else {
        const template = CloudFormationTemplate.fromUrl(customBlueprintProps.url!);
        return template.bind(Stack.of(scope)).httpUrl;
      }
    } catch (error) {
      throw new Error(
        `Failed to resolve CloudFormation template: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private createManagedBlueprintConfigs(
    domainName: string,
    domainProps: SageMakerDomainProps,
    domain: CfnDomain,
    domainUnitIds: { [key: string]: string },
    domainBlueprintProvisioningRole: IRole,
    lakeformationManageAccessRole: IRole,
  ) {
    // Validate that Tooling and DataLake are not in enabledManagedBlueprints
    if (domainProps.enabledManagedBlueprints && 'Tooling' in domainProps.enabledManagedBlueprints) {
      throw new Error(
        'Tooling blueprint is automatically enabled and should not be included in enabledManagedBlueprints',
      );
    }
    if (domainProps.enabledManagedBlueprints && 'DataLake' in domainProps.enabledManagedBlueprints) {
      throw new Error(
        'DataLake blueprint is automatically enabled and should not be included in enabledManagedBlueprints',
      );
    }

    // Enable additional managed blueprints
    return Object.fromEntries(
      Object.entries(domainProps.enabledManagedBlueprints ?? {}).map(([blueprintName, blueprintProps]) => {
        if (blueprintName.toLowerCase() === 'tooling') {
          throw new Error("Tooling blueprint must be configured under 'tooling'");
        } else {
          const authorizedDomainUnits = this.mapAuthorizedDomainUnits(
            blueprintProps.authorizedDomainUnits,
            domainUnitIds,
          );
          // Create provisioning role
          const provisioningRole = blueprintProps.provisioningRoleArn
            ? Role.fromRoleArn(domain, `${blueprintName}-provisioning-role`, blueprintProps.provisioningRoleArn)
            : domainBlueprintProvisioningRole;

          const blueprintId = this.createBlueprintConfiguration(domain, {
            account: this.props.account,
            region: this.props.region,
            domainName,
            domainId: domain.attrId,
            blueprintName,
            lakeformationManageAccessRole,
            regionalParameters: this.createBlueprintRegionalParams(blueprintProps, this.props.region),
            authorizedDomainUnits,
            provisioningRole,
          }).blueprintConfigId;
          return [blueprintName, blueprintId];
        }
      }),
    );
  }

  private createProvisioningRole(
    scope: Construct,
    account: string,
    domainName: string,
    domainKmsKeyArn: string,
  ): IRole {
    const provisioningRoleCondition: Conditions = {
      StringEquals: {
        'aws:SourceAccount': account,
      },
      'ForAllValues:StringLike': {
        'aws:TagKeys': 'datazone*',
      },
    };

    const provisioningRole = new MdaaRole(scope, `${domainName}-provisioning-role`, {
      naming: this.props.naming,
      roleName: `${domainName}-provisioning-role`,
      assumedBy: new ServicePrincipal('datazone.amazonaws.com').withConditions(provisioningRoleCondition),
      managedPolicies: [
        MdaaManagedPolicy.fromAwsManagedPolicyName('service-role/SageMakerStudioProjectProvisioningRolePolicy'),
      ],
    });

    provisioningRole.assumeRolePolicy?.addStatements(
      new PolicyStatement({
        actions: ['sts:TagSession'],
        principals: [new ServicePrincipal('datazone.amazonaws.com').withConditions(provisioningRoleCondition)],
      }),
    );

    provisioningRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: USER_ACTIONS,
        resources: [domainKmsKeyArn],
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      provisioningRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'DataZone provisioning role requires AWS managed policy for SageMaker provisioning',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'EC2, LakeFormation, and KMS actions require wildcard resources for environment provisioning',
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

    return provisioningRole;
  }

  private getSecondStageStack(scope: Construct): Stack {
    this.secondStageStack ??= new Stack(scope, 'user-profile-stack', {
      stackName: this.props.naming.stackName('user-profiles'),
    });
    return this.secondStageStack;
  }

  private createBlueprintRegionalParams(
    blueprintProps: EnabledBlueprintProps,
    regionName: string,
    forcedParams?: { [paramName: string]: string },
  ): CfnEnvironmentBlueprintConfiguration.RegionalParameterProperty[] {
    return [
      {
        region: regionName,
        parameters: { ...blueprintProps.parameters, ...forcedParams },
      },
    ];
  }

  private createToolingResources(
    scope: Construct,
    domainName: string,
    account: string,
    region: string,
    toolingProps: ToolingBlueprintProps,
  ): { [paramName: string]: string } {
    const kmsKey = new MdaaKmsKey(scope, `${domainName}-tooling-kms`, {
      naming: this.props.naming,
      alias: `${domainName}-tooling`,
      description: `DataZone Tooling KMS Key for ${domainName} on ${region}`,
    });
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchLogsEncryption',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: [new ServicePrincipal(`logs.${this.props.region}.amazonaws.com`)],
      resources: ['*'],
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': [
            `arn:${this.props.partition}:logs:${region}:${account}:log-group:datazone-*`,
            `arn:${this.props.partition}:logs:${region}:${account}:log-group:airflow-*`,
          ],
        },
      },
    });
    kmsKey.addToResourcePolicy(cloudwatchStatement);

    const bucket = new MdaaBucket(scope, `${domainName}-tooling-bucket`, {
      naming: this.props.naming,
      bucketName: `${domainName}-${region}-${account}-tooling`,
      encryptionKey: kmsKey,
      createParams: false,
      createOutputs: false,
    });

    const forcedParams = {
      KmsKeyArn: kmsKey.keyArn,
      S3Location: bucket.s3UrlForObject(),
      Subnets: toolingProps.subnetIds.join(','),
      VpcId: toolingProps.vpcId,
    };
    return forcedParams;
  }

  private createSageMakerAssociatedAccountStackResources(
    scope: Construct,
    domainName: string,
    domainProps: SageMakerDomainProps,
    associatedAccountConfig: {
      accountName: string;
      accountProps: SageMakerAssociatedAccountProps;
      secondStageStack: Stack;
      secondStageStackDomainConfig: DomainConfig;
    },
    resourceConfig: {
      domainConfig: DomainConfig;
      kmsPolicy: string;
      bucketPolicy: string;
      keyAccounts: string[];
    },
  ) {
    const accountName = associatedAccountConfig.accountName;
    const accountProps = associatedAccountConfig.accountProps;
    const secondStageStack = associatedAccountConfig.secondStageStack;
    const region = accountProps.region || this.props.region;
    const crossAccountStack = (scope as MdaaL3Construct).getCrossAccountStack(accountProps.account, region);
    if (!crossAccountStack) {
      console.warn(
        `Cross account stack not defined for associated account ${accountName}/${accountProps.account} on domain ${domainName}. Cross account association will not work.`,
      );
      return;
    }
    secondStageStack.addDependency(crossAccountStack);

    // Parse domain config from SSM parameters in cross-account
    const crossAccountDomainConfig = this.parseCrossAccountDomainConfig(
      crossAccountStack,
      domainName,
      region,
      resourceConfig.domainConfig.ssmParamBase,
    );

    // Create bucket and KMS usage policies in cross-account
    const { domainBucketUsagePolicy, domainKmsUsagePolicy } = this.createCrossAccountPolicies(
      crossAccountStack,
      domainName,
      accountProps.account,
      region,
      { kms: resourceConfig.kmsPolicy, bucket: resourceConfig.bucketPolicy },
      resourceConfig.keyAccounts,
      crossAccountDomainConfig,
    );

    // Resolve or import LakeFormation manage access role
    const lakeformationManageAccessRole = this.resolveLakeFormationRole(
      crossAccountStack,
      domainName,
      accountProps.lakeformationManageAccessRoleArn,
    );
    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    // Resolve or create provisioning role
    const accountBlueprintProvisioningRole = this.createProvisioningRole(
      crossAccountStack,
      this.props.account,
      domainName,
      crossAccountDomainConfig.domainKmsKeyArn,
    );

    accountBlueprintProvisioningRole.addManagedPolicy(domainKmsUsagePolicy);
    accountBlueprintProvisioningRole.addManagedPolicy(domainBucketUsagePolicy);

    const toolingProvisioningRole = accountProps.tooling.provisioningRoleArn
      ? Role.fromRoleArn(
          crossAccountStack,
          `${domainName}-tooling-provisioning-role`,
          accountProps.tooling.provisioningRoleArn,
        )
      : accountBlueprintProvisioningRole;

    // Create custom resource role and user profile in cross-account
    this.createCustomResourceRole(
      crossAccountStack,
      resourceConfig.domainConfig.customResourceRoleName,
      crossAccountDomainConfig.domainKmsKeyArn,
      accountProps.account,
    );

    const customResourceUserProfile = new CfnUserProfile(
      associatedAccountConfig.secondStageStack,
      `custom-resource-user-profil-${accountProps.account}`,
      {
        domainIdentifier: associatedAccountConfig.secondStageStackDomainConfig.domainId,
        userIdentifier: `arn:${this.props.partition}:iam::${accountProps.account}:role/${resourceConfig.domainConfig.customResourceRoleName}`,
        userType: 'IAM_ROLE',
        status: 'ACTIVATED',
      },
    );

    const authorizonPolicy: AuthorizationPolicy = {
      policyType: 'ADD_TO_PROJECT_MEMBER_POOL',
      principals: [{ userIdentifier: { name: 'custom-resource-user', identifier: customResourceUserProfile.attrId } }],
      includeChildDomainUnits: true,
    };

    this.createAuthorizationPolicies(
      `custom-resource-role-auth-${accountProps.account}`,
      associatedAccountConfig.secondStageStack,
      associatedAccountConfig.secondStageStackDomainConfig.domainId,
      associatedAccountConfig.secondStageStackDomainConfig.getDomainUnitId('/root'),
      { 'custom-resource-role-auth': authorizonPolicy },
      domainProps,
    );

    // Map authorized domain units for tooling
    const toolingAuthorizedDomainUnitIds = this.mapAuthorizedDomainUnits(
      domainProps.tooling?.authorizedDomainUnits,
      crossAccountDomainConfig,
    );

    // Enable Tooling blueprint in cross-account
    this.createBlueprintConfiguration(crossAccountStack, {
      account: accountProps.account,
      region: accountProps.region ?? this.props.region,
      domainName,
      domainId: crossAccountDomainConfig.domainId,
      blueprintName: 'Tooling',
      lakeformationManageAccessRole,
      regionalParameters: this.createBlueprintRegionalParams(
        accountProps.tooling,
        accountProps.region ?? this.props.region,
        this.createToolingResources(
          crossAccountStack,
          domainName,
          accountProps.account,
          accountProps.region ?? this.props.region,
          accountProps.tooling,
        ),
      ),
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    // Enable DataLake blueprint in cross-account
    this.createBlueprintConfiguration(crossAccountStack, {
      account: accountProps.account,
      region: accountProps.region ?? this.props.region,
      domainName,
      domainId: crossAccountDomainConfig.domainId,
      blueprintName: 'DataLake',
      lakeformationManageAccessRole,
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    // Enable additional managed blueprints in cross-account
    this.createCrossAccountManagedBlueprints(
      crossAccountStack,
      domainName,
      domainProps,
      accountProps,
      crossAccountDomainConfig,
      lakeformationManageAccessRole,
      accountBlueprintProvisioningRole,
    );
  }

  private createCrossAccountManagedBlueprints(
    crossAccountStack: Construct,
    domainName: string,
    domainProps: SageMakerDomainProps,
    accountProps: SageMakerAssociatedAccountProps,
    crossAccountDomainConfig: DomainConfig,
    lakeformationManageAccessRole: IRole,
    accountBlueprintProvisioningRole: IRole,
  ) {
    Object.entries(domainProps.enabledManagedBlueprints ?? {}).forEach(([blueprintName, blueprintProps]) => {
      const authorizedDomainUnits = this.mapAuthorizedDomainUnits(
        blueprintProps.authorizedDomainUnits,
        crossAccountDomainConfig,
      );
      const provisioningRole = blueprintProps.provisioningRoleArn
        ? Role.fromRoleArn(
            crossAccountStack,
            `${domainName}-${blueprintName}-provisioning-role`,
            blueprintProps.provisioningRoleArn,
          )
        : accountBlueprintProvisioningRole;
      this.createBlueprintConfiguration(crossAccountStack, {
        account: accountProps.account,
        region: accountProps.region ?? this.props.region,
        domainName,
        domainId: crossAccountDomainConfig.domainId,
        blueprintName,
        lakeformationManageAccessRole,
        regionalParameters: this.createBlueprintRegionalParams(
          blueprintProps,
          accountProps.region ?? this.props.region,
        ),
        authorizedDomainUnits,
        provisioningRole,
      });
    });
  }
}
