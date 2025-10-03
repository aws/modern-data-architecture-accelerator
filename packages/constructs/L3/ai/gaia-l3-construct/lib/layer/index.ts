import { MdaaPythonCodeAsset } from '@aws-mdaa/lambda-constructs/lib/code-asset';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * Lambda Layer configuration interface for GAIA GenAI application dependency management with runtime and architecture specification. Defines Lambda layer properties for packaging and deploying shared libraries, dependencies, and custom code for GenAI Lambda functions with support for runtime-specific configurations and automatic upgrades.
 * Use cases: Lambda dependency management; Shared library deployment; GenAI function layers; Runtime-specific packaging; Dependency optimization
 * AWS: AWS Lambda Layer configuration for GAIA GenAI applications with runtime and architecture-specific dependency packaging
 * Validation: runtime must be valid Lambda runtime; architecture must be valid Lambda architecture; assetOverridePath must be valid directory path if specified
 */
interface LayerProps {
  runtime: lambda.Runtime;
  architecture: lambda.Architecture;
  assetOverridePath?: string;
  autoUpgrade?: boolean;
}

export class Layer extends Construct {
  public layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LayerProps) {
    super(scope, id);

    const { runtime, architecture } = props;

    const assetCode = new MdaaPythonCodeAsset(this, 'layer-code', {
      pythonRequirementsPath: `${__dirname}/../shared/layers/common/requirements.txt`,
    });

    this.layer = new lambda.LayerVersion(this, 'Layer', {
      code: assetCode.code,
      compatibleRuntimes: [runtime],
      compatibleArchitectures: [architecture],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
