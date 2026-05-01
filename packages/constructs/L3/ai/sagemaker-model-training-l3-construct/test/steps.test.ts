/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Test assertions on untyped pipeline definition JSON */

import { SmProcessingStep } from '../lib/steps/processing-step';
import { SmTrainingStep } from '../lib/steps/training-step';
import { SmRegisterModelStep } from '../lib/steps/register-model-step';
import { SmConditionStep } from '../lib/steps/condition-step';
import { SmModelStep } from '../lib/steps/model-step';
import { SmTransformStep } from '../lib/steps/transform-step';
import { SmPipelineDefinition } from '../lib/steps/pipeline-definition';
import { stepOutputRef } from '../lib/steps/pipeline-step';

const TEST_ROLE_ARN = 'arn:aws:iam::123456789012:role/test-role';
const TEST_IMAGE_URI = '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest';
const TEST_KMS_KEY_ID = 'arn:aws:kms:us-east-1:123456789012:key/test-key';

describe('PipelineStep base', () => {
  it('rejects invalid step names', () => {
    expect(
      () =>
        new SmProcessingStep('123-invalid', {
          imageUri: TEST_IMAGE_URI,
          instanceType: 'ml.m5.xlarge',
          roleArn: TEST_ROLE_ARN,
        }),
    ).toThrow(/Invalid step name/);
  });

  it('rejects step names exceeding 256 characters', () => {
    const longName = 'A'.repeat(257);
    expect(
      () =>
        new SmProcessingStep(longName, {
          imageUri: TEST_IMAGE_URI,
          instanceType: 'ml.m5.xlarge',
          roleArn: TEST_ROLE_ARN,
        }),
    ).toThrow(/exceeds 256 character limit/);
  });
});

describe('SmProcessingStep', () => {
  it('generates a basic processing step definition', () => {
    const step = new SmProcessingStep('PreprocessData', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      scriptS3Uri: 's3://bucket/scripts/preprocessing.py',
      inputs: [
        {
          inputName: 'input-data',
          s3Uri: 's3://bucket/dataset/data.csv',
        },
      ],
      outputs: [{ outputName: 'train' }, { outputName: 'validation' }, { outputName: 'test' }],
    });

    const def = step.toDefinition();
    expect(def.name).toBe('PreprocessData');
    expect(def.type).toBe('Processing');
    expect(def.arguments).toBeDefined();

    const args = def.arguments!;
    expect(args['RoleArn']).toBe(TEST_ROLE_ARN);
    expect((args['ProcessingResources'] as any).ClusterConfig.InstanceType).toBe('ml.m5.xlarge');
    expect((args['ProcessingResources'] as any).ClusterConfig.InstanceCount).toBe(1);

    // Should have code input + data input
    const inputs = args['ProcessingInputs'] as any[];
    expect(inputs).toHaveLength(2);
    expect(inputs[0].InputName).toBe('code');
    expect(inputs[1].InputName).toBe('input-data');

    // Should have 3 outputs
    const outputs = (args['ProcessingOutputConfig'] as any).Outputs;
    expect(outputs).toHaveLength(3);
    expect(outputs[0].OutputName).toBe('train');
    expect(outputs[1].OutputName).toBe('validation');
    expect(outputs[2].OutputName).toBe('test');
  });

  it('generates output references', () => {
    const step = new SmProcessingStep('Preprocess', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputs: [{ outputName: 'train' }],
    });

    const ref = step.output('train');
    expect(ref.get).toBe("Steps.Preprocess.ProcessingOutputConfig.Outputs['train'].S3Output.S3Uri");
  });

  it('includes network config when provided', () => {
    const step = new SmProcessingStep('Step', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      networkConfig: {
        enableNetworkIsolation: true,
        encryptInterContainerTraffic: true,
        subnetIds: ['subnet-123'],
        securityGroupIds: ['sg-456'],
      },
    });

    const args = step.toDefinition().arguments!;
    const nc = args['NetworkConfig'] as any;
    expect(nc.EnableNetworkIsolation).toBe(true);
    expect(nc.VpcConfig.Subnets).toEqual(['subnet-123']);
  });

  it('includes KMS key in output config', () => {
    const step = new SmProcessingStep('Step', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputKmsKeyId: TEST_KMS_KEY_ID,
      outputs: [{ outputName: 'out' }],
    });

    const args = step.toDefinition().arguments!;
    expect((args['ProcessingOutputConfig'] as any).KmsKeyId).toBe(TEST_KMS_KEY_ID);
    expect((args['ProcessingResources'] as any).ClusterConfig.VolumeKmsKeyId).toBe(TEST_KMS_KEY_ID);
  });
});

