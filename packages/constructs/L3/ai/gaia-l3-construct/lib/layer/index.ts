import { MdaaPythonCodeAsset } from '@aws-mdaa/lambda-constructs/lib/code-asset';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

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
