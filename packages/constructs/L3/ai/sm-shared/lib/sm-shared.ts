/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fn, Stack } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * SageMaker lifecycle script configuration interface for notebook and Studio environment setup with asset deployment and command execution. Defines lifecycle script properties including asset management and shell command execution for automated environment configuration during SageMaker instance startup and creation phases.
 *
 * Use cases: Environment setup automation; Package installation scripts; Custom configuration deployment; Asset provisioning; Development environment preparation; Automated ML environment setup
 *
 * AWS: SageMaker lifecycle configuration scripts with asset deployment and command execution for automated notebook and Studio environment setup
 *
 * Validation: assets must be valid NamedAssetProps if specified; cmds must be valid shell commands executable in SageMaker environment; commands must return appropriate exit codes
 */
export interface LifecycleScriptProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Named assets for SageMaker lifecycle configuration script deployment including files, directories, and resources. Defines asset deployment configuration for lifecycle scripts enabling custom file deployment and resource provisioning during SageMaker environment initialization.
   *
   * Use cases: Custom file deployment; Resource provisioning; Script dependencies; Configuration files; Asset management
   *
   * AWS: SageMaker lifecycle configuration asset deployment for environment customization
   *
   * Validation: Must be valid NamedAssetProps configuration; assets must be accessible during lifecycle execution; optional configuration
   **/
  readonly assets?: NamedAssetProps;
  readonly cmds: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * NamedAssetProps configuration interface for resource configuration and infrastructure management.
 *
 * Use cases: Reusable infrastructure components; CDK construct deployment; Compliance controls; Infrastructure patterns
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface NamedAssetProps {
  /** @jsii ignore */
  readonly [name: string]: AssetProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * SageMaker asset configuration interface for file and directory deployment with source path specification and exclusion patterns. Defines asset properties for packaging and deploying local files, scripts, and directories to SageMaker environments with support for file exclusion patterns and target path specification.
 *
 * Use cases: Script deployment; Configuration file deployment; Asset packaging; File provisioning; Development resource deployment; Custom asset management
 *
 * AWS: S3 asset deployment with CDK asset bundling for SageMaker environment file provisioning and script deployment
 *
 * Validation: sourcePath must be valid local file or directory path; exclude patterns must be valid glob patterns; targetPath must be valid target directory if specified
 */
export interface AssetProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required local file or directory path for SageMaker asset deployment specifying the source location of files to be packaged and deployed. Defines the local filesystem path containing scripts, configurations, or other resources to be made available in SageMaker environments.
   *
   * Use cases: Script deployment; Configuration file deployment; Asset packaging; Local resource deployment; Development file provisioning
   * AWS: CDK asset source path for S3 deployment and SageMaker environment file provisioning
   * Validation: Must be valid local file or directory path; path must exist and be accessible
   *   */
  readonly sourcePath: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Exclusion patterns for asset deployment filtering out unwanted files and directories from asset packaging. Defines glob patterns to exclude specific files or directories during asset deployment for optimized asset size and security compliance.
   *
   * Use cases: Asset filtering; Security compliance; Size optimization; Unwanted file exclusion; Deployment optimization
   *
   * AWS: CDK asset bundling exclusion patterns for optimized asset deployment
   *
   * Validation: Must be valid glob patterns; patterns applied during asset bundling; optional array for file exclusion
   **/
  readonly exclude?: string[];
}
export interface AssetDeploymentProps {
  readonly scope: Construct;
  readonly assetBucket: IBucket;
  readonly assetPrefix: string;
  readonly assetDeploymentRole: IRole;
  readonly memoryLimitMB?: number;
}
export class LifeCycleConfigHelper {
  public static createLifecycleConfigContents(
    scriptProps: LifecycleScriptProps,
    lifecycleType: string,
    assetDeployment?: AssetDeploymentProps,
  ): string {
    let cmds = scriptProps.cmds;
    if (scriptProps.assets) {
      if (!assetDeployment) {
        throw new Error('assetDeployment must be defined if assets defined');
      }
      this.createAssets(scriptProps.assets, lifecycleType, assetDeployment);
      const assetS3CopyPath = `${assetDeployment.assetPrefix}/${lifecycleType}/`;
      const setAssetEnvCmd = `export ASSETS_DIR=/tmp/lifecycle-assets/${lifecycleType}`;
      const assetCopyCmd = `aws s3 cp --recursive ${assetDeployment.assetBucket.s3UrlForObject(
        assetS3CopyPath,
      )} $ASSETS_DIR`;
      cmds = [setAssetEnvCmd, assetCopyCmd, ...scriptProps.cmds];
    }
    const cmdsString = cmds.join('\n');
    return Fn.base64(cmdsString);
  }

  private static createAssets(
    namedAssetProps: NamedAssetProps,
    lifecycleType: string,
    assetDeployment: AssetDeploymentProps,
  ) {
    //create assets
    Object.entries(namedAssetProps).forEach(assetEntry => {
      const assetName = assetEntry[0];
      const assetProps = assetEntry[1];

      const assetSource = Source.asset(assetProps.sourcePath, { exclude: assetProps.exclude });

      new BucketDeployment(assetDeployment.scope, `asset-deployment-${assetName}-${lifecycleType}`, {
        sources: [assetSource],
        destinationBucket: assetDeployment.assetBucket,
        destinationKeyPrefix: `${assetDeployment.assetPrefix}/${lifecycleType}/${assetName}`,
        role: assetDeployment.assetDeploymentRole,
        extract: true,
        memoryLimit: assetDeployment.memoryLimitMB,
      });
    });

    // BucketDeployment adds an inline policy to asset deployment role
    // permitting the copy of assets from cdk depoy bucket to destination bucket.
    MdaaNagSuppressions.addCodeResourceSuppressions(
      assetDeployment.assetDeploymentRole,
      [
        { id: 'AwsSolutions-IAM5', reason: 'Inline policy used only for deployment.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
      ],
      true,
    );

    // BucketDeployment uses a Custom Resource Lambda to copy assets
    // from CDK Deployment bucket to destination bucket.
    Stack.of(assetDeployment.scope).node.children.forEach(child => {
      if (child.node.id.includes('Custom::CDKBucketDeployment')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          child,
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
    });
  }
}
