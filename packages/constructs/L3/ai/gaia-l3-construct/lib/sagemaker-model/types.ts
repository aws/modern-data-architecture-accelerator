import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Shared } from '../shared';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface SageMakerModelProps extends cdk.NestedStackProps, MdaaL3ConstructProps {
  readonly vpc: ec2.IVpc;
  readonly subnets: ec2.ISubnet[];
  readonly region: string;
  readonly model: ModelConfig;
  readonly shared: Shared;
  readonly encryptionKey?: MdaaKmsKey;
}

export enum DeploymentType {
  Container = 'container',
  ModelPackage = 'model-package',
  CustomInferenceScript = 'custom-inference-script',
}

export type ModelConfig = ModelContainerConfig | ModelPackageConfig | ModelCustomScriptConfig;

export interface ModelConfigBase {
  readonly modelId: string;
  readonly instanceType: string;
  readonly initialInstanceCount: number;
  readonly minInstanceCount: number;
  readonly maxInstanceCount: number;
}

export interface ModelContainerConfig extends ModelConfigBase {
  readonly type: DeploymentType.Container;
  readonly container?: string;
  readonly env?: { [key: string]: string };
  readonly containerStartupHealthCheckTimeoutInSeconds?: number;
}

export interface ModelPackageConfig extends ModelConfigBase {
  readonly type: DeploymentType.ModelPackage;
  packages: (scope: Construct) => cdk.CfnMapping;
  readonly containerStartupHealthCheckTimeoutInSeconds?: number;
}

export interface ModelCustomScriptConfig extends Omit<ModelConfigBase, 'modelId'> {
  readonly type: DeploymentType.CustomInferenceScript;
  readonly modelId: string | string[];
  readonly codeFolder: string;
  readonly container?: string;
  readonly env?: { [key: string]: string };
  readonly architecture?: lambda.Architecture;
  readonly runtime?: lambda.Runtime;
}
