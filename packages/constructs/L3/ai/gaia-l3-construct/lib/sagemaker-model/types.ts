import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import {CaefL3ConstructProps} from "@aws-caef/l3-construct";
import {Shared} from "../shared";
import {CaefKmsKey} from "@aws-caef/kms-constructs";

export interface SageMakerModelProps extends cdk.NestedStackProps, CaefL3ConstructProps {
  vpc: ec2.IVpc;
  subnets: ec2.ISubnet[]
  region: string;
  model: ModelConfig;
  shared: Shared;
  encryptionKey?: CaefKmsKey;
}

export enum DeploymentType {
  Container = "container",
  ModelPackage = "model-package",
  CustomInferenceScript = "custom-inference-script",
}

export type ModelConfig =
  | ModelContainerConfig
  | ModelPackageConfig
  | ModelCustomScriptConfig;

export interface ModelConfigBase {
  modelId: string;
  instanceType: string;
}

export interface ModelContainerConfig extends ModelConfigBase {
  type: DeploymentType.Container;
  container?: string;
  env?: { [key: string]: string };
  containerStartupHealthCheckTimeoutInSeconds?: number;
}

export interface ModelPackageConfig extends ModelConfigBase {
  type: DeploymentType.ModelPackage;
  packages: (scope: Construct) => cdk.CfnMapping;
  containerStartupHealthCheckTimeoutInSeconds?: number;
}

export interface ModelCustomScriptConfig
  extends Omit<ModelConfigBase, "modelId"> {
  type: DeploymentType.CustomInferenceScript;
  modelId: string | string[];
  codeFolder: string;
  container?: string;
  env?: { [key: string]: string };
  architecture?: lambda.Architecture;
  runtime?: lambda.Runtime;
}
