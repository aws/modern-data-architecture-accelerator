/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { SecurityGroup, Subnet } from 'aws-cdk-lib/aws-ec2';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { MdaaModelMonitor, MdaaModelMonitorProps, MonitorType } from '../lib';

describe('MdaaModelMonitor Data Quality Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaModelMonitorProps = {
    naming: testApp.naming,
    monitorName: 'test-dq-monitor',
    monitorType: 'data-quality',
    schedule: 'cron(0 * ? * * *)',
    dataQuality: {
      role: Role.fromRoleArn(
        testApp.testStack,
        'monitor-role',
        'arn:test-partition:iam:test-region:test-account:role/test-role',
      ),
      imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-model-monitor-analyzer',
      outputS3Uri: 's3://test-bucket/monitoring-output/',
      outputKmsKey: Key.fromKeyArn(
        testApp.testStack,
        'output-key',
        'arn:test-partition:kms:test-region:test-account:key/test-key',
      ),
      endpointName: 'test-endpoint',
      baselineStatisticsUri: 's3://test-bucket/baseline/statistics.json',
      baselineConstraintsUri: 's3://test-bucket/baseline/constraints.json',
      clusterConfig: {
        instanceCount: 1,
        instanceType: 'ml.m5.large',
        volumeSizeInGb: 20,
        volumeKmsKey: Key.fromKeyArn(
          testApp.testStack,
          'volume-key',
          'arn:test-partition:kms:test-region:test-account:key/volume-key',
        ),
      },
      networkConfig: {
        vpcConfig: {
          securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
          subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
        },
      },
    },
  };

  new MdaaModelMonitor(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('DataQualityJobDefinition', () => {
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      RoleArn: 'arn:test-partition:iam:test-region:test-account:role/test-role',
      DataQualityAppSpecification: {
        ImageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-model-monitor-analyzer',
      },
    });
  });

  test('MonitoringSchedule', () => {
    template.hasResourceProperties('AWS::SageMaker::MonitoringSchedule', {
      MonitoringScheduleConfig: {
        MonitoringType: 'DataQuality',
        ScheduleConfig: {
          ScheduleExpression: 'cron(0 * ? * * *)',
        },
      },
    });
  });

  test('DataQualityBaselineConfig', () => {
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      DataQualityBaselineConfig: {
        StatisticsResource: { S3Uri: 's3://test-bucket/baseline/statistics.json' },
        ConstraintsResource: { S3Uri: 's3://test-bucket/baseline/constraints.json' },
      },
    });
  });

  test('OutputKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      DataQualityJobOutputConfig: {
        KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      },
    });
  });

  test('VolumeKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      JobResources: {
        ClusterConfig: {
          VolumeKmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/volume-key',
        },
      },
    });
  });

  test('NetworkConfigVpcSecurityGroups', () => {
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      NetworkConfig: {
        VpcConfig: {
          SecurityGroupIds: ['sg-123'],
        },
      },
    });
  });

  test('NetworkConfigVpcSubnets', () => {
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      NetworkConfig: {
        VpcConfig: {
          Subnets: ['subnet-123'],
        },
      },
    });
  });
});

describe('MdaaModelMonitor Model Quality Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaModelMonitorProps = {
    naming: testApp.naming,
    monitorName: 'test-mq-monitor',
    monitorType: 'model-quality',
    schedule: 'cron(0 0 * * ? *)',
    modelQuality: {
      role: Role.fromRoleArn(
        testApp.testStack,
        'monitor-role',
        'arn:test-partition:iam:test-region:test-account:role/test-role',
      ),
      imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-model-monitor-analyzer',
      outputS3Uri: 's3://test-bucket/monitoring-output/',
      outputKmsKey: Key.fromKeyArn(
        testApp.testStack,
        'output-key',
        'arn:test-partition:kms:test-region:test-account:key/test-key',
      ),
      endpointName: 'test-endpoint',
      problemType: 'BinaryClassification',
      groundTruthS3Uri: 's3://test-bucket/ground-truth/',
      clusterConfig: {
        instanceCount: 1,
        instanceType: 'ml.m5.large',
        volumeSizeInGb: 20,
        volumeKmsKey: Key.fromKeyArn(
          testApp.testStack,
          'volume-key',
          'arn:test-partition:kms:test-region:test-account:key/volume-key',
        ),
      },
      networkConfig: {
        vpcConfig: {
          securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
          subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
        },
      },
    },
  };

  new MdaaModelMonitor(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('ModelQualityJobDefinition', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      ModelQualityAppSpecification: {
        ProblemType: 'BinaryClassification',
      },
    });
  });

  test('GroundTruthInput', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      ModelQualityJobInput: {
        GroundTruthS3Input: {
          S3Uri: 's3://test-bucket/ground-truth/',
        },
      },
    });
  });

  test('MonitoringSchedule', () => {
    template.hasResourceProperties('AWS::SageMaker::MonitoringSchedule', {
      MonitoringScheduleConfig: {
        MonitoringType: 'ModelQuality',
      },
    });
  });

  test('RoleArn', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      RoleArn: 'arn:test-partition:iam:test-region:test-account:role/test-role',
    });
  });

  test('OutputKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      ModelQualityJobOutputConfig: {
        KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      },
    });
  });

  test('VolumeKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      JobResources: {
        ClusterConfig: {
          VolumeKmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/volume-key',
        },
      },
    });
  });

  test('NetworkConfigVpc', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      NetworkConfig: {
        EnableInterContainerTrafficEncryption: true,
        VpcConfig: {
          SecurityGroupIds: ['sg-123'],
          Subnets: ['subnet-123'],
        },
      },
    });
  });
});