describe('SmTrainingStep', () => {
  it('generates a training step with hyperparameters and input channels', () => {
    const step = new SmTrainingStep('TrainModel', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputPath: 's3://bucket/output',
      hyperparameters: {
        objective: 'reg:linear',
        num_round: '50',
        max_depth: '5',
      },
      inputChannels: [
        { channelName: 'train', s3Uri: 's3://bucket/train', contentType: 'text/csv' },
        { channelName: 'validation', s3Uri: 's3://bucket/val', contentType: 'text/csv' },
      ],
    });

    const def = step.toDefinition();
    expect(def.name).toBe('TrainModel');
    expect(def.type).toBe('Training');

    const args = def.arguments!;
    expect(args['HyperParameters']).toEqual({
      objective: 'reg:linear',
      num_round: '50',
      max_depth: '5',
    });
    expect((args['InputDataConfig'] as any[]).length).toBe(2);
    expect((args['OutputDataConfig'] as any).S3OutputPath).toBe('s3://bucket/output');
  });

  it('generates model artifacts reference', () => {
    const step = new SmTrainingStep('Train', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputPath: 's3://bucket/output',
      inputChannels: [{ channelName: 'train', s3Uri: 's3://bucket/train' }],
    });

    const ref = step.modelArtifacts();
    expect(ref.get).toBe('Steps.Train.ModelArtifacts.S3ModelArtifacts');
  });

  it('accepts step output references as input channel s3Uri', () => {
    const preprocessStep = new SmProcessingStep('Preprocess', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputs: [{ outputName: 'train' }],
    });

    const trainStep = new SmTrainingStep('Train', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputPath: 's3://bucket/output',
      inputChannels: [
        {
          channelName: 'train',
          s3Uri: preprocessStep.output('train'),
          contentType: 'text/csv',
        },
      ],
    });

    const args = trainStep.toDefinition().arguments!;
    const s3Uri = (args['InputDataConfig'] as any[])[0].DataSource.S3DataSource.S3Uri;
    expect(s3Uri.get).toBe("Steps.Preprocess.ProcessingOutputConfig.Outputs['train'].S3Output.S3Uri");
  });
});

