/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Test assertions on untyped pipeline definition JSON */

import { buildPipelineSteps } from '../lib/pipeline-step-builder';
import { PipelineStepYamlConfig } from '../lib/sagemaker-pipeline-config';
import { PIPELINE_ROLE_PLACEHOLDER, PIPELINE_KMS_PLACEHOLDER } from '@aws-mdaa/sagemaker-model-training-l3-construct';

const TEST_ROLE = PIPELINE_ROLE_PLACEHOLDER;
const TEST_KMS = PIPELINE_KMS_PLACEHOLDER;
const TEST_IMAGE = '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest';

describe('buildPipelineSteps', () => {
  it('builds a processing step from YAML config', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          outputs: [{ outputName: 'train' }],
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    expect(steps).toHaveLength(1);
    expect(steps[0].name).toBe('Preprocess');
  });

  it('resolves stepOutput references between processing and training steps', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          outputs: [{ outputName: 'train' }],
        },
      },
      {
        name: 'Train',
        type: 'Training',
        training: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          inputChannels: [{ channelName: 'train', stepOutput: 'Preprocess.train' }],
          outputPath: 's3://bucket/output',
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    expect(steps).toHaveLength(2);
    const trainDef = steps[1].toDefinition();
    const s3Uri = (trainDef.arguments!['InputDataConfig'] as any[])[0].DataSource.S3DataSource.S3Uri;
    expect(s3Uri.get).toContain('Steps.Preprocess');
  });

  it('throws on missing step type config', () => {
    const configs: PipelineStepYamlConfig[] = [{ name: 'Bad', type: 'Processing' } as PipelineStepYamlConfig];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(
      /has type 'Processing' but no 'processing' configuration/,
    );
  });

  it('throws on invalid step reference', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Train',
        type: 'Training',
        training: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          inputChannels: [{ channelName: 'train', stepOutput: 'NonExistent.train' }],
          outputPath: 's3://bucket/output',
        },
      },
    ];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(/Step 'NonExistent' not found/);
  });

  it('throws on missing s3Uri and stepOutput', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Train',
        type: 'Training',
        training: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          inputChannels: [{ channelName: 'train' }],
          outputPath: 's3://bucket/output',
        },
      },
    ];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(/requires either 's3Uri' or 'stepOutput'/);
  });

  it('throws on invalid condition operator', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Check',
        type: 'Condition',
        condition: {
          conditions: [
            { operator: 'InvalidOp', stepName: 'Eval', propertyFile: 'report', jsonPath: 'mse', threshold: 5 },
          ],
          ifSteps: [],
        },
      },
    ];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(/invalid operator 'InvalidOp'/);
  });

  it('throws on invalid transform splitType', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'CreateModel',
        type: 'Model',
        model: { modelPackageArn: 'arn:aws:sagemaker:us-east-1:123:model-package/grp/1' },
      },
      {
        name: 'Transform',
        type: 'Transform',
        transform: {
          modelNameStep: 'CreateModel',
          instanceType: 'ml.m5.large',
          inputDataUri: 's3://bucket/input',
          outputPath: 's3://bucket/out',
          splitType: 'BadSplitType',
        },
      },
    ];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(/invalid splitType 'BadSplitType'/);
  });

  it('throws on unsupported step type', () => {
    const configs = [{ name: 'Bad', type: 'Unknown' }] as unknown as PipelineStepYamlConfig[];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(/Unsupported step type/);
  });

  it('resolves parameter references in processing inputs', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          inputs: [{ inputName: 'data', parameter: 'InputDataUrl' }],
          outputs: [{ outputName: 'train' }],
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    const def = steps[0].toDefinition();
    const inputS3Uri = (def.arguments!['ProcessingInputs'] as any[])[0].S3Input.S3Uri;
    expect(inputS3Uri.get).toBe('Parameters.InputDataUrl');
  });

  it('resolves parameter references in training input channels', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Train',
        type: 'Training',
        training: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          inputChannels: [{ channelName: 'train', parameter: 'TrainDataUrl' }],
          outputPath: 's3://bucket/output',
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    const def = steps[0].toDefinition();
    const s3Uri = (def.arguments!['InputDataConfig'] as any[])[0].DataSource.S3DataSource.S3Uri;
    expect(s3Uri.get).toBe('Parameters.TrainDataUrl');
  });

  it('resolves parameter reference for approvalStatus in RegisterModel', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Register',
        type: 'RegisterModel',
        register: {
          imageUri: TEST_IMAGE,
          modelData: 's3://bucket/model.tar.gz',
          modelPackageGroupName: 'test-mpg',
          approvalStatus: { parameter: 'ModelApprovalStatus' },
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    const def = steps[0].toDefinition();
    const status = def.arguments!['ModelApprovalStatus'] as any;
    expect(status.get).toBe('Parameters.ModelApprovalStatus');
  });

  it('uses defaultModelPackageGroupName when step config omits it', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Register',
        type: 'RegisterModel',
        register: {
          imageUri: TEST_IMAGE,
          modelData: 's3://bucket/model.tar.gz',
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS, undefined, 'default-mpg');
    const def = steps[0].toDefinition();
    expect(def.arguments!['ModelPackageGroupName']).toBe('default-mpg');
  });

  it('step-level modelPackageGroupName overrides default', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Register',
        type: 'RegisterModel',
        register: {
          imageUri: TEST_IMAGE,
          modelData: 's3://bucket/model.tar.gz',
          modelPackageGroupName: 'step-level-mpg',
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS, undefined, 'default-mpg');
    const def = steps[0].toDefinition();
    expect(def.arguments!['ModelPackageGroupName']).toBe('step-level-mpg');
  });

  it('throws when modelPackageGroupName is missing from both step and default', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Register',
        type: 'RegisterModel',
        register: {
          imageUri: TEST_IMAGE,
          modelData: 's3://bucket/model.tar.gz',
        },
      },
    ];
    expect(() => buildPipelineSteps(configs, TEST_ROLE, TEST_KMS)).toThrow(/modelPackageGroupName is required/);
  });

  it('builds a complete Model + Transform pipeline', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'CreateModel',
        type: 'Model',
        model: { modelPackageArn: 'arn:aws:sagemaker:us-east-1:123:model-package/grp/1' },
      },
      {
        name: 'Transform',
        type: 'Transform',
        transform: {
          modelNameStep: 'CreateModel',
          instanceType: 'ml.m5.large',
          inputDataUri: 's3://bucket/input',
          outputPath: 's3://bucket/out',
          contentType: 'text/csv',
          splitType: 'Line',
          assembleWith: 'Line',
          strategy: 'SingleRecord',
          maxConcurrentTransforms: 64,
          maxPayloadInMB: 1,
        },
        dependsOn: ['CreateModel'],
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    expect(steps).toHaveLength(2);
    const transformDef = steps[1].toDefinition();
    expect(transformDef.dependsOn).toEqual(['CreateModel']);
    expect((transformDef.arguments!['ModelName'] as any).get).toBe('Steps.CreateModel.ModelName');
    expect(transformDef.arguments!['BatchStrategy']).toBe('SingleRecord');
  });

  it('applies default network config to processing steps', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
        },
      },
    ];
    const networkConfig = {
      subnetIds: ['subnet-aaa'],
      securityGroupIds: ['sg-bbb'],
      enableNetworkIsolation: true,
    };
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS, networkConfig);
    const args = steps[0].toDefinition().arguments!;
    const nc = args['NetworkConfig'] as any;
    expect(nc.VpcConfig.Subnets).toEqual(['subnet-aaa']);
    expect(nc.EnableNetworkIsolation).toBe(true);
  });

  it('builds condition step with elseSteps', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Register',
        type: 'RegisterModel',
        register: {
          imageUri: TEST_IMAGE,
          modelData: 's3://bucket/model.tar.gz',
          modelPackageGroupName: 'test-mpg',
        },
      },
      {
        name: 'RegisterFallback',
        type: 'RegisterModel',
        register: {
          imageUri: TEST_IMAGE,
          modelData: 's3://bucket/fallback-model.tar.gz',
          modelPackageGroupName: 'test-mpg',
        },
      },
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          outputs: [{ outputName: 'eval' }],
          propertyFiles: [{ propertyFileName: 'EvaluationReport', outputName: 'eval', filePath: 'evaluation.json' }],
        },
      },
      {
        name: 'CheckMSE',
        type: 'Condition',
        condition: {
          conditions: [
            {
              operator: 'LessThan',
              stepName: 'Preprocess',
              propertyFile: 'EvaluationReport',
              jsonPath: 'mse',
              threshold: 5,
            },
          ],
          ifSteps: ['Register'],
          elseSteps: ['RegisterFallback'],
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    expect(steps).toHaveLength(4);
    const condDef = steps[3].toDefinition() as any;
    expect(condDef.elseSteps).toHaveLength(1);
    expect(condDef.elseSteps[0].name).toBe('RegisterFallback');
  });

  it('builds transform step with inputDataStepOutput', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          outputs: [{ outputName: 'transformed_data' }],
        },
      },
      {
        name: 'CreateModel',
        type: 'Model',
        model: { modelPackageArn: 'arn:aws:sagemaker:us-east-1:123:model-package/grp/1' },
      },
      {
        name: 'Transform',
        type: 'Transform',
        transform: {
          modelNameStep: 'CreateModel',
          instanceType: 'ml.m5.large',
          outputPath: 's3://bucket/out',
          inputDataStepOutput: 'Preprocess.transformed_data',
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    expect(steps).toHaveLength(3);
    const transformDef = steps[2].toDefinition();
    const inputUri = (transformDef.arguments!['TransformInput'] as any).DataSource.S3DataSource.S3Uri;
    expect(inputUri.get).toContain('Steps.Preprocess');
  });

  it('parameter reference takes priority over s3Uri', () => {
    const configs: PipelineStepYamlConfig[] = [
      {
        name: 'Preprocess',
        type: 'Processing',
        processing: {
          imageUri: TEST_IMAGE,
          instanceType: 'ml.m5.xlarge',
          inputs: [{ inputName: 'data', s3Uri: 's3://should-be-ignored', parameter: 'InputDataUrl' }],
        },
      },
    ];
    const steps = buildPipelineSteps(configs, TEST_ROLE, TEST_KMS);
    const def = steps[0].toDefinition();
    const inputS3Uri = (def.arguments!['ProcessingInputs'] as any[])[0].S3Input.S3Uri;
    expect(inputS3Uri.get).toBe('Parameters.InputDataUrl');
  });
});