describe('MdaaModelMonitor Model Quality Baseline Tests', () => {
  const testApp = new MdaaTestApp();

  new MdaaModelMonitor(testApp.testStack, 'test-construct', {
    naming: testApp.naming,
    monitorName: 'test-mq-baseline-monitor',
    monitorType: 'model-quality',
    schedule: 'cron(0 0 * * ? *)',
    modelQuality: {
      role: Role.fromRoleArn(
        testApp.testStack,
        'monitor-role',
        'arn:test-partition:iam:test-region:test-account:role/test-role',
      ),
      imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-model-monitor-analyzer',
      outputS3Uri: 's3://test-bucket/monitoring-output/',
      outputKmsKey: Key.fromKeyArn(
        testApp.testStack,
        'output-key',
        'arn:test-partition:kms:test-region:test-account:key/test-key',
      ),
      endpointName: 'test-endpoint',
      problemType: 'Regression',
      groundTruthS3Uri: 's3://test-bucket/ground-truth/',
      baselineConstraintsUri: 's3://test-bucket/baseline/constraints.json',
      clusterConfig: {
        instanceCount: 1,
        instanceType: 'ml.m5.large',
        volumeSizeInGb: 20,
        volumeKmsKey: Key.fromKeyArn(
          testApp.testStack,
          'volume-key',
          'arn:test-partition:kms:test-region:test-account:key/volume-key',
        ),
      },
      networkConfig: {
        vpcConfig: {
          securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
          subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
        },
      },
    },
  });

  const template = Template.fromStack(testApp.testStack);

  test('ModelQualityBaselineConfig includes constraintsResource', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
      ModelQualityBaselineConfig: {
        ConstraintsResource: { S3Uri: 's3://test-bucket/baseline/constraints.json' },
      },
    });
  });
});

describe('MdaaModelMonitor Model Bias Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaModelMonitorProps = {
    naming: testApp.naming,
    monitorName: 'test-bias-monitor',
    monitorType: 'model-bias',
    schedule: 'cron(0 0 * * ? *)',
    modelBias: {
      role: Role.fromRoleArn(
        testApp.testStack,
        'monitor-role',
        'arn:test-partition:iam:test-region:test-account:role/test-role',
      ),
      imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-clarify-processing',
      outputS3Uri: 's3://test-bucket/monitoring-output/',
      outputKmsKey: Key.fromKeyArn(
        testApp.testStack,
        'output-key',
        'arn:test-partition:kms:test-region:test-account:key/test-key',
      ),
      endpointName: 'test-endpoint',
      groundTruthS3Uri: 's3://test-bucket/ground-truth/',
      configUri: 's3://test-bucket/bias-config.json',
      featuresAttribute: 'features',
      inferenceAttribute: 'prediction',
      probabilityAttribute: 'probability',
      clusterConfig: {
        instanceCount: 1,
        instanceType: 'ml.m5.large',
        volumeSizeInGb: 20,
        volumeKmsKey: Key.fromKeyArn(
          testApp.testStack,
          'volume-key',
          'arn:test-partition:kms:test-region:test-account:key/volume-key',
        ),
      },
      networkConfig: {
        vpcConfig: {
          securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
          subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
        },
      },
    },
  };

  new MdaaModelMonitor(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('ModelBiasJobDefinition', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelBiasJobDefinition', {
      ModelBiasAppSpecification: {
        ImageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-clarify-processing',
        ConfigUri: 's3://test-bucket/bias-config.json',
      },
      ModelBiasJobInput: {
        EndpointInput: {
          EndpointName: 'test-endpoint',
          FeaturesAttribute: 'features',
          InferenceAttribute: 'prediction',
          ProbabilityAttribute: 'probability',
        },
        GroundTruthS3Input: {
          S3Uri: 's3://test-bucket/ground-truth/',
        },
      },
    });
  });

  test('MonitoringSchedule', () => {
    template.hasResourceProperties('AWS::SageMaker::MonitoringSchedule', {
      MonitoringScheduleConfig: {
        MonitoringType: 'ModelBias',
      },
    });
  });

  test('RoleArn', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelBiasJobDefinition', {
      RoleArn: 'arn:test-partition:iam:test-region:test-account:role/test-role',
    });
  });

  test('OutputKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelBiasJobDefinition', {
      ModelBiasJobOutputConfig: {
        KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      },
    });
  });

  test('VolumeKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelBiasJobDefinition', {
      JobResources: {
        ClusterConfig: {
          VolumeKmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/volume-key',
        },
      },
    });
  });

  test('NetworkConfigVpc', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelBiasJobDefinition', {
      NetworkConfig: {
        EnableInterContainerTrafficEncryption: true,
        VpcConfig: {
          SecurityGroupIds: ['sg-123'],
          Subnets: ['subnet-123'],
        },
      },
    });
  });
});