describe('SmRegisterModelStep', () => {
  it('generates a register model step', () => {
    const step = new SmRegisterModelStep('RegisterModel', {
      imageUri: TEST_IMAGE_URI,
      modelData: 's3://bucket/model.tar.gz',
      modelPackageGroupName: 'my-model-group',
      inferenceInstanceTypes: ['ml.t2.medium', 'ml.m5.large'],
      transformInstanceTypes: ['ml.m5.large'],
    });

    const def = step.toDefinition();
    expect(def.name).toBe('RegisterModel');
    expect(def.type).toBe('RegisterModel');

    const args = def.arguments!;
    expect(args['ModelPackageGroupName']).toBe('my-model-group');
    expect(args['ModelApprovalStatus']).toBe('PendingManualApproval');
    expect((args['InferenceSpecification'] as any).Containers[0].Image).toBe(TEST_IMAGE_URI);
  });

  it('accepts model artifacts reference from training step', () => {
    const trainStep = new SmTrainingStep('Train', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputPath: 's3://bucket/output',
      inputChannels: [{ channelName: 'train', s3Uri: 's3://bucket/train' }],
    });

    const step = new SmRegisterModelStep('Register', {
      imageUri: TEST_IMAGE_URI,
      modelData: trainStep.modelArtifacts(),
      modelPackageGroupName: 'my-group',
    });

    const args = step.toDefinition().arguments!;
    expect((args['InferenceSpecification'] as any).Containers[0].ModelDataUrl.get).toBe(
      'Steps.Train.ModelArtifacts.S3ModelArtifacts',
    );
  });

  it('accepts StepOutputReference for approvalStatus (parameter ref)', () => {
    const paramRef = stepOutputRef('Parameters.ModelApprovalStatus');
    const step = new SmRegisterModelStep('Register', {
      imageUri: TEST_IMAGE_URI,
      modelData: 's3://bucket/model.tar.gz',
      modelPackageGroupName: 'my-group',
      approvalStatus: paramRef,
    });

    const args = step.toDefinition().arguments!;
    const status = args['ModelApprovalStatus'] as any;
    expect(status.get).toBe('Parameters.ModelApprovalStatus');
  });

  it('defaults approvalStatus to PendingManualApproval when undefined', () => {
    const step = new SmRegisterModelStep('Register', {
      imageUri: TEST_IMAGE_URI,
      modelData: 's3://bucket/model.tar.gz',
      modelPackageGroupName: 'my-group',
    });
    expect(step.toDefinition().arguments!['ModelApprovalStatus']).toBe('PendingManualApproval');
  });
});

describe('SmConditionStep', () => {
  it('generates a condition step with if/else branches', () => {
    const registerStep = new SmRegisterModelStep('RegisterModel', {
      imageUri: TEST_IMAGE_URI,
      modelData: 's3://bucket/model.tar.gz',
      modelPackageGroupName: 'my-group',
    });

    const step = new SmConditionStep('CheckMSE', {
      conditions: [
        {
          operator: 'LessThanOrEqualTo',
          left: {
            stepName: 'EvaluateModel',
            propertyFile: 'EvaluationReport',
            jsonPath: 'regression_metrics.mse.value',
          },
          right: 6.0,
        },
      ],
      ifSteps: [registerStep],
      elseSteps: [],
    });

    const def = step.toDefinition();
    expect(def.name).toBe('CheckMSE');
    expect(def.type).toBe('Condition');
    expect(def.ifSteps).toHaveLength(1);
    expect(def.ifSteps![0].name).toBe('RegisterModel');
    expect(def.elseSteps).toHaveLength(0);
  });
});

describe('SmModelStep', () => {
  it('generates a model step from model package ARN', () => {
    const step = new SmModelStep('CreateModel', {
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:123456789012:model-package/my-group/1',
      roleArn: TEST_ROLE_ARN,
    });

    const def = step.toDefinition();
    expect(def.name).toBe('CreateModel');
    expect(def.type).toBe('Model');
    expect((def.arguments!['Containers'] as any[])[0].ModelPackageName).toBe(
      'arn:aws:sagemaker:us-east-1:123456789012:model-package/my-group/1',
    );
  });

  it('generates model name reference', () => {
    const step = new SmModelStep('CreateModel', {
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:123456789012:model-package/my-group/1',
      roleArn: TEST_ROLE_ARN,
    });

    expect(step.modelName().get).toBe('Steps.CreateModel.ModelName');
  });
});

