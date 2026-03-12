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
  MdaaSageMakerCustomBlueprintConfigConstruct,
  MdaaSageMakerCustomBlueprintConfigConstructProps,
  MdaaSageMakerCustomBlueprintConstruct,
  MdaaSageMakerCustomBlueprintConstructProps,
} from '@aws-mdaa/datazone-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey, USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Stack } from 'aws-cdk-lib';

import { MdaaL3Construct } from '@aws-mdaa/l3-construct/lib/l3construct';
import { CfnDomain, CfnEnvironmentBlueprintConfiguration, CfnUserProfile } from 'aws-cdk-lib/aws-datazone';
import {
  ArnPrincipal,
  Conditions,
  Effect,
  IPrincipal,
  IRole,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { CloudFormationTemplate } from 'aws-cdk-lib/aws-servicecatalog';
import { Construct } from 'constructs';
import {
  CustomBlueprintProps,
  EnabledBlueprintProps,
  SageMakerAssociatedAccountProps,
  SageMakerDomainProps,
  ToolingBlueprintProps,
} from '../datazone-l3-construct';
import { CommonDomainHelper, CommonDomainHelperProps } from './common-domain-helper';
import { resolveCrossAccountProvisioningRole } from '@aws-mdaa/datazone-constructs/lib/utils';

interface EnableBlueprintRoles {
  lakeformationManageAccessRole: IRole;
  blueprintProvisioningRole: IRole;
}

interface EnableBlueprintDomainInfo {
  domainName: string;
  domainConfig: DomainConfig;
}

interface EnableBlueprintTargetEnv {
  account: string;
  region?: string;
}

export class SageMakerDomainHelper extends CommonDomainHelper {
  private secondStageStack?: Stack;

  constructor(props: CommonDomainHelperProps) {
    super(props);
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

    //Provide access to domain bucket for associated account blueprint provisioning roles
    const associatedAccountProvisioningRoles: IPrincipal[] = Object.values(
      domainProps.associatedAccounts || {},
    ).flatMap(accountProps => {
      return (accountProps.blueprintProvisioningRoles || []).map(roleRef => {
        const roleArn = resolveCrossAccountProvisioningRole(roleRef, accountProps.account, this.props.partition);
        return new ArnPrincipal(roleArn);
      });
    });
    if (associatedAccountProvisioningRoles.length > 0) {
      //This statement will allow blueprint provisioning roles in associated accounts to
      // read blueprint templates from the domain bucket
      const associatedAccountBucketPolicyStatement = new PolicyStatement({
        sid: 'AssociatedAccountDomainBucketRead',
        effect: Effect.ALLOW,
        resources: [domainBucket.arnForObjects('blueprints/') + '*'],
        actions: ['s3:GetObject', 's3:GetObjectVersion'],
        principals: associatedAccountProvisioningRoles,
      });
      domainBucket.addToResourcePolicy(associatedAccountBucketPolicyStatement);
    }

    // Create KMS policies and bucket policy
    const policies = this.setupDomainAccessPolicies(scope, domainName, domainProps, kmsKey);
    const domainBucketUsagePolicy = this.createDomainBucketUsagePolicy(
      scope,
      domainName,
      policies.domainBucketUsagePolicyName,
      domainBucket,
    );
    policies.domainKmsUsagePolicy.attachToRole(serviceRole);
    policies.domainKmsAdminPolicy.attachToRole(serviceRole);
    policies.domainKmsUsagePolicy.attachToRole(executionRole);
    policies.domainKmsAdminPolicy.attachToRole(executionRole);
    policies.domainKmsUsagePolicy.attachToRole(lakeformationManageAccessRole);
    domainBucketUsagePolicy.attachToRole(executionRole);

    if (domainProps.blueprintProvisioningRoles) {
      const resolvedBpRoles = this.props.roleHelper
        .resolveRoleRefsWithOrdinals(domainProps.blueprintProvisioningRoles, 'bp-provisioning')
        .map(resolveRef => {
          return resolveRef.role(resolveRef.refId());
        });

      resolvedBpRoles.forEach(role => {
        policies.domainKmsUsagePolicy.attachToRole(role);
        policies.domainKmsAdminPolicy.attachToRole(role);
        domainBucketUsagePolicy.attachToRole(role);
      });

      this.createBaseBlueprintProvisioningPolicy(domain, 'bp-provisioning', resolvedBpRoles, this.props.account);
    }

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
    // Create custom blueprints before domain config
    const blueprintIds = this.createCustomBlueprints(
      domainProps,
      domain,
      domainBucket,
      domain.attrId,
      policies.domainKmsUsagePolicy.managedPolicyName,
      domainBucketUsagePolicy.managedPolicyName,
      kmsKey.keyArn,
    );

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
        blueprintIds,
        glueCatalogKmsKeyArns: policies.glueCatalogKmsKeyArns,
        glueCatalogArns,
      },
      {
        domainKmsUsagePolicy: policies.domainKmsUsagePolicy,
        domainKmsAdminPolicy: policies.domainKmsAdminPolicy,
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
          kmsUsagePolicyName: policies.domainKmsUsagePolicyName,
          kmsAdminPolicyName: policies.domainKmsAdminPolicyName,
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

  private createBaseBlueprintProvisioningPolicy(scope: Construct, id: string, bpRoles: IRole[], account: string) {
    const policy = new MdaaManagedPolicy(scope, id, {
      managedPolicyName: 'bp-provisioning',
      naming: this.props.naming,
      roles: bpRoles,
    });

    // CloudFormation template validation
    policy.addStatements(
      new PolicyStatement({
        sid: 'CfnValidate',
        effect: Effect.ALLOW,
        actions: ['cloudformation:ValidateTemplate'],
        resources: ['*'],
      }),
    );

    // CloudFormation stack creation for DataZone projects
    policy.addStatements(
      new PolicyStatement({
        sid: 'CfnCreate',
        effect: Effect.ALLOW,
        actions: ['cloudformation:CreateStack', 'cloudformation:TagResource'],
        resources: [`arn:${this.props.partition}:cloudformation:${this.props.region}:${account}:stack/DataZone*`],
        conditions: {
          StringEquals: {
            'aws:ResourceAccount': '${aws:PrincipalAccount}',
          },
          Null: {
            'aws:ResourceTag/AmazonDataZoneProject': 'false',
            'aws:TagKeys': 'false',
          },
          'ForAllValues:StringLike': {
            'aws:TagKeys': ['AmazonDataZone*'],
          },
        },
      }),
    );

    // CloudFormation stack management
    policy.addStatements(
      new PolicyStatement({
        sid: 'CfnMng',
        effect: Effect.ALLOW,
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:UpdateStack',
          'cloudformation:GetTemplate',
        ],
        resources: [`arn:${this.props.partition}:cloudformation:${this.props.region}:${account}:stack/DataZone*`],
        conditions: {
          StringEquals: {
            'aws:ResourceAccount': '${aws:PrincipalAccount}',
          },
          Null: {
            'aws:ResourceTag/AmazonDataZoneProject': 'false',
          },
        },
      }),
    );

    // CloudFormation stack deletion
    policy.addStatements(
      new PolicyStatement({
        sid: 'CfnDelete',
        effect: Effect.ALLOW,
        actions: ['cloudformation:DeleteStack', 'cloudformation:DescribeStacks'],
        resources: [`arn:${this.props.partition}:cloudformation:${this.props.region}:${account}:stack/DataZone*`],
        conditions: {
          StringEquals: {
            'aws:ResourceAccount': '${aws:PrincipalAccount}',
          },
        },
      }),
    );

    // Add CDK-NAG suppressions
    MdaaNagSuppressions.addCodeResourceSuppressions(
      policy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'ValidateTemplate action does not support resource-level permissions. Stack name wildcards required for DataZone project provisioning.',
        },
      ],
      true,
    );

    return policy;
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
      blueprintIds: { [name: string]: string };
      glueCatalogKmsKeyArns: string[];
      glueCatalogArns: string[];
    },
    policies: {
      domainKmsUsagePolicy: MdaaManagedPolicy;
      domainKmsAdminPolicy: MdaaManagedPolicy;
      domainBucketUsagePolicy: MdaaManagedPolicy;
    },
  ): DomainConfig {
    // Create a default provisioning role
    const domainDefaultBlueprintProvisioningRole = this.createProvisioningRole(
      domainResources.domain,
      this.props.account,
      domainName,
    );
    domainDefaultBlueprintProvisioningRole.addManagedPolicy(policies.domainKmsUsagePolicy);
    domainDefaultBlueprintProvisioningRole.addManagedPolicy(policies.domainBucketUsagePolicy);

    const toolingProvisioningRole = domainProps.tooling.provisioningRole
      ? this.props.roleHelper
          .resolveRoleRefWithRefId(domainProps.tooling.provisioningRole, 'tooling-provisioning-role')
          .role('tooling-provisioning-role')
      : domainDefaultBlueprintProvisioningRole;

    const toolingResourceParams = this.createToolingResources(
      domainResources.domain,
      domainName,
      this.props.account,
      this.props.region,
      domainProps.tooling,
      policies.domainKmsUsagePolicy,
      policies.domainKmsAdminPolicy,
    );
    const toolingParams = { ...domainProps.tooling?.parameterValues, ...toolingResourceParams };

    // Map authorized domain units for tooling blueprint
    const toolingAuthorizedDomainUnitIds = Object.fromEntries(
      (domainProps.tooling?.authorizedDomainUnits ?? ['/root'])
        .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
        .map(unit => [unit, domainData.domainUnitIds[unit]]),
    );

    // Enable Tooling and DataLake blueprints (required for SageMaker)
    this.createManagedBlueprintConfiguration(domainResources.domain, {
      account: this.props.account,
      region: this.props.region,
      domainName,
      domainId: domainResources.domain.attrId,
      blueprintName: 'Tooling',
      lakeformationManageAccessRole: domainResources.lakeformationManageAccessRole,
      regionalParameters: this.createBlueprintRegionalParams({ parameterValues: toolingParams }, this.props.region),
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    this.createManagedBlueprintConfiguration(domainResources.domain, {
      account: this.props.account,
      region: this.props.region,
      domainName,
      domainId: domainResources.domain.attrId,
      blueprintName: 'DataLake',
      lakeformationManageAccessRole: domainResources.lakeformationManageAccessRole,
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
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

    if (domainProps.enabledManagedBlueprints) {
      // Enable managed blueprints using the helper method
      this.enableManagedBlueprints(
        domainProps.enabledManagedBlueprints,
        domainResources.domain,
        { account: this.props.account, region: this.props.region },
        { domainName, domainConfig },
        {
          lakeformationManageAccessRole: domainResources.lakeformationManageAccessRole,
          blueprintProvisioningRole: domainDefaultBlueprintProvisioningRole,
        },
      );
    }

    if (domainProps.customBlueprints) {
      this.enableCustomBlueprints(
        domainResources.domain,
        domainProps.customBlueprints,
        domainDefaultBlueprintProvisioningRole,
        domainConfig,
      );
    }

    return domainConfig;
  }

  private createCustomBlueprints(
    domainProps: SageMakerDomainProps,
    domain: CfnDomain,
    domainBucket: IBucket,
    domainId: string,
    domainKmsUsagePolicyName: string,
    domainBucketUsagePolicyName: string,
    domainKmsKeyArn: string,
  ): { [key: string]: string } {
    return Object.fromEntries(
      Object.entries(domainProps.customBlueprints ?? {}).map(([blueprintName, customBlueprintProps]) => {
        if (blueprintName.toLowerCase() === 'tooling') {
          throw new Error("Tooling blueprint must be configured under 'tooling'");
        }

        const templateUrl = this.resolveTemplateUrl(domain, customBlueprintProps);

        // Create the blueprint
        const blueprintProps: MdaaSageMakerCustomBlueprintConstructProps = {
          domainId: domainId,
          domainKmsUsagePolicyName: domainKmsUsagePolicyName,
          domainBucketUsagePolicyName: domainBucketUsagePolicyName,
          blueprintName: blueprintName,
          templateUrl: templateUrl,
          domainBucket: domainBucket,
          naming: this.props.naming,
          parameters: customBlueprintProps.parameters,
          region: this.props.region,
          account: this.props.account,
          domainKmsKeyArn: domainKmsKeyArn,
        };
        const blueprint = new MdaaSageMakerCustomBlueprintConstruct(
          domain,
          `${blueprintName}-custom-blueprint`,
          blueprintProps,
        );

        return [blueprintName, blueprint.blueprintId];
      }),
    );
  }

  private enableCustomBlueprints(
    scope: Construct,
    enabledCustomBlueprints: { [name: string]: CustomBlueprintProps },
    domainDefaultBlueprintProvisioningRole: IRole,
    domainConfig: DomainConfig,
  ) {
    Object.entries(enabledCustomBlueprints ?? {}).forEach(([enabledBlueprintName, enabledBlueprintProps]) => {
      const blueprintId = domainConfig.getBlueprintId(enabledBlueprintName);
      if (!blueprintId) {
        return;
      }

      // Create provisioning role
      const provisioningRole = enabledBlueprintProps.provisioningRole
        ? this.props.roleHelper
            .resolveRoleRefWithRefId(
              enabledBlueprintProps.provisioningRole,
              `${enabledBlueprintName}-provisioning-role`,
            )
            .role(`${enabledBlueprintName}-provisioning-role`)
        : domainDefaultBlueprintProvisioningRole;

      const authorizedDomainUnits = Object.fromEntries(
        (enabledBlueprintProps.authorizedDomainUnits ?? ['/root'])
          .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
          .map(unit => [unit, domainConfig.getDomainUnitId(unit)]),
      );

      // Create the blueprint configuration
      const blueprintConfigProps: MdaaSageMakerCustomBlueprintConfigConstructProps = {
        domainConfig: domainConfig,
        blueprintIdentifier: blueprintId,
        provisioningRoleArn: provisioningRole.roleArn,
        enabledRegions: [this.props.region],
        region: this.props.region,
        naming: this.props.naming,
        authorizedDomainUnits,
        account: this.props.account,
      };

      new MdaaSageMakerCustomBlueprintConfigConstruct(
        scope,
        `${enabledBlueprintName}-custom-blueprint-config`,
        blueprintConfigProps,
      );
    });
  }

  private resolveTemplateUrl(scope: Construct, customBlueprintProps: CustomBlueprintProps): string {
    if (customBlueprintProps.path) {
      const template = CloudFormationTemplate.fromAsset(customBlueprintProps.path);
      return template.bind(Stack.of(scope)).httpUrl;
    } else if (customBlueprintProps.url) {
      const template = CloudFormationTemplate.fromUrl(customBlueprintProps.url);
      return template.bind(Stack.of(scope)).httpUrl;
    }
    throw new Error('Exactly one of path or url must be specified');
  }

  private createProvisioningRole(scope: Construct, account: string, domainName: string): IRole {
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
        parameters: { ...blueprintProps.parameterValues, ...forcedParams },
      },
    ];
  }

  private createToolingResources(
    scope: Construct,
    domainName: string,
    account: string,
    region: string,
    toolingProps: ToolingBlueprintProps,
    domainKmsUsagePolicy: ManagedPolicy,
    domainKmsAdminPolicy: ManagedPolicy,
  ): { [paramName: string]: string } {
    const kmsKey = new MdaaKmsKey(scope, `${domainName}-tooling-kms`, {
      naming: this.props.naming,
      alias: `${domainName}-tooling`,
      description: `DataZone Tooling KMS Key for ${domainName} on ${region}`,
    });

    domainKmsUsagePolicy.addStatements(
      new PolicyStatement({
        actions: [...USER_ACTIONS, 'kms:DescribeKey'],
        resources: [kmsKey.keyArn],
      }),
    );

    domainKmsAdminPolicy.addStatements(
      new PolicyStatement({
        sid: 'ToolingKmsCreateGrant',
        effect: Effect.ALLOW,
        resources: [kmsKey.keyArn],
        actions: ['kms:CreateGrant'],
        conditions: {
          StringLike: {
            'kms:CallerAccount': account,
          },
        },
      }),
    );

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

    const toolingBucket = new MdaaBucket(scope, `${domainName}-tooling-bucket`, {
      naming: this.props.naming,
      bucketName: `${domainName}-${region}-${account}-tooling`,
      encryptionKey: kmsKey,
      createParams: false,
      createOutputs: false,
    });

    const forcedParams = {
      KmsKeyArn: kmsKey.keyArn,
      S3Location: toolingBucket.s3UrlForObject(),
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
      kmsUsagePolicyName: string;
      kmsAdminPolicyName: string;
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
      throw new Error(
        `Cross account stack not defined for associated account ${accountName}/${accountProps.account} on domain ${domainName}. Cross account association will not work.`,
      );
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
    const { domainBucketUsagePolicy, domainKmsUsagePolicy, domainKmsAdminPolicy } = this.createCrossAccountPolicies(
      crossAccountStack,
      domainName,
      accountProps.account,
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
      accountProps.lakeformationManageAccessRoleArn,
    );
    lakeformationManageAccessRole.addManagedPolicy(domainKmsUsagePolicy);

    // Created default provisioning role for this account
    const accountDefaultBlueprintProvisioningRole = this.createProvisioningRole(
      crossAccountStack,
      this.props.account,
      domainName,
    );

    domainKmsUsagePolicy.attachToRole(accountDefaultBlueprintProvisioningRole);
    domainKmsAdminPolicy.attachToRole(accountDefaultBlueprintProvisioningRole);
    domainBucketUsagePolicy.attachToRole(accountDefaultBlueprintProvisioningRole);

    const bpRoles = accountProps.blueprintProvisioningRoles?.map(roleRef => {
      const roleArn = resolveCrossAccountProvisioningRole(roleRef, accountProps.account, this.props.partition);
      return Role.fromRoleArn(crossAccountStack, `${domainName}-${roleRef.name || roleRef.arn}`, roleArn);
    });

    bpRoles?.forEach(role => {
      domainKmsUsagePolicy.attachToRole(role);
      domainKmsAdminPolicy.attachToRole(role);
      domainBucketUsagePolicy.attachToRole(role);
    });
    if (bpRoles) {
      this.createBaseBlueprintProvisioningPolicy(
        crossAccountStack,
        `bp-provisioning-${domainName}`,
        bpRoles,
        accountProps.account,
      );
    }

    const toolingProvisioningRole = accountProps.tooling.provisioningRole
      ? Role.fromRoleArn(
          crossAccountStack,
          `${domainName}-tooling-provisioning-role`,
          resolveCrossAccountProvisioningRole(
            accountProps.tooling.provisioningRole,
            accountProps.account,
            this.props.partition,
          ),
        )
      : accountDefaultBlueprintProvisioningRole;

    // Create custom resource role and user profile in cross-account
    const customResourceRole = this.createCustomResourceRole(
      crossAccountStack,
      resourceConfig.domainConfig.customResourceRoleName,
      accountProps.account,
    );

    domainKmsUsagePolicy.attachToRole(customResourceRole);

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
    const toolingAuthorizedDomainUnitIds = Object.fromEntries(
      (domainProps.tooling?.authorizedDomainUnits ?? ['/root'])
        .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
        .map(unit => [unit, crossAccountDomainConfig.getDomainUnitId(unit)]),
    );

    // Enable Tooling blueprint in cross-account
    this.createManagedBlueprintConfiguration(crossAccountStack, {
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
          domainKmsUsagePolicy,
          domainKmsAdminPolicy,
        ),
      ),
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    // Enable DataLake blueprint in cross-account
    this.createManagedBlueprintConfiguration(crossAccountStack, {
      account: accountProps.account,
      region: accountProps.region ?? this.props.region,
      domainName,
      domainId: crossAccountDomainConfig.domainId,
      blueprintName: 'DataLake',
      lakeformationManageAccessRole,
      authorizedDomainUnits: toolingAuthorizedDomainUnitIds,
      provisioningRole: toolingProvisioningRole,
    });

    if (accountProps.enabledManagedBlueprints) {
      // Enable additional managed blueprints in cross-account
      this.enableManagedBlueprints(
        accountProps.enabledManagedBlueprints,
        crossAccountStack,
        { account: accountProps.account, region: accountProps.region },
        { domainName, domainConfig: crossAccountDomainConfig },
        {
          lakeformationManageAccessRole,
          blueprintProvisioningRole: accountDefaultBlueprintProvisioningRole,
        },
      );
    }

    if (accountProps.enabledCustomBlueprints) {
      this.enableCustomBlueprints(
        crossAccountStack,
        accountProps.enabledCustomBlueprints,
        accountDefaultBlueprintProvisioningRole,
        crossAccountDomainConfig,
      );
    }
  }

  private enableManagedBlueprints(
    enabledManagedBlueprints: { [name: string]: EnabledBlueprintProps },
    scope: Construct,
    targetEnv: EnableBlueprintTargetEnv,
    domainInfo: EnableBlueprintDomainInfo,
    roles: EnableBlueprintRoles,
  ) {
    // Validate that Tooling and DataLake are not in enabledManagedBlueprints
    if ('Tooling' in enabledManagedBlueprints) {
      throw new Error(
        'Tooling blueprint is automatically enabled and should not be included in enabledManagedBlueprints',
      );
    }
    if ('DataLake' in enabledManagedBlueprints) {
      throw new Error(
        'DataLake blueprint is automatically enabled and should not be included in enabledManagedBlueprints',
      );
    }

    Object.entries(enabledManagedBlueprints).forEach(([blueprintName, blueprintProps]) => {
      const authorizedDomainUnits = Object.fromEntries(
        (blueprintProps.authorizedDomainUnits ?? ['/root'])
          .map(unit => (unit.startsWith('/') ? unit : `/${unit}`))
          .map(unit => [unit, domainInfo.domainConfig.getDomainUnitId(unit)]),
      );

      const provisioningRole = blueprintProps.provisioningRole
        ? Role.fromRoleArn(
            scope,
            `${domainInfo.domainName}-${blueprintName}-provisioning-role`,
            resolveCrossAccountProvisioningRole(
              blueprintProps.provisioningRole,
              targetEnv.account,
              this.props.partition,
            ),
          )
        : roles.blueprintProvisioningRole;

      this.createManagedBlueprintConfiguration(scope, {
        account: targetEnv.account,
        region: targetEnv.region ?? this.props.region,
        domainName: domainInfo.domainName,
        domainId: domainInfo.domainConfig.domainId,
        blueprintName,
        lakeformationManageAccessRole: roles.lakeformationManageAccessRole,
        regionalParameters: this.createBlueprintRegionalParams(blueprintProps, targetEnv.region ?? this.props.region),
        authorizedDomainUnits,
        provisioningRole,
      });
    });
  }
}
