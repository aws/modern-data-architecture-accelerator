/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PipelineStep,
  PipelineNetworkConfig,
  SmProcessingStep,
  SmTrainingStep,
  SmRegisterModelStep,
  SmConditionStep,
  SmModelStep,
  SmTransformStep,
  ConditionOperator,
  StepOutputReference,
  stepOutputRef,
} from '@aws-mdaa/sagemaker-model-training-l3-construct';
import { PipelineStepYamlConfig, NetworkConfigYaml } from './sagemaker-pipeline-config';

const VALID_CONDITION_OPERATORS: readonly ConditionOperator[] = [
  'LessThan',
  'LessThanOrEqualTo',
  'GreaterThan',
  'GreaterThanOrEqualTo',
  'Equals',
  'NotEquals',
];
const VALID_SPLIT_TYPES = ['None', 'Line', 'RecordIO'] as const;
const VALID_ASSEMBLE_WITH = ['None', 'Line'] as const;
const VALID_STRATEGIES = ['SingleRecord', 'MultiRecord'] as const;

function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  fieldName: string,
  stepName: string,
): T {
  if (!validValues.includes(value as T)) {
    throw new Error(`Step '${stepName}': invalid ${fieldName} '${value}'. Valid values: ${validValues.join(', ')}`);
  }
  return value as T;
}

/**
 * Builds PipelineStep instances from YAML config.
 *
 * Resolves inter-step references like "<stepName>.<outputName>"
 * by looking up previously built steps. Steps are built in config order,
 * so a step can only reference steps defined before it.
 *
 * Pipeline parameter references (e.g. {parameter: "InputDataUrl"}) are
 * resolved to SageMaker Pipeline {"Get": "Parameters.X"} expressions.
 */
export function buildPipelineSteps(
  stepConfigs: PipelineStepYamlConfig[],
  roleArn: string,
  kmsKeyId: string,
  defaultNetworkConfig?: NetworkConfigYaml,
  defaultModelPackageGroupName?: string,
): PipelineStep[] {
  const builtSteps = new Map<string, PipelineStep>();
  const result: PipelineStep[] = [];

  for (const cfg of stepConfigs) {
    const step = buildStep(cfg, roleArn, kmsKeyId, defaultNetworkConfig, builtSteps, defaultModelPackageGroupName);
    builtSteps.set(cfg.name, step);
    result.push(step);
  }

  return result;
}

function throwMissingInputError(stepName: string, inputName: string): never {
  throw new Error(`Step '${stepName}' input '${inputName}' requires either 's3Uri' or 'stepOutput'.`);
}

function validateStepConfig<T>(config: T | undefined, stepName: string, typeName: string): T {
  if (!config) {
    throw new Error(`Step '${stepName}' has type '${typeName}' but no '${typeName.toLowerCase()}' configuration.`);
  }
  return config;
}

/**
 * Resolves a value that may be a string, a parameter reference, or a step output reference.
 * Parameter references ({parameter: "X"}) become SageMaker Pipeline {"Get": "Parameters.X"} expressions.
 */
function resolveValueOrParam(
  value: string | { parameter: string } | undefined,
): string | ReturnType<typeof stepOutputRef> | undefined {
  if (!value) return undefined;
  if (typeof value === 'object' && 'parameter' in value) {
    return stepOutputRef(`Parameters.${value.parameter}`);
  }
  return value;
}

function resolveInputUri(
  input: { parameter?: string; stepOutput?: string; s3Uri?: string | { parameter: string } },
  stepName: string,
  inputName: string,
  builtSteps: Map<string, PipelineStep>,
): string | ReturnType<typeof stepOutputRef> {
  if (input.parameter) return stepOutputRef(`Parameters.${input.parameter}`);
  if (input.stepOutput) return resolveStepOutput(input.stepOutput, builtSteps);
  return resolveValueOrParam(input.s3Uri) ?? throwMissingInputError(stepName, inputName);
}

function buildStep(
  cfg: PipelineStepYamlConfig,
  roleArn: string,
  kmsKeyId: string,
  defaultNetworkConfig: NetworkConfigYaml | undefined,
  builtSteps: Map<string, PipelineStep>,
  defaultModelPackageGroupName?: string,
): PipelineStep {
  switch (cfg.type) {
    case 'Processing':
      return buildProcessingStep(cfg, roleArn, kmsKeyId, defaultNetworkConfig, builtSteps);
    case 'Training':
      return buildTrainingStep(cfg, roleArn, kmsKeyId, defaultNetworkConfig, builtSteps);
    case 'RegisterModel':
      return buildRegisterModelStep(cfg, builtSteps, defaultModelPackageGroupName);
    case 'Condition':
      return buildConditionStep(cfg, builtSteps);
    case 'Model':
      return buildModelStep(cfg, roleArn);
    case 'Transform':
      return buildTransformStep(cfg, builtSteps, kmsKeyId);
    default:
      throw new Error(`Unsupported step type: ${cfg.type}`);
  }
}

