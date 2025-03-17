import * as iam from "aws-cdk-lib/aws-iam";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";

import { SageMakerModelProps, ModelPackageConfig } from "./types";
import {MdaaRole} from "@aws-mdaa/iam-constructs";
import {NagSuppressions} from "cdk-nag";

export function deployPackageModel(
  scope: Construct,
  props: SageMakerModelProps,
  modelConfig: ModelPackageConfig
) {
  const { region, encryptionKey } = props;
  const {
    modelId,
    instanceType,
    initialInstanceCount,
    minInstanceCount,
    maxInstanceCount,
    containerStartupHealthCheckTimeoutInSeconds = 900,
  } = modelConfig;

  const executionRole = new MdaaRole(scope, `SageMakerPackage${modelId}ModelExecutionRole`, {
    naming: props.naming,
    roleName: `SageMakerPackage${modelId.replace("/", "")}ModelExecutionRole`,
    createParams: false,
    createOutputs: false,
    assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
    ]
  });

  const modelPackageMapping = modelConfig.packages(scope);
  const modelPackageName = modelPackageMapping.findInMap(region, "arn");

  const model = new sagemaker.CfnModel(scope, "Model", {
    executionRoleArn: executionRole.roleArn,
    enableNetworkIsolation: true,
    primaryContainer: {
      modelPackageName,
    },
  });

  const endpointConfig = new sagemaker.CfnEndpointConfig(
    scope,
    "EndpointConfig",
    {
      kmsKeyId: encryptionKey?.keyId,
      productionVariants: [
        {
          instanceType,
          initialVariantWeight: 1,
          initialInstanceCount,
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

  if (encryptionKey === undefined) {
    NagSuppressions.addResourceSuppressions(endpointConfig, [
      {
        id: 'NIST.800.53.R5-SageMakerEndpointConfigurationKMSKeyConfigured',
        reason: 'Large models require NVMe instances that do not support KMS.  Instance is managed, in private subnet, and no data is persisted'
      },
      {
        id: 'HIPAA.Security-SageMakerEndpointConfigurationKMSKeyConfigured',
        reason: 'Large models require NVMe instances that do not support KMS.  Instance is managed, in private subnet, and no data is persisted'
      },
      {
        id: 'PCI.DSS.321-SageMakerEndpointConfigurationKMSKeyConfigured',
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
