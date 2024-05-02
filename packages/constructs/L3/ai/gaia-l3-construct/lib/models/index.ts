import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {Construct} from "constructs";
import {ContainerImages, DeploymentType, SageMakerModel,} from "../sagemaker-model";
import {Shared} from "../shared";
import {
  Modality,
  ModelInterface, SagemakerLlmModelConfig,
  SageMakerModelEndpoint,
  SupportedSageMakerModels,
  SystemConfig,
} from "../shared/types";
import {CaefL3Construct, CaefL3ConstructProps} from "@aws-caef/l3-construct";
import {CaefKmsKey} from "@aws-caef/kms-constructs";

export interface ModelsProps extends CaefL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  encryptionKey: CaefKmsKey;
}

export class Models extends CaefL3Construct {
  public readonly models: SageMakerModelEndpoint[];
  public readonly modelsParameter: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: ModelsProps) {
    super(scope, id, props);

    const models: SageMakerModelEndpoint[] = [];

    const falconLiteConfig = Models.getModelConfig(props, SupportedSageMakerModels.FALCON_LITE)

    this.deployFalconIfConfigured(props, models, falconLiteConfig);

    const mistralConfig = Models.getModelConfig(props, SupportedSageMakerModels.MISTRAL7B_INSTRUCT2)

    this.deployMistralIfConfigured(props, models, mistralConfig);

    // To get Jumpstart model ARNs do the following
    // 1. Identify the modelId via https://sagemaker.readthedocs.io/en/stable/doc_utils/pretrainedmodels.html
    // 2. Run the following code
    //
    //      from sagemaker.jumpstart.model import JumpStartModel
    //      region = 'us-east-1'
    //      model_id = 'meta-textgeneration-llama-2-13b-f'
    //      model = JumpStartModel(model_id=model_id, region=region)
    //      print(model.model_package_arn)
    const llama2Config = Models.getModelConfig(props, SupportedSageMakerModels.LLAMA2_13B_CHAT)
    this.deployLlamaIfConfigured(props, models, llama2Config);


    const modelsParameter = new ssm.StringParameter(this, "ModelsParameter", {
      stringValue: JSON.stringify(
        models.map((model) => ({
          name: model.name,
          endpoint: model.endpoint.endpointName,
          responseStreamingSupported: model.responseStreamingSupported,
          inputModalities: model.inputModalities,
          outputModalities: model.outputModalities,
          interface: model.modelInterface,
          ragSupported: model.ragSupported,
        }))
      ),
    });

    this.models = models;
    this.modelsParameter = modelsParameter;
  }

  private deployLlamaIfConfigured(props: ModelsProps, models: SageMakerModelEndpoint[], llama2Config?: SagemakerLlmModelConfig) {
    if (llama2Config !== undefined) {
      const llama2chat = new SageMakerModel(this, "LLamaV2_13B_Chat", {
        ...props,
        vpc: props.shared.vpc,
        encryptionKey: undefined,
        subnets: props.shared.appSubnets,
        region: cdk.Aws.REGION,
        model: {
          type: DeploymentType.ModelPackage,
          modelId: "meta-LLama2-13b-chat",
          instanceType: llama2Config?.instanceType || "ml.m5.12xlarge",
          initialInstanceCount: llama2Config?.initialInstanceCount || 1,
          minInstanceCount: llama2Config?.minimumInstanceCount || 1,
          maxInstanceCount: llama2Config?.maximumInstanceCount || 1,
          packages: (scope) =>
              new cdk.CfnMapping(scope, "Llama2ChatPackageMapping", {
                lazy: true,
                mapping: {
                  "ap-southeast-1": {
                    arn: `arn:${cdk.Aws.PARTITION}:sagemaker:ap-southeast-1:192199979996:model-package/llama2-13b-f-v4-55c7c39a0cf535e8bad0d342598c219b`,
                  },
                  "ap-southeast-2": {
                    arn: `arn:${cdk.Aws.PARTITION}:sagemaker:ap-southeast-2:666831318237:model-package/llama2-13b-f-v4-55c7c39a0cf535e8bad0d342598c219b`,
                  },
                  "eu-west-1": {
                    arn: `arn:${cdk.Aws.PARTITION}:sagemaker:eu-west-1:985815980388:model-package/llama2-13b-f-v4-55c7c39a0cf535e8bad0d342598c219b`,
                  },
                  "us-east-1": {
                    arn: `arn:${cdk.Aws.PARTITION}:sagemaker:us-east-1:865070037744:model-package/llama2-13b-f-v4-55c7c39a0cf535e8bad0d342598c219b`,
                  },
                  "us-east-2": {
                    arn: `arn:${cdk.Aws.PARTITION}:sagemaker:us-east-2:057799348421:model-package/llama2-13b-f-v4-55c7c39a0cf535e8bad0d342598c219b`,
                  },
                  "us-west-2": {
                    arn: `arn:${cdk.Aws.PARTITION}:sagemaker:us-west-2:594846645681:model-package/llama2-13b-f-v4-55c7c39a0cf535e8bad0d342598c219b`,
                  },
                },
              }),
        },
      });

      models.push({
        name: "meta-LLama2-13b-chat",
        endpoint: llama2chat.endpoint,
        responseStreamingSupported: false,
        inputModalities: [Modality.TEXT],
        outputModalities: [Modality.TEXT],
        modelInterface: ModelInterface.LANG_CHAIN,
        ragSupported: true,
      });
    }
  }

  private deployMistralIfConfigured(props: ModelsProps, models: SageMakerModelEndpoint[], mistralConfig?: SagemakerLlmModelConfig) {
    if (mistralConfig !== undefined) {
      const mistral7bInstruct2 = new SageMakerModel(this, "Mistral7BInstruct2", {
        ...props,
        encryptionKey: undefined,
        vpc: props.shared.vpc,
        subnets: props.shared.appSubnets,
        region: cdk.Aws.REGION,
        model: {
          type: DeploymentType.Container,
          modelId: "mistralai/Mistral-7B-Instruct-v0.2",
          container: ContainerImages.HF_PYTORCH_LLM_TGI_INFERENCE_2_0_1,
          instanceType: mistralConfig?.instanceType || "ml.g5.2xlarge",
          initialInstanceCount: mistralConfig?.initialInstanceCount || 1,
          minInstanceCount: mistralConfig?.minimumInstanceCount || 1,
          maxInstanceCount: mistralConfig?.maximumInstanceCount || 1,
          containerStartupHealthCheckTimeoutInSeconds: 300,
          env: {
            HF_TOKEN: props.config.llms?.huggingFaceApiToken || "",
            SM_NUM_GPUS: JSON.stringify(1),
            MAX_BATCH_PREFILL_TOKENS: JSON.stringify(8191),
            MAX_INPUT_LENGTH: JSON.stringify(8191),
            MAX_TOTAL_TOKENS: JSON.stringify(8192),
            MAX_CONCURRENT_REQUESTS: JSON.stringify(4),
          },
        },
      });

      models.push({
        name: mistral7bInstruct2.endpoint.endpointName!,
        endpoint: mistral7bInstruct2.endpoint,
        responseStreamingSupported: false,
        inputModalities: [Modality.TEXT],
        outputModalities: [Modality.TEXT],
        modelInterface: ModelInterface.LANG_CHAIN,
        ragSupported: true,
      });
    }
  }

  private deployFalconIfConfigured(props: ModelsProps, models: SageMakerModelEndpoint[], falconLiteConfig?: SagemakerLlmModelConfig) {
    if (falconLiteConfig !== undefined) {
      const falconLite = new SageMakerModel(this, "FalconLite", {
        ...props,
        encryptionKey: undefined,
        vpc: props.shared.vpc,
        subnets: props.shared.appSubnets,
        region: cdk.Aws.REGION,
        model: {
          type: DeploymentType.Container,
          modelId: "amazon/FalconLite",
          container: ContainerImages.HF_PYTORCH_LLM_TGI_INFERENCE_0_9_3,
          instanceType: falconLiteConfig?.instanceType || "ml.g5.12xlarge",
          initialInstanceCount: falconLiteConfig?.initialInstanceCount || 1,
          minInstanceCount: falconLiteConfig?.minimumInstanceCount || 1,
          maxInstanceCount: falconLiteConfig?.maximumInstanceCount || 1,
          // https://github.com/awslabs/extending-the-context-length-of-open-source-llms/blob/main/custom-tgi-ecr/deploy.ipynb
          containerStartupHealthCheckTimeoutInSeconds: 600,
          env: {
            SM_NUM_GPUS: JSON.stringify(4),
            MAX_INPUT_LENGTH: JSON.stringify(12000),
            MAX_TOTAL_TOKENS: JSON.stringify(12001),
            HF_MODEL_QUANTIZE: "gptq",
            TRUST_REMOTE_CODE: JSON.stringify(true),
            MAX_BATCH_PREFILL_TOKENS: JSON.stringify(12001),
            MAX_BATCH_TOTAL_TOKENS: JSON.stringify(12001),
            GPTQ_BITS: JSON.stringify(4),
            GPTQ_GROUPSIZE: JSON.stringify(128),
            DNTK_ALPHA_SCALER: JSON.stringify(0.25),
          },
        },
      });

      models.push({
        name: falconLite.endpoint.endpointName!,
        endpoint: falconLite.endpoint,
        responseStreamingSupported: false,
        inputModalities: [Modality.TEXT],
        outputModalities: [Modality.TEXT],
        modelInterface: ModelInterface.LANG_CHAIN,
        ragSupported: true,
      });
    }
  }

  private static getModelConfig(props: ModelsProps, targetModel: SupportedSageMakerModels) {
    return props.config.llms?.sagemaker.find(config => config.model === targetModel);
  }
}
