import * as iam from "aws-cdk-lib/aws-iam";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";

import { ContainerImages } from "./container-images";
import { ImageRepositoryMapping } from "./image-repository-mapping";
import { SageMakerModelProps, ModelContainerConfig } from "./types";
import {CaefRole} from "@aws-caef/iam-constructs";
import {NagSuppressions} from "cdk-nag";

export function deployContainerModel(
  scope: Construct,
  props: SageMakerModelProps,
  modelConfig: ModelContainerConfig
) {
  const { region } = props;
  const {
    modelId,
    instanceType,
    containerStartupHealthCheckTimeoutInSeconds = 900,
    env,
    initialInstanceCount,
    minInstanceCount,
    maxInstanceCount
  } = modelConfig;

  const executionRole = new CaefRole(scope, `SageMakerContainer${modelId}ModelExecutionRole`, {
    naming: props.naming,
    roleName: `SageMakerContainer${modelId.replace("/", "")}ModelExecutionRole`,
    createParams: false,
    createOutputs: false,
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
    ]
  });

  const containerImage =
    modelConfig.container ||
    ContainerImages.HF_PYTORCH_LLM_TGI_INFERENCE_LATEST;
  const imageMapping = new ImageRepositoryMapping(
    scope,
    `Container${modelId}ModelMapping`,
    { region }
  );
  const image = `${imageMapping.account}.dkr.ecr.${region}.amazonaws.com/${containerImage}`;

  const modelProps = {
    primaryContainer: {
      image,
      mode: "SingleModel",
      environment: {
        SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
        SAGEMAKER_REGION: region,
        HF_MODEL_ID: modelId,
        ...env,
      },
    },
  };

  const model = new sagemaker.CfnModel(scope, "Model", {
    executionRoleArn: executionRole.roleArn,
    ...modelProps,
    vpcConfig: {
      securityGroupIds: [props.shared.appSecurityGroup.securityGroupId],
      subnets: props.subnets.map(x => x.subnetId),
    },
  });

  const endpointConfig = new sagemaker.CfnEndpointConfig(
    scope,
    "EndpointConfig",
    {
      kmsKeyId: props?.encryptionKey?.keyId,
      productionVariants: [
        {
          instanceType,
          initialVariantWeight: 1,
          initialInstanceCount: initialInstanceCount,
          variantName: "AllTraffic",
          modelName: model.getAtt("ModelName").toString(),
          containerStartupHealthCheckTimeoutInSeconds,
          managedInstanceScaling: {
            minInstanceCount,
            maxInstanceCount
          }
        },
      ],
    }
  );

  if (props.encryptionKey === undefined) {
    NagSuppressions.addResourceSuppressions(endpointConfig, [
      {
        id: 'NIST.800.53.R5-SageMakerEndpointConfigurationKMSKeyConfigured',
        reason: 'Large models require NVMe instances that do not support KMS.  Instance is managed, in private subnet, and no data is persisted'
      },
      {
        id: 'HIPAA.Security-SageMakerEndpointConfigurationKMSKeyConfigured',
        reason: 'Large models require NVMe instances that do not support KMS.  Instance is managed, in private subnet, and no data is persisted'
      },
    ])
  }

  endpointConfig.addDependency(model);

  const endpoint = new sagemaker.CfnEndpoint(scope, modelId, {
    endpointConfigName: endpointConfig.getAtt("EndpointConfigName").toString(),
    endpointName: modelId.split("/").join("-").split(".").join("-"),
  });

  endpoint.addDependency(endpointConfig);



  NagSuppressions.addResourceSuppressions(executionRole, [
    { id: 'AwsSolutions-IAM4', reason: 'Role only used during deployment' }
  ], true)

  return { model, endpoint };
}