function resolveNetworkConfig(
  stepIsolation?: boolean,
  defaultConfig?: NetworkConfigYaml,
): PipelineNetworkConfig | undefined {
  if (!defaultConfig) return undefined;
  return {
    enableNetworkIsolation: stepIsolation ?? defaultConfig.enableNetworkIsolation,
    encryptInterContainerTraffic: defaultConfig.encryptInterContainerTraffic,
    subnetIds: defaultConfig.subnetIds,
    securityGroupIds: defaultConfig.securityGroupIds,
  };
}

function resolveStepOutput(ref: string, builtSteps: Map<string, PipelineStep>): StepOutputReference {
  // Format: "<stepName>.<outputName>" or "<stepName>.modelArtifacts"
  const dotIdx = ref.indexOf('.');
  if (dotIdx < 0) throw new Error(`Invalid step reference '${ref}': expected '<stepName>.<outputName>'`);
  const stepName = ref.substring(0, dotIdx);
  const outputName = ref.substring(dotIdx + 1);
  const step = builtSteps.get(stepName);
  if (!step) throw new Error(`Step '${stepName}' not found. Steps must be defined in order.`);

  if (outputName === 'modelArtifacts' && step instanceof SmTrainingStep) {
    return step.modelArtifacts();
  }
  if (outputName === 'modelName' && step instanceof SmModelStep) {
    return step.modelName();
  }
  if (step instanceof SmProcessingStep) {
    return step.output(outputName);
  }
  throw new Error(`Cannot resolve output '${outputName}' from step '${stepName}' of type ${step.constructor.name}`);
}

function buildProcessingStep(
  cfg: PipelineStepYamlConfig,
  roleArn: string,
  kmsKeyId: string,
  defaultNetworkConfig: NetworkConfigYaml | undefined,
  builtSteps: Map<string, PipelineStep>,
): SmProcessingStep {
  const p = validateStepConfig(cfg.processing, cfg.name, 'Processing');
  return new SmProcessingStep(cfg.name, {
    imageUri: p.imageUri,
    instanceType: p.instanceType,
    instanceCount: p.instanceCount,
    scriptS3Uri: p.scriptS3Uri,
    inputs: p.inputs?.map(i => ({
      inputName: i.inputName,
      s3Uri: resolveInputUri(i, cfg.name, i.inputName, builtSteps),
    })),
    outputs: p.outputs?.map(o => ({
      outputName: o.outputName,
      localPath: o.localPath,
    })),
    propertyFiles: p.propertyFiles?.map(pf => ({
      propertyFileName: pf.propertyFileName,
      outputName: pf.outputName,
      filePath: pf.filePath,
    })),
    containerArguments: p.arguments,
    networkConfig: resolveNetworkConfig(p.enableNetworkIsolation, defaultNetworkConfig),
    outputKmsKeyId: kmsKeyId,
    roleArn,
    dependsOn: cfg.dependsOn,
  });
}

function buildTrainingStep(
  cfg: PipelineStepYamlConfig,
  roleArn: string,
  kmsKeyId: string,
  defaultNetworkConfig: NetworkConfigYaml | undefined,
  builtSteps: Map<string, PipelineStep>,
): SmTrainingStep {
  const t = validateStepConfig(cfg.training, cfg.name, 'Training');
  return new SmTrainingStep(cfg.name, {
    imageUri: t.imageUri,
    instanceType: t.instanceType,
    instanceCount: t.instanceCount,
    hyperparameters: t.hyperparameters,
    inputChannels: t.inputChannels.map(ch => ({
      channelName: ch.channelName,
      s3Uri: resolveInputUri(ch, cfg.name, ch.channelName, builtSteps),
      contentType: ch.contentType,
    })),
    outputPath: t.outputPath,
    networkConfig: resolveNetworkConfig(undefined, defaultNetworkConfig),
    outputKmsKeyId: kmsKeyId,
    roleArn,
    dependsOn: cfg.dependsOn,
  });
}