describe('MdaaModelMonitor Model Explainability Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaModelMonitorProps = {
    naming: testApp.naming,
    monitorName: 'test-explain-monitor',
    monitorType: 'model-explainability',
    schedule: 'cron(0 0 * * ? *)',
    modelExplainability: {
      role: Role.fromRoleArn(
        testApp.testStack,
        'monitor-role',
        'arn:test-partition:iam:test-region:test-account:role/test-role',
      ),
      imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-clarify-processing',
      outputS3Uri: 's3://test-bucket/monitoring-output/',
      outputKmsKey: Key.fromKeyArn(
        testApp.testStack,
        'output-key',
        'arn:test-partition:kms:test-region:test-account:key/test-key',
      ),
      endpointName: 'test-endpoint',
      configUri: 's3://test-bucket/explainability-config.json',
      featuresAttribute: 'features',
      clusterConfig: {
        instanceCount: 1,
        instanceType: 'ml.m5.large',
        volumeSizeInGb: 20,
        volumeKmsKey: Key.fromKeyArn(
          testApp.testStack,
          'volume-key',
          'arn:test-partition:kms:test-region:test-account:key/volume-key',
        ),
      },
      networkConfig: {
        vpcConfig: {
          securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
          subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
        },
      },
    },
  };

  new MdaaModelMonitor(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('ModelExplainabilityJobDefinition', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
      ModelExplainabilityAppSpecification: {
        ImageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-clarify-processing',
        ConfigUri: 's3://test-bucket/explainability-config.json',
      },
      ModelExplainabilityJobInput: {
        EndpointInput: {
          FeaturesAttribute: 'features',
        },
      },
    });
  });

  test('MonitoringSchedule', () => {
    template.hasResourceProperties('AWS::SageMaker::MonitoringSchedule', {
      MonitoringScheduleConfig: {
        MonitoringType: 'ModelExplainability',
      },
    });
  });

  test('RoleArn', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
      RoleArn: 'arn:test-partition:iam:test-region:test-account:role/test-role',
    });
  });

  test('OutputKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
      ModelExplainabilityJobOutputConfig: {
        KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      },
    });
  });

  test('VolumeKmsEncryption', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
      JobResources: {
        ClusterConfig: {
          VolumeKmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/volume-key',
        },
      },
    });
  });

  test('NetworkConfigVpc', () => {
    template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
      NetworkConfig: {
        EnableInterContainerTrafficEncryption: true,
        VpcConfig: {
          SecurityGroupIds: ['sg-123'],
          Subnets: ['subnet-123'],
        },
      },
    });
  });
});