describe('SmTransformStep', () => {
  it('generates a transform step', () => {
    const modelStep = new SmModelStep('CreateModel', {
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:123456789012:model-package/my-group/1',
      roleArn: TEST_ROLE_ARN,
    });

    const step = new SmTransformStep('BatchTransform', {
      modelName: modelStep.modelName(),
      instanceType: 'ml.m5.large',
      instanceCount: 1,
      inputDataUri: 's3://bucket/input',
      contentType: 'text/csv',
      splitType: 'Line',
      outputPath: 's3://bucket/output',
      assembleWith: 'Line',
      maxConcurrentTransforms: 64,
      maxPayloadInMB: 1,
      strategy: 'SingleRecord',
    });

    const def = step.toDefinition();
    expect(def.name).toBe('BatchTransform');
    expect(def.type).toBe('Transform');

    const args = def.arguments!;
    expect((args['ModelName'] as any).get).toBe('Steps.CreateModel.ModelName');
    expect((args['TransformInput'] as any).DataSource.S3DataSource.S3Uri).toBe('s3://bucket/input');
    expect(args['MaxConcurrentTransforms']).toBe(64);
    expect(args['BatchStrategy']).toBe('SingleRecord');
  });
});

describe('SmPipelineDefinition', () => {
  it('generates a complete pipeline definition JSON', () => {
    const preprocessStep = new SmProcessingStep('PreprocessData', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      scriptS3Uri: 's3://bucket/scripts/preprocessing.py',
      outputs: [{ outputName: 'train' }, { outputName: 'validation' }, { outputName: 'test' }],
    });

    const trainStep = new SmTrainingStep('TrainModel', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputPath: 's3://bucket/output',
      inputChannels: [
        { channelName: 'train', s3Uri: preprocessStep.output('train'), contentType: 'text/csv' },
        { channelName: 'validation', s3Uri: preprocessStep.output('validation'), contentType: 'text/csv' },
      ],
      hyperparameters: { objective: 'reg:linear', num_round: '50' },
    });

    const registerStep = new SmRegisterModelStep('RegisterModel', {
      imageUri: TEST_IMAGE_URI,
      modelData: trainStep.modelArtifacts(),
      modelPackageGroupName: 'my-model-group',
      inferenceInstanceTypes: ['ml.t2.medium'],
    });

    const conditionStep = new SmConditionStep('CheckMSE', {
      conditions: [
        {
          operator: 'LessThanOrEqualTo',
          left: { stepName: 'EvaluateModel', propertyFile: 'EvalReport', jsonPath: 'mse.value' },
          right: 6.0,
        },
      ],
      ifSteps: [registerStep],
    });

    const pipelineDef = new SmPipelineDefinition({
      parameters: [
        { name: 'ProcessingInstanceType', type: 'String', defaultValue: 'ml.m5.xlarge' },
        { name: 'TrainingInstanceType', type: 'String', defaultValue: 'ml.m5.xlarge' },
      ],
      steps: [preprocessStep, trainStep, conditionStep],
    });

    const json = pipelineDef.toJSON();
    const parsed = JSON.parse(json);

    expect(parsed.Version).toBe('2020-12-01');
    expect(parsed.Parameters).toHaveLength(2);
    expect(parsed.Steps).toHaveLength(3);
    expect(parsed.Steps[0].Name).toBe('PreprocessData');
    expect(parsed.Steps[1].Name).toBe('TrainModel');
    expect(parsed.Steps[2].Name).toBe('CheckMSE');
    expect(parsed.Steps[2].Arguments.IfSteps[0].Name).toBe('RegisterModel');
  });

  it('rejects duplicate step names', () => {
    const step1 = new SmProcessingStep('Duplicate', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
    });
    const step2 = new SmProcessingStep('Duplicate', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
    });

    expect(() => new SmPipelineDefinition({ steps: [step1, step2] })).toThrow(/Duplicate step name/);
  });

  it('generates valid JSON for toObject()', () => {
    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
    });

    const pipelineDef = new SmPipelineDefinition({ steps: [step] });
    const obj = pipelineDef.toObject();
    expect(obj['Version']).toBe('2020-12-01');
    expect((obj['Steps'] as any[])[0].Name).toBe('Step1');
  });

  it('generates an end-to-end batch inference pipeline', () => {
    const modelStep = new SmModelStep('CreateModel', {
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:123456789012:model-package/my-group/1',
      roleArn: TEST_ROLE_ARN,
    });

    const preprocessStep = new SmProcessingStep('PreprocessData', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.large',
      roleArn: TEST_ROLE_ARN,
      scriptS3Uri: 's3://bucket/scripts/preprocessing.py',
      outputs: [{ outputName: 'output_data' }],
    });

    const transformStep = new SmTransformStep('BatchTransform', {
      modelName: modelStep.modelName(),
      instanceType: 'ml.m5.large',
      inputDataUri: preprocessStep.output('output_data'),
      outputPath: 's3://bucket/batch-output',
      contentType: 'text/csv',
      splitType: 'Line',
      assembleWith: 'Line',
      strategy: 'SingleRecord',
    });

    const pipelineDef = new SmPipelineDefinition({
      steps: [modelStep, preprocessStep, transformStep],
    });

    const parsed = JSON.parse(pipelineDef.toJSON());
    expect(parsed['Steps'] as any[]).toHaveLength(3);
    expect((parsed['Steps'] as any[])[0].Name).toBe('CreateModel');
    expect((parsed['Steps'] as any[])[2].Arguments.ModelName).toEqual({ Get: 'Steps.CreateModel.ModelName' });
    expect((parsed['Steps'] as any[])[2].Arguments.TransformInput.DataSource.S3DataSource.S3Uri).toEqual({
      Get: "Steps.PreprocessData.ProcessingOutputConfig.Outputs['output_data'].S3Output.S3Uri",
    });
  });
});