function buildRegisterModelStep(
  cfg: PipelineStepYamlConfig,
  builtSteps: Map<string, PipelineStep>,
  defaultModelPackageGroupName?: string,
): SmRegisterModelStep {
  const r = validateStepConfig(cfg.register, cfg.name, 'RegisterModel');
  let modelData: string | ReturnType<typeof resolveStepOutput> = r.modelData ?? '';
  if (r.modelDataStep) {
    modelData = resolveStepOutput(`${r.modelDataStep}.modelArtifacts`, builtSteps);
  }
  const approvalStatus = resolveValueOrParam(r.approvalStatus);
  const modelPackageGroupName = r.modelPackageGroupName ?? defaultModelPackageGroupName;
  if (!modelPackageGroupName) {
    throw new Error(
      `Step '${cfg.name}': modelPackageGroupName is required for RegisterModel steps. ` +
        `Provide it in the step config or at the top-level pipeline config.`,
    );
  }
  return new SmRegisterModelStep(cfg.name, {
    imageUri: r.imageUri,
    modelData,
    modelPackageGroupName,
    approvalStatus,
    contentTypes: r.contentTypes,
    responseTypes: r.responseTypes,
    inferenceInstanceTypes: r.inferenceInstanceTypes,
    transformInstanceTypes: r.transformInstanceTypes,
    dependsOn: cfg.dependsOn,
  });
}

function buildConditionStep(cfg: PipelineStepYamlConfig, builtSteps: Map<string, PipelineStep>): SmConditionStep {
  const c = validateStepConfig(cfg.condition, cfg.name, 'Condition');

  // Build the if/else sub-steps (these are step names referencing already-built steps)
  const ifSteps = c.ifSteps.map(name => {
    const step = builtSteps.get(name);
    if (!step) throw new Error(`Condition ifStep '${name}' not found. It must be defined before the condition step.`);
    return step;
  });

  const elseSteps = (c.elseSteps ?? []).map(name => {
    const step = builtSteps.get(name);
    if (!step) throw new Error(`Condition elseStep '${name}' not found. It must be defined before the condition step.`);
    return step;
  });

  return new SmConditionStep(cfg.name, {
    conditions: c.conditions.map(cond => ({
      operator: validateEnum(cond.operator, VALID_CONDITION_OPERATORS, 'operator', cfg.name),
      left: {
        stepName: cond.stepName,
        propertyFile: cond.propertyFile,
        jsonPath: cond.jsonPath,
      },
      right: cond.threshold,
    })),
    ifSteps,
    elseSteps,
    dependsOn: cfg.dependsOn,
  });
}

function buildModelStep(cfg: PipelineStepYamlConfig, roleArn: string): SmModelStep {
  const m = validateStepConfig(cfg.model, cfg.name, 'Model');
  const arn = resolveValueOrParam(m.modelPackageArn);
  if (!arn) throw new Error(`Step '${cfg.name}': modelPackageArn is required for Model steps.`);
  return new SmModelStep(cfg.name, {
    modelPackageArn: arn,
    roleArn,
    dependsOn: cfg.dependsOn,
  });
}

function buildTransformStep(
  cfg: PipelineStepYamlConfig,
  builtSteps: Map<string, PipelineStep>,
  kmsKeyId?: string,
): SmTransformStep {
  const t = validateStepConfig(cfg.transform, cfg.name, 'Transform');
  const modelName = resolveStepOutput(`${t.modelNameStep}.modelName`, builtSteps);
  let inputDataUri: string | StepOutputReference;
  if (t.inputDataStepOutput) {
    inputDataUri = resolveStepOutput(t.inputDataStepOutput, builtSteps);
  } else if (t.inputDataUri) {
    inputDataUri = t.inputDataUri;
  } else {
    throw new Error(
      `Step '${cfg.name}': either 'inputDataUri' or 'inputDataStepOutput' is required for Transform steps.`,
    );
  }

  return new SmTransformStep(cfg.name, {
    modelName,
    instanceType: t.instanceType,
    instanceCount: t.instanceCount,
    inputDataUri,
    contentType: t.contentType,
    splitType: t.splitType ? validateEnum(t.splitType, VALID_SPLIT_TYPES, 'splitType', cfg.name) : undefined,
    outputPath: t.outputPath,
    assembleWith: t.assembleWith
      ? validateEnum(t.assembleWith, VALID_ASSEMBLE_WITH, 'assembleWith', cfg.name)
      : undefined,
    maxConcurrentTransforms: t.maxConcurrentTransforms,
    maxPayloadInMB: t.maxPayloadInMB,
    strategy: t.strategy ? validateEnum(t.strategy, VALID_STRATEGIES, 'strategy', cfg.name) : undefined,
    outputKmsKeyId: kmsKeyId,
    dependsOn: cfg.dependsOn,
  });
}
