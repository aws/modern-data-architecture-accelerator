/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import {
  SageMakerGroundTruthL3Construct,
  SageMakerGroundTruthL3ConstructProps,
  GroundTruthTaskType,
} from '../lib/sagemaker-ground-truth-l3-construct';

describe('SageMaker Ground Truth L3 Construct', () => {
  describe('Minimal Config — image task (no verification)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerGroundTruthL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      jobName: 'test-labeling',
      taskType: 'image_bounding_box',
      labelingTaskConfig: {
        taskTitle: 'Label bounding boxes',
        taskDescription: 'Draw bounding boxes around objects',
        taskKeywords: ['image', 'bounding box'],
        workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test-team',
        categoriesS3Uri: 's3://test-bucket/categories.json',
      },
    };
    new SageMakerGroundTruthL3Construct(stack, 'GroundTruth', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates S3 buckets', () => {
      template.resourceCountIs('AWS::S3::Bucket', 3);
    });

    test('Creates SQS queues', () => {
      template.resourceCountIs('AWS::SQS::Queue', 2);
    });

    test('Creates KMS keys', () => {
      template.resourceCountIs('AWS::KMS::Key', 3);
    });

    test('Creates Feature Group', () => {
      template.resourceCountIs('AWS::SageMaker::FeatureGroup', 1);
    });

    test('Creates State Machine', () => {
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });

    test('Creates EventBridge Schedule', () => {
      template.resourceCountIs('AWS::Scheduler::Schedule', 1);
    });

    test('Image task uses direct SQS target (no relay Lambda)', () => {
      // Image tasks send S3 events directly to SQS, no relay Lambda
      // 5 Lambdas: poll, labeling, update-fs, return-msgs + BucketNotificationsHandler is NOT created
      const lambdas = template.findResources('AWS::Lambda::Function');
      const lambdaNames = Object.keys(lambdas);
      const relayLambda = lambdaNames.find(name => JSON.stringify(lambdas[name]).includes('relay'));
      expect(relayLambda).toBeUndefined();
    });
  });

  describe('Text task type (with relay Lambda)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerGroundTruthL3Construct(stack, 'GroundTruth', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      jobName: 'text-classify',
      taskType: 'text_single_label_classification',
      labelingTaskConfig: {
        taskTitle: 'Classify text',
        taskDescription: 'Classify text documents',
        taskKeywords: ['text', 'classification'],
        workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test-team',
        categoriesS3Uri: 's3://test-bucket/categories.json',
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Text task creates relay Lambda', () => {
      const lambdas = template.findResources('AWS::Lambda::Function');
      const relayLambda = Object.keys(lambdas).find(name => JSON.stringify(lambdas[name]).includes('relay'));
      expect(relayLambda).toBeDefined();
    });

    test('Creates EventBridge rule targeting Lambda (not SQS)', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: {
          source: ['aws.s3'],
          'detail-type': ['Object Created'],
        },
      });
    });
  });

  describe('With Verification', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerGroundTruthL3Construct(stack, 'GroundTruth', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      jobName: 'test-labeling',
      taskType: 'image_bounding_box',
      labelingTaskConfig: {
        taskTitle: 'Label bounding boxes',
        taskDescription: 'Draw bounding boxes',
        taskKeywords: ['test'],
        workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test-team',
        categoriesS3Uri: 's3://test-bucket/categories.json',
      },
      verification: {
        workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/verify-team',
        taskTitle: 'Verify labels',
        taskDescription: 'Verify the bounding box labels',
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Synthesizes without errors', () => {
      expect(() => Template.fromStack(stack)).not.toThrow();
    });

    test('Feature Group includes status feature for verification', () => {
      const fgs = template.findResources('AWS::SageMaker::FeatureGroup');
      const fgResource = Object.values(fgs)[0];
      const featureDefs = fgResource.Properties.FeatureDefinitions as Array<{ FeatureName: string }>;
      const hasStatus = featureDefs.some(fd => fd.FeatureName === 'status');
      expect(hasStatus).toBe(true);
    });
  });

  describe('External Ground Truth Role', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerGroundTruthL3Construct(stack, 'GroundTruth', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      jobName: 'ext-role-test',
      taskType: 'image_bounding_box',
      labelingTaskConfig: {
        taskTitle: 'Label bounding boxes',
        taskDescription: 'Draw bounding boxes',
        taskKeywords: ['test'],
        workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test-team',
        categoriesS3Uri: 's3://test-bucket/categories.json',
      },
      groundTruthRole: {
        arn: 'arn:aws:iam::123456789012:role/my-external-gt-role',
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Does not create an internal MdaaRole for Ground Truth', () => {
      const roles = template.findResources('AWS::IAM::Role');
      const gtRole = Object.keys(roles).find(name => name.toLowerCase().includes('groundtruthrole'));
      expect(gtRole).toBeUndefined();
    });

    test('Creates MdaaManagedPolicy with S3/KMS permissions attached to external role', () => {
      const policies = template.findResources('AWS::IAM::ManagedPolicy');
      const gtPolicyEntry = Object.entries(policies).find(([, resource]) =>
        JSON.stringify(resource).includes('s3:GetObject'),
      );
      expect(gtPolicyEntry).toBeDefined();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const policyProps = (gtPolicyEntry![1] as any).Properties;

      // Verify the policy has expected S3 and KMS actions
      const statementsJson = JSON.stringify(policyProps.PolicyDocument?.Statement ?? []);
      expect(statementsJson).toContain('s3:GetObject');
      expect(statementsJson).toContain('s3:PutObject');
      expect(statementsJson).toContain('kms:Decrypt');

      // Verify the policy is attached to at least one role
      expect(policyProps.Roles).toBeDefined();
      expect(policyProps.Roles.length).toBeGreaterThan(0);
    });
  });

  describe('Unsupported task types', () => {
    test('Throws error for video task type', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerGroundTruthL3Construct(testApp.testStack, 'GroundTruth', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          jobName: 'video-test',
          taskType: 'video_classification' as GroundTruthTaskType,
          labelingTaskConfig: {
            taskTitle: 'Classify videos',
            taskDescription: 'Classify video content',
            taskKeywords: ['video'],
            workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test-team',
            categoriesS3Uri: 's3://test-bucket/categories.json',
          },
        });
      }).toThrow(/Unsupported task type.*video_classification/);
    });

    test('Throws error for 3D point cloud task type', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerGroundTruthL3Construct(testApp.testStack, 'GroundTruth', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          jobName: 'pc-test',
          taskType: '3d_point_cloud_object_detection' as GroundTruthTaskType,
          labelingTaskConfig: {
            taskTitle: 'Detect 3D objects',
            taskDescription: 'Detect objects in point clouds',
            taskKeywords: ['3d'],
            workteamArn: 'arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test-team',
            categoriesS3Uri: 's3://test-bucket/categories.json',
          },
        });
      }).toThrow(/Unsupported task type.*3d_point_cloud_object_detection/);
    });
  });
});