describe('Boundary and negative cases', () => {
  it('processing step with no inputs, no outputs, no script produces minimal definition', () => {
    const step = new SmProcessingStep('Minimal', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
    });
    const args = step.toDefinition().arguments!;
    expect(args['ProcessingInputs']).toBeUndefined();
    expect(args['ProcessingOutputConfig']).toBeUndefined();
  });

  it('processing step does not include KMS when no outputs exist', () => {
    const step = new SmProcessingStep('NoOutputs', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputKmsKeyId: TEST_KMS_KEY_ID,
    });
    const args = step.toDefinition().arguments!;
    expect(args['ProcessingOutputConfig']).toBeUndefined();
  });

  it('training step with empty hyperparameters omits HyperParameters key', () => {
    const step = new SmTrainingStep('Train', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      outputPath: 's3://bucket/out',
      inputChannels: [{ channelName: 'train', s3Uri: 's3://bucket/train' }],
      hyperparameters: {},
    });
    const args = step.toDefinition().arguments!;
    expect(args['HyperParameters']).toBeUndefined();
  });

  it('network config with isolation flags but no VPC emits flags only', () => {
    const step = new SmProcessingStep('Isolated', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      networkConfig: {
        enableNetworkIsolation: true,
        encryptInterContainerTraffic: true,
      },
    });
    const args = step.toDefinition().arguments!;
    const nc = args['NetworkConfig'] as Record<string, unknown>;
    expect(nc['EnableNetworkIsolation']).toBe(true);
    expect(nc['EnableInterContainerTrafficEncryption']).toBe(true);
    expect(nc['VpcConfig']).toBeUndefined();
  });

  it('step with dependsOn includes DependsOn in definition', () => {
    const step = new SmProcessingStep('Dependent', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: TEST_ROLE_ARN,
      dependsOn: ['PreviousStep'],
    });
    const def = step.toDefinition();
    expect(def.dependsOn).toEqual(['PreviousStep']);
  });

  it('step name with hyphens and underscores is valid', () => {
    expect(
      () =>
        new SmProcessingStep('Valid-Step_Name123', {
          imageUri: TEST_IMAGE_URI,
          instanceType: 'ml.m5.xlarge',
          roleArn: TEST_ROLE_ARN,
        }),
    ).not.toThrow();
  });
});
