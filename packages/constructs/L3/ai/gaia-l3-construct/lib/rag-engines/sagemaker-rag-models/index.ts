import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import { DeploymentType, SageMakerModel } from "../../sagemaker-model";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import {CaefL3Construct, CaefL3ConstructProps} from "@aws-caef/l3-construct";
import { CaefKmsKey } from "@aws-caef/kms-constructs";

export interface SageMakerRagModelsProps extends CaefL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  encryptionKey: CaefKmsKey;
}

export class SageMakerRagModels extends CaefL3Construct {
  readonly model?: SageMakerModel;

  constructor(scope: Construct, id: string, props: SageMakerRagModelsProps) {
    super(scope, id, props);

    if (!props.config?.rag?.engines?.aurora) {
      this.model = undefined;
    } else {
      const sageMakerEmbeddingsModelIds = props.config.rag?.embeddingsModels
          .filter((c) => c.provider === "sagemaker")
          .map((c) => c.name);

      const sageMakerCrossEncoderModelIds = props.config.rag?.crossEncoderModels
          .filter((c) => c.provider === "sagemaker")
          .map((c) => c.name);

      const model = new SageMakerModel(this, "Model", {
        ...props,
        vpc: props.shared.vpc,
        subnets: props.shared.appSubnets,
        region: cdk.Aws.REGION,
        model: {
          type: DeploymentType.CustomInferenceScript,
          modelId: [
            ...sageMakerEmbeddingsModelIds || [],
            ...sageMakerCrossEncoderModelIds || [],
          ],
          codeFolder: path.join(__dirname, "./model"),
          instanceType: sageMakerEmbeddingsModelIds.length === 0 ? "ml.m5.large" :  "ml.m5.2xlarge",
        },
      });

      this.model = model;
    }
  }
}
