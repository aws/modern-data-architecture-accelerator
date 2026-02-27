/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { MdaaBoto3LayerVersion } from '@aws-mdaa/lambda-constructs';
import { BOOTSTRAP_QUALIFIER_CONTEXT, CfnParameterProps, DefaultStackSynthesizer, Duration, Stack } from 'aws-cdk-lib';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { DataZoneAuthorizationConstruct, EntityType, NamedAuthorizationPolicies } from './authorization';
import { DomainConfig } from './domain_config';

export interface MdaaSageMakerBluePrintParameterProps {
  readonly fieldType: string;
  readonly defaultValue?: string;
  readonly description?: string;
  readonly isEditable?: boolean;
  readonly isOptional?: boolean;
  readonly isUpdateSupported?: boolean;
}
export interface MdaaSageMakerBluePrintParameterConfig {
  readonly blueprintParamProps: MdaaSageMakerBluePrintParameterProps;
  readonly cfnParamProps?: CfnParameterProps;
}
export interface MdaaSageMakerCustomBlueprintConstructProps extends MdaaConstructProps {
  readonly domainConfig: DomainConfig;
  readonly description?: string;
  readonly provisioningRoleArn: string;
  readonly blueprintName: string;
  readonly templateUrl: string;
  readonly domainBucket: IBucket;
  readonly enabledRegions?: string[];
  readonly parameters?: { [key: string]: MdaaSageMakerBluePrintParameterConfig };
  readonly authorizedDomainUnits?: { [name: string]: string };
  readonly region: string;
  readonly account: string;
}

export class MdaaSageMakerCustomBlueprintConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MdaaSageMakerCustomBlueprintConstructProps) {
    super(scope, id);

