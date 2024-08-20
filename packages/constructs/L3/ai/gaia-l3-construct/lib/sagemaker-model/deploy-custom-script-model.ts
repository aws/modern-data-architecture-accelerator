import { Construct } from "constructs";

import { HuggingFaceCustomScriptModel } from "./hf-custom-script-model";
import { SageMakerModelProps, ModelCustomScriptConfig } from "./types";
import { createHash } from "crypto";

export function deployCustomScriptModel(
  scope: Construct,
  props: SageMakerModelProps,
  modelConfig: ModelCustomScriptConfig
) {
  const { vpc, region, encryptionKey } = props;
  const {
    modelId,
    instanceType,
    initialInstanceCount,
    minInstanceCount,
    maxInstanceCount,
    codeFolder,
    container,
    env
  } = modelConfig;

  const endpointName = (
    Array.isArray(modelId)
      // nosemgrep
      ? `Multi${createHash("md5") //NOSONAR - not a cryptographic use
          .update(modelId.join(","))
          .digest("hex")
          .toUpperCase()
          .slice(-5)}`
      : modelId
  )
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-10);
  if (!encryptionKey) throw new Error('Encryption Key required for custom hugging face custom scripts')
  const llmModel = new HuggingFaceCustomScriptModel(scope, endpointName, {
    ...props,
    encryptionKey,
    vpc,
    region,
    modelId,
    instanceType,
    initialInstanceCount,
    minInstanceCount,
    maxInstanceCount,
    codeFolder,
    container,
    env,
  });

  return { model: llmModel.model, endpoint: llmModel.endpoint };
}
