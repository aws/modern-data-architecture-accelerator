/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey, DECRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { MdaaRole, MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { Aws } from 'aws-cdk-lib';
import { CfnModel, CfnEndpointConfig, CfnEndpoint } from 'aws-cdk-lib/aws-sagemaker';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import {
  INLINE_POLICY_SUPPRESSIONS,
  validateProjectName,
  throwConfigValidationError,
  addSageMakerTags,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  validateVpcConfig,
} from '@aws-mdaa/sm-shared';

const MAX_NAME_LENGTH = 63;

/** Production variant configuration for endpoint. */
export interface EndpointProductionVariant {
  /** ML instance type (e.g. 'ml.m5.2xlarge') */
  readonly instanceType: string;
  /** Number of instances (default: 1) */
  readonly instanceCount?: number;
  /** Variant name (default: 'AllTraffic') */
  readonly variantName?: string;
  /** Initial variant weight (default: 1) */
  readonly initialVariantWeight?: number;
}

/** Data capture configuration for endpoint. */
export interface EndpointDataCaptureConfig {
  /** Enable data capture (default: false) */
  readonly enableCapture?: boolean;
  /** Sampling percentage 0-100 (default: 100) */
  readonly samplingPercentage?: number;
  /** CSV content types to capture */
  readonly csvContentTypes?: string[];
  /** JSON content types to capture */
  readonly jsonContentTypes?: string[];
}

/** VPC configuration for endpoint network isolation. */
export interface EndpointNetworkConfig {
  /** VPC ID */
  readonly vpcId?: string;
  /** Subnet IDs for the endpoint */
  readonly subnetIds?: string[];
  /** Security group IDs for the endpoint */
  readonly securityGroupIds?: string[];
  /** Enable network isolation (default: false) */
  readonly enableNetworkIsolation?: boolean;
}

export interface SageMakerEndpointL3ConstructProps extends MdaaL3ConstructProps {
  /** SageMaker project name */
  readonly projectName: string;
  /** SageMaker domain ID (for tagging) */
  readonly domainId?: string;
  /** SageMaker domain ARN (for tagging) */
  readonly domainArn?: string;
  /** ARN of the approved Model Package to deploy */
  readonly modelPackageArn: string;
  /** S3 bucket name containing model artifacts (for IAM permissions) */
  readonly modelBucketName: string;
  /** Stage name (e.g. 'dev', 'preprod', 'prod') — used in resource naming */
  readonly stageName: string;
  /** Production variant configuration */
  readonly productionVariant?: EndpointProductionVariant;
  /** Data capture configuration */
  readonly dataCaptureConfig?: EndpointDataCaptureConfig;
  /** Network configuration */
  readonly networkConfig?: EndpointNetworkConfig;
  /** Optional external KMS key ARN for cross-account model artifact decryption */
  readonly modelArtifactKmsKeyArn?: string;
}

/**
 * L3 construct for a SageMaker real-time inference endpoint.
 *
 * Creates MDAA-compliant:
 * - CfnModel (from approved ModelPackage)
 * - CfnEndpointConfig (KMS encrypted, optional data capture)
 * - CfnEndpoint
 * - MdaaRole for model execution (SageMaker principal)
 * - MdaaKmsKey for endpoint encryption
 *
 * Exports via SSM:
 * - endpoint-name, endpoint-arn, model-name, kms-key-id
 */
export class SageMakerEndpointL3Construct extends MdaaL3Construct {
  public readonly endpoint: CfnEndpoint;
  public readonly endpointConfig: CfnEndpointConfig;
  public readonly model: CfnModel;
  public readonly kmsKey: MdaaKmsKey;
  public readonly executionRole: MdaaRole;

  constructor(scope: Construct, id: string, props: SageMakerEndpointL3ConstructProps) {
    super(scope, id, props);

    const projectName = props.projectName;
    validateProjectName(projectName);

    if (!props.modelPackageArn) {
      throwConfigValidationError('modelPackageArn is required for endpoint construct.');
    }
    if (!props.modelBucketName) {
      throwConfigValidationError('modelBucketName is required for endpoint construct.');
    }

    const stageName = props.stageName;
    if (!/^[a-z0-9-]{1,20}$/.test(stageName)) {
      throwConfigValidationError(
        `stageName must be 1-20 lowercase alphanumeric/hyphen characters. Received: '${stageName}'.`,
      );
    }
    addSageMakerTags(this, projectName, props.domainId, props.domainArn);

    // KMS key for endpoint encryption
    this.kmsKey = new MdaaKmsKey(this, 'endpoint-kms-key', {
      alias: `endpoint-${projectName}-${stageName}`,
      naming: props.naming,
    });

    // Model execution role
    this.executionRole = new MdaaRole(this, 'model-execution-role', {
      naming: props.naming,
      roleName: `endpoint-exec-${projectName}-${stageName}`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });

    // Model artifact S3 access
    const modelArtifactPolicy = new MdaaManagedPolicy(this, 'model-artifact-policy', {
      naming: props.naming,
      managedPolicyName: `ep-s3-${projectName}-${stageName}`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:GetBucket*', 's3:ListBucket'],
          resources: [
            `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}`,
            `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}/*`,
          ],
        }),
      ],
      roles: [this.executionRole],
    });

    // ECR access for container images
    addEcrReadPolicy(this.executionRole);

    // CloudWatch logs
    addCloudWatchLogsPolicy(this.executionRole, '/aws/sagemaker/');

    // KMS permissions
    this.kmsKey.grantEncryptDecrypt(this.executionRole);

    // Cross-account model artifact KMS key access
    if (props.modelArtifactKmsKeyArn) {
      this.executionRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [...DECRYPT_ACTIONS, 'kms:DescribeKey'],
          resources: [props.modelArtifactKmsKeyArn],
        }),
      );
    }

    // VPC config for network isolation
    const networkConfig = props.networkConfig;
    let vpcConfig: CfnModel.VpcConfigProperty | undefined;
    if (networkConfig && validateVpcConfig(networkConfig)) {
      vpcConfig = {
        subnets: networkConfig.subnetIds!,
        securityGroupIds: networkConfig.securityGroupIds!,
      };

      // EC2 network interface permissions for VPC mode
      const vpcNetworkPolicy = new MdaaManagedPolicy(this, 'vpc-network-policy', {
        naming: props.naming,
        managedPolicyName: `ep-vpc-${projectName}-${stageName}`,
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              'ec2:CreateNetworkInterface',
              'ec2:CreateNetworkInterfacePermission',
              'ec2:DeleteNetworkInterface',
              'ec2:DeleteNetworkInterfacePermission',
              'ec2:DescribeNetworkInterfaces',
              'ec2:DescribeVpcs',
              'ec2:DescribeSubnets',
              'ec2:DescribeSecurityGroups',
              'ec2:DescribeDhcpOptions',
            ],
            resources: ['*'], // EC2 Describe* and CreateNetworkInterface require wildcard
          }),
        ],
        roles: [this.executionRole],
      });

      MdaaNagSuppressions.addCodeResourceSuppressions(
        vpcNetworkPolicy,
        [
          {
            id: 'AwsSolutions-IAM5',
            reason:
              'EC2 network interface actions require wildcard: Describe* do not support resource-level permissions, ' +
              'and CreateNetworkInterface targets ENIs created dynamically by SageMaker at runtime.',
          },
        ],
        true,
      );
    }

    // CfnModel — no custom name to allow CloudFormation replacement updates
    // (e.g., when modelPackageArn changes to a new model version).
    // SageMaker Model replacement uses CREATE_BEFORE_DELETE, which fails if the
    // name is fixed because the old resource still exists during creation.
    this.model = new CfnModel(this, 'model', {
      executionRoleArn: this.executionRole.roleArn,
      containers: [{ modelPackageName: props.modelPackageArn }],
      enableNetworkIsolation: networkConfig?.enableNetworkIsolation ?? false,
      vpcConfig,
    });

    // CfnEndpointConfig
    const variant: EndpointProductionVariant = props.productionVariant ?? {
      instanceType: 'ml.m5.2xlarge',
    };

    let dataCaptureConfig: CfnEndpointConfig.DataCaptureConfigProperty | undefined;
    if (props.dataCaptureConfig?.enableCapture) {
      const dc = props.dataCaptureConfig;
      dataCaptureConfig = {
        captureOptions: [{ captureMode: 'Input' }, { captureMode: 'Output' }],
        destinationS3Uri: `s3://${props.modelBucketName}/endpoint-data-capture`,
        initialSamplingPercentage: dc.samplingPercentage ?? 100,
        captureContentTypeHeader: {
          csvContentTypes: dc.csvContentTypes ?? ['text/csv'],
          jsonContentTypes: dc.jsonContentTypes ?? ['application/json'],
        },
        enableCapture: true,
        kmsKeyId: this.kmsKey.keyId,
      };

      // Data capture write permissions
      modelArtifactPolicy.addStatements(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject', 's3:PutObjectTagging', 's3:AbortMultipartUpload'],
          resources: [`arn:${Aws.PARTITION}:s3:::${props.modelBucketName}/endpoint-data-capture/*`],
        }),
      );
    }

    // EndpointConfig — no custom name to allow CloudFormation replacement updates
    // (e.g., when adding data capture). The endpoint references it via Ref, not by name.
    this.endpointConfig = new CfnEndpointConfig(this, 'endpoint-config', {
      kmsKeyId: this.kmsKey.keyId,
      dataCaptureConfig,
      productionVariants: [
        {
          modelName: this.model.attrModelName,
          instanceType: variant.instanceType,
          initialInstanceCount: variant.instanceCount ?? 1,
          variantName: variant.variantName ?? 'AllTraffic',
          initialVariantWeight: variant.initialVariantWeight ?? 1,
        },
      ],
    });
    this.endpointConfig.addDependency(this.model);

    // Ensure IAM policies are created before SageMaker validates model S3 access.
    // Without this, CloudFormation may create the CfnModel before the managed policy
    // is attached, causing "Access denied" on model artifact S3 access.
    this.model.node.addDependency(modelArtifactPolicy);

    // CfnEndpoint
    const endpointName = props.naming.resourceName(`${projectName}-${stageName}-ep`, MAX_NAME_LENGTH);
    this.endpoint = new CfnEndpoint(this, 'endpoint', {
      endpointConfigName: this.endpointConfig.attrEndpointConfigName,
      endpointName,
    });
    this.endpoint.addDependency(this.endpointConfig);

    // CDK Nag suppressions
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.executionRole,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required: ecr:GetAuthorizationToken is account-level, ' +
            'CloudWatch log resource names are dynamically generated, S3 object paths are prefixed.',
        },
      ],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      modelArtifactPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'S3 wildcard on model bucket prefix and data capture prefix required for SageMaker model access.',
        },
      ],
      true,
    );

    // SSM exports
    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'endpoint',
      resourceId: `${projectName}-${stageName}`,
      name: 'endpoint-name',
      value: endpointName,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'endpoint',
      resourceId: `${projectName}-${stageName}`,
      name: 'endpoint-arn',
      value: `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/${endpointName}`,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'endpoint',
      resourceId: `${projectName}-${stageName}`,
      name: 'model-name',
      value: this.model.attrModelName,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'endpoint',
      resourceId: `${projectName}-${stageName}`,
      name: 'kms-key-id',
      value: this.kmsKey.keyId,
    });
  }
}