    //Create SageMaker Blueprint using custom resource
    const createBpStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'datazone:CreateEnvironmentBlueprint',
        'datazone:PutEnvironmentBlueprintConfiguration',
        'datazone:ListEnvironmentBlueprints',
        'datazone:UpdateEnvironmentBlueprint',
        'datazone:DeleteEnvironmentBlueprint',
      ],
      resources: ['*'],
    });

    const policyStatements = [createBpStatement];

    policyStatements.push(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [props.provisioningRoleArn],
      }),
    );

    const templateKey = `blueprints/${props.blueprintName}.json`;

    // Automatically include the standard MDAA parameters that MdaaBlueprintProductStack creates.
    // These parameters (org, domain, env, module) are automatically created by MdaaBlueprintProductStack
    // and must be registered as blueprint parameters.
    const userParameters = Object.entries(props.parameters || {}).map(([paramName, paramProps]) => {
      if (!/^\w+$/.test(paramName)) {
        throw new Error('Param names used in blueprints must match ^[a-zA-Z0-9_]+$');
      }
      return {
        ...paramProps.blueprintParamProps,
        keyName: paramName,
      };
    });

    const domainKmsUsagePolicy = ManagedPolicy.fromManagedPolicyName(
      this,
      'domain-kms-managed-policy',
      props.domainConfig.domainKmsUsagePolicyName,
    );

    const domainBucketUsagePolicy = ManagedPolicy.fromManagedPolicyName(
      this,
      'domain-bucket-managed-policy',
      props.domainConfig.domainBucketUsagePolicyName,
    );
    const domainKey = Key.fromKeyArn(this, 'domain-key-import', props.domainConfig.domainKmsKeyArn);

    // We need to use a custom resource here because CfnEnvironmentBlueprintConfiguration supports only managed blueprints
    const bpProps: MdaaCustomResourceProps = {
      resourceType: 'SageMakerEnvironmentBluePrint',
      code: Code.fromAsset(`${__dirname}/../src/lambda/environment_blueprint`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'lambda.lambda_handler',
      handlerRoleManagedPolicies: [domainBucketUsagePolicy, domainKmsUsagePolicy],
      handlerRolePolicyStatements: policyStatements,
      handlerLayers: [new MdaaBoto3LayerVersion(this, 'boto3-layer', { naming: props.naming })],
      handlerPolicySuppressions: [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'datazone:Create/Update/DeleteEnvironmentBlueprint does not take a resource',
        },
      ],
      handlerProps: {
        provisioning_role_arn: props.provisioningRoleArn,
        domain_id: props.domainConfig.domainId,
        blueprint_name: props.blueprintName,
        blueprint_description: props.description,
        template_source_url: props.templateUrl,
        template_bucket: props.domainBucket.bucketName,
        template_key: templateKey,
        template_bucket_region_domain_name: props.domainBucket.bucketRegionalDomainName,
        user_parameters: userParameters,
        enabled_regions: [props.region, ...(props.enabledRegions || [])],
      },
      naming: props.naming,
      handlerTimeout: Duration.seconds(120),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    const bp = new MdaaCustomResource(this, 'env-blueprint', bpProps);
    const blueprintId = bp.getAttString('BlueprintId');
    const authorizationPolicies: NamedAuthorizationPolicies = Object.fromEntries(
      Object.entries(props.authorizedDomainUnits || {}).map(([domainUnit, domainUnitId]) => {
        return [
          `blueprint-${domainUnit}`,
          {
            policyType: 'CREATE_ENVIRONMENT_FROM_BLUEPRINT',
            principals: [{ allUsersGrantFilter: true }],
            includeChildDomainUnits: true,
            domainUnitId: domainUnitId,
          },
        ];
      }),
    );

    const authConstruct = new DataZoneAuthorizationConstruct(this, 'blueprint-authorization', {
      naming: props.naming,
      domainId: props.domainConfig.domainId,
      entityId: `${props.account}:${blueprintId}`,
      entityType: EntityType.ENVIRONMENT_BLUEPRINT_CONFIGURATION,
      policies: authorizationPolicies,
    });
    authConstruct.node.addDependency(bp);
    if (bp.handlerFunction.role) {
      const qualifier =
        this.node.tryGetContext(BOOTSTRAP_QUALIFIER_CONTEXT) ?? DefaultStackSynthesizer.DEFAULT_QUALIFIER;

      const cdkAssetBucketName = `cdk-${qualifier}-assets-${props.account}-${props.region}`;
      const cdkAssetBucket = Bucket.fromBucketName(this, 'cdk-asset-bucket', cdkAssetBucketName);
      cdkAssetBucket.grantRead(bp.handlerFunction.role);
    }

    const deploymentCid = 'ProductAssetsDeployment';
    const bucketDeployment = props.domainBucket.node.tryFindChild(deploymentCid) as BucketDeployment;

    if (bucketDeployment) {
      const grantDecrypt = domainKey.grantDecrypt(bucketDeployment.handlerRole);
      const grantDataKey = domainKey.grant(bucketDeployment.handlerRole, 'kms:GenerateDataKey');
      bucketDeployment.node.addDependency(grantDecrypt);
      bucketDeployment.node.addDependency(grantDataKey);
      MdaaNagSuppressions.addCodeResourceSuppressions(
        bucketDeployment.handlerRole,
        [
          { id: 'AwsSolutions-IAM4', reason: 'Role used only for deployment.' },
          { id: 'AwsSolutions-IAM5', reason: 'Inline policy used only for deployment.' },
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
          { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
        ],
        true,
      );
    }
    // BucketDeployment uses a Custom Resource Lambda to copy assets
    // from CDK Deployment bucket to destination bucket.
    MdaaNagSuppressions.addCodeResourceSuppressions(
      Stack.of(this),
      [
        { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is used only as custom resource during CDK deployment.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
        },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason:
            'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is used only as custom resource during CDK deployment.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is used only as custom resource during CDK deployment.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason:
            'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason:
            'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
        },
      ],
      true,
    );
  }
}