describe('MdaaModelMonitor Validation Tests', () => {
  test('Throws when monitorType is data-quality but dataQuality config is missing', () => {
    const testApp = new MdaaTestApp();
    expect(() => {
      new MdaaModelMonitor(testApp.testStack, 'test-invalid', {
        naming: testApp.naming,
        monitorName: 'test-monitor',
        monitorType: 'data-quality',
        schedule: 'cron(0 * ? * * *)',
        // dataQuality intentionally omitted
      });
    }).toThrow('dataQuality config is required when monitorType is "data-quality"');
  });

  test('Throws when monitorType is model-quality but modelQuality config is missing', () => {
    const testApp = new MdaaTestApp();
    expect(() => {
      new MdaaModelMonitor(testApp.testStack, 'test-invalid', {
        naming: testApp.naming,
        monitorName: 'test-monitor',
        monitorType: 'model-quality',
        schedule: 'cron(0 * ? * * *)',
      });
    }).toThrow('modelQuality config is required when monitorType is "model-quality"');
  });

  test('Throws when monitorType is model-bias but modelBias config is missing', () => {
    const testApp = new MdaaTestApp();
    expect(() => {
      new MdaaModelMonitor(testApp.testStack, 'test-invalid', {
        naming: testApp.naming,
        monitorName: 'test-monitor',
        monitorType: 'model-bias',
        schedule: 'cron(0 * ? * * *)',
      });
    }).toThrow('modelBias config is required when monitorType is "model-bias"');
  });

  test('Throws when monitorType is model-explainability but modelExplainability config is missing', () => {
    const testApp = new MdaaTestApp();
    expect(() => {
      new MdaaModelMonitor(testApp.testStack, 'test-invalid', {
        naming: testApp.naming,
        monitorName: 'test-monitor',
        monitorType: 'model-explainability',
        schedule: 'cron(0 * ? * * *)',
      });
    }).toThrow('modelExplainability config is required when monitorType is "model-explainability"');
  });

  test('Throws when schedule expression is invalid', () => {
    const testApp = new MdaaTestApp();
    expect(() => {
      new MdaaModelMonitor(testApp.testStack, 'test-invalid-schedule', {
        naming: testApp.naming,
        monitorName: 'test-monitor',
        monitorType: 'data-quality',
        schedule: 'every hour',
        dataQuality: {
          role: Role.fromRoleArn(
            testApp.testStack,
            'monitor-role',
            'arn:test-partition:iam:test-region:test-account:role/test-role',
          ),
          imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-model-monitor-analyzer',
          outputS3Uri: 's3://test-bucket/output/',
          outputKmsKey: Key.fromKeyArn(
            testApp.testStack,
            'output-key',
            'arn:test-partition:kms:test-region:test-account:key/test-key',
          ),
          endpointName: 'test-endpoint',
          clusterConfig: {
            instanceCount: 1,
            instanceType: 'ml.m5.large',
            volumeSizeInGb: 20,
            volumeKmsKey: Key.fromKeyArn(
              testApp.testStack,
              'volume-key',
              'arn:test-partition:kms:test-region:test-account:key/volume-key',
            ),
          },
          networkConfig: {
            vpcConfig: {
              securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
              subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
            },
          },
        },
      });
    }).toThrow('schedule must be a valid cron');
  });

  test('Throws for unsupported monitorType', () => {
    const testApp = new MdaaTestApp();
    expect(() => {
      new MdaaModelMonitor(testApp.testStack, 'test-invalid-type', {
        naming: testApp.naming,
        monitorName: 'test-monitor',
        monitorType: 'unsupported-type' as unknown as MonitorType,
        schedule: 'cron(0 * ? * * *)',
      });
    }).toThrow('Unsupported monitorType');
  });

  test('enableInterContainerTrafficEncryption is always enforced as true', () => {
    const testApp = new MdaaTestApp();
    new MdaaModelMonitor(testApp.testStack, 'test-network', {
      naming: testApp.naming,
      monitorName: 'test-network-monitor',
      monitorType: 'data-quality',
      schedule: 'cron(0 * ? * * *)',
      dataQuality: {
        role: Role.fromRoleArn(
          testApp.testStack,
          'monitor-role',
          'arn:test-partition:iam:test-region:test-account:role/test-role',
        ),
        imageUri: '123456789012.dkr.ecr.test-region.amazonaws.com/sagemaker-model-monitor-analyzer',
        outputS3Uri: 's3://test-bucket/output/',
        outputKmsKey: Key.fromKeyArn(
          testApp.testStack,
          'output-key',
          'arn:test-partition:kms:test-region:test-account:key/test-key',
        ),
        endpointName: 'test-endpoint',
        clusterConfig: {
          instanceCount: 1,
          instanceType: 'ml.m5.large',
          volumeSizeInGb: 20,
          volumeKmsKey: Key.fromKeyArn(
            testApp.testStack,
            'volume-key',
            'arn:test-partition:kms:test-region:test-account:key/volume-key',
          ),
        },
        networkConfig: {
          vpcConfig: {
            securityGroups: [SecurityGroup.fromSecurityGroupId(testApp.testStack, 'sg', 'sg-123')],
            subnets: [Subnet.fromSubnetId(testApp.testStack, 'subnet', 'subnet-123')],
          },
        },
      },
    });
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
      NetworkConfig: {
        EnableInterContainerTrafficEncryption: true,
      },
    });
  });
});
