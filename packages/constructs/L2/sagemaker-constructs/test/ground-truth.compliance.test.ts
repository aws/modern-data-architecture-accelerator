/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { MdaaGroundTruth, MdaaGroundTruthProps } from '../lib';

function makeComplianceProps(app: MdaaTestApp): MdaaGroundTruthProps {
  return {
    naming: app.naming,
    jobName: 'test-labeling-job',
    taskType: 'image_bounding_box',
    role: Role.fromRoleArn(app.testStack, 'role', 'arn:test-partition:iam:test-region:test-account:role/test-role'),
    inputManifestS3Uri: 's3://test-bucket/input/manifest.json',
    outputS3Uri: 's3://test-bucket/output/',
    outputKmsKey: Key.fromKeyArn(
      app.testStack,
      'output-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    ),
    templateS3Uri: 's3://test-bucket/templates/bbox.liquid',
    categoriesS3Uri: 's3://test-bucket/categories/labels.json',
    labelingTaskConfig: {
      taskTitle: 'Bounding Box Labeling',
      taskDescription: 'Draw bounding boxes around objects',
      taskKeywords: ['image', 'bounding-box'],
      workteamArn: 'arn:test-partition:sagemaker:test-region:test-account:workteam/private/test-team',
      numberOfHumanWorkersPerDataObject: 3,
      taskTimeLimitInSeconds: 600,
      taskAvailabilityLifetimeInSeconds: 21600,
      taskPrice: 6,
    },
    preAnnotationLambda: LambdaFunction.fromFunctionArn(
      app.testStack,
      'pre-annotation-fn',
      'arn:test-partition:lambda:test-region:test-account:function/pre-annotation',
    ),
    postAnnotationLambda: LambdaFunction.fromFunctionArn(
      app.testStack,
      'post-annotation-fn',
      'arn:test-partition:lambda:test-region:test-account:function/consolidation',
    ),
  };
}

function makeVerificationProps(app: MdaaTestApp): MdaaGroundTruthProps {
  return {
    naming: app.naming,
    jobName: 'test-verified-job',
    taskType: 'text_single_label_classification',
    role: Role.fromRoleArn(app.testStack, 'role', 'arn:test-partition:iam:test-region:test-account:role/test-role'),
    inputManifestS3Uri: 's3://test-bucket/input/text-manifest.json',
    outputS3Uri: 's3://test-bucket/output/',
    outputKmsKey: Key.fromKeyArn(
      app.testStack,
      'output-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key',
    ),
    categoriesS3Uri: 's3://test-bucket/categories/text-labels.json',
    templateS3Uri: 's3://test-bucket/templates/text-classification.liquid',
    labelingTaskConfig: {
      taskTitle: 'Text Classification',
      taskDescription: 'Classify text documents',
      taskKeywords: ['text', 'classification'],
      workteamArn: 'arn:test-partition:sagemaker:test-region:test-account:workteam/private/test-team',
    },
    postAnnotationLambda: LambdaFunction.fromFunctionArn(
      app.testStack,
      'post-annotation-fn',
      'arn:test-partition:lambda:test-region:test-account:function/consolidation',
    ),
    verification: {
      workteamArn: 'arn:test-partition:sagemaker:test-region:test-account:workteam/private/verify-team',
      taskTitle: 'Verify Classification',
      taskDescription: 'Verify text classification results',
      taskKeywords: ['verify', 'classification'],
      numberOfHumanWorkersPerDataObject: 2,
      taskTimeLimitInSeconds: 300,
      taskAvailabilityLifetimeInSeconds: 10800,
      taskPrice: 3,
    },
  };
}

describe('MdaaGroundTruth Compliance Tests', () => {
  const testApp = new MdaaTestApp();
  const testProps = makeComplianceProps(testApp);

  new MdaaGroundTruth(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Construct creates without error', () => {
    expect(testApp.testStack).toBeDefined();
  });

  test('JobName is set via naming', () => {
    const gt = new MdaaGroundTruth(testApp.testStack, 'test-construct-2', testProps);
    expect(gt.jobName).toBe(testApp.naming.resourceName('test-labeling-job', 63));
  });

  test('Stores roleArn as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'arn:test-partition:iam:test-region:test-account:role/test-role',
    });
  });

  test('Stores inputManifestS3Uri as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 's3://test-bucket/input/manifest.json',
    });
  });

  test('Stores outputS3Uri as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 's3://test-bucket/output/',
    });
  });

  test('Stores outputKmsKeyId as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'arn:test-partition:kms:test-region:test-account:key/test-key',
    });
  });

  test('Stores templateS3Uri as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 's3://test-bucket/templates/bbox.liquid',
    });
  });

  test('Stores categoriesS3Uri as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 's3://test-bucket/categories/labels.json',
    });
  });

  test('Stores taskType as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'image_bounding_box',
    });
  });

  test('Stores workteamArn as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'arn:test-partition:sagemaker:test-region:test-account:workteam/private/test-team',
    });
  });

  test('Stores taskTitle as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'Bounding Box Labeling',
    });
  });

  test('Stores taskDescription as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'Draw bounding boxes around objects',
    });
  });

  test('Stores taskKeywords as JSON array SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '["image","bounding-box"]',
    });
  });

  test('Stores numberOfHumanWorkersPerDataObject as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '3',
    });
  });

  test('Stores taskTimeLimitInSeconds as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '600',
    });
  });

  test('Stores taskAvailabilityLifetimeInSeconds as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '21600',
    });
  });

  test('Stores taskPrice as JSON SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '{"AmountInUsd":{"Dollars":0,"Cents":0,"TenthFractionsOfACent":6}}',
    });
  });

  test('Stores labelingAttributeName as SSM parameter (label for bounding box)', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'label',
    });
  });

  test('Stores preAnnotationLambdaArn as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'arn:test-partition:lambda:test-region:test-account:function/pre-annotation',
    });
  });

  test('Stores postAnnotationLambdaArn as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'arn:test-partition:lambda:test-region:test-account:function/consolidation',
    });
  });

  test('Does not create verification-enabled param when verification is absent', () => {
    template.resourcePropertiesCountIs('AWS::SSM::Parameter', { Value: 'true' }, 0);
  });

  test('Correct number of SSM parameters created', () => {
    // job-name, task-type, role-arn, labeling-attribute-name,
    // input-manifest-s3-uri, output-s3-uri, output-kms-key-id,
    // template-s3-uri, categories-s3-uri,
    // workteam-arn, task-title, task-description, task-keywords,
    // workers-per-object, task-time-limit, task-availability-lifetime, task-price,
    // pre-annotation-lambda-arn, post-annotation-lambda-arn
    template.resourceCountIs('AWS::SSM::Parameter', 19);
  });

  test('serializeTaskPrice correctly decomposes multi-unit price', () => {
    // price=1234: Dollars=floor(1234/1000)=1, Cents=floor(1234/10)%100=23, TenthFractionsOfACent=1234%10=4 => $1.234
    const testApp2 = new MdaaTestApp();
    const props2 = makeComplianceProps(testApp2);
    new MdaaGroundTruth(testApp2.testStack, 'test-price-decompose', {
      ...props2,
      labelingTaskConfig: { ...props2.labelingTaskConfig, taskPrice: 1234 },
    });
    const params = Template.fromStack(testApp2.testStack).findResources('AWS::SSM::Parameter', {
      Properties: { Value: '{"AmountInUsd":{"Dollars":1,"Cents":23,"TenthFractionsOfACent":4}}' },
    });
    expect(Object.keys(params).length).toBe(1);
  });

  test('throws on zero taskPrice', () => {
    const testApp2 = new MdaaTestApp();
    const props2 = makeComplianceProps(testApp2);
    expect(
      () =>
        new MdaaGroundTruth(testApp2.testStack, 'test-price-zero', {
          ...props2,
          labelingTaskConfig: { ...props2.labelingTaskConfig, taskPrice: 0 },
        }),
    ).toThrow('taskPrice must be a positive integer');
  });

  test('throws on negative taskPrice', () => {
    const testApp2 = new MdaaTestApp();
    const props2 = makeComplianceProps(testApp2);
    expect(
      () =>
        new MdaaGroundTruth(testApp2.testStack, 'test-price-negative', {
          ...props2,
          labelingTaskConfig: { ...props2.labelingTaskConfig, taskPrice: -1 },
        }),
    ).toThrow('taskPrice must be a positive integer');
  });

  test('throws on non-integer taskPrice', () => {
    const testApp2 = new MdaaTestApp();
    const props2 = makeComplianceProps(testApp2);
    expect(
      () =>
        new MdaaGroundTruth(testApp2.testStack, 'test-price-float', {
          ...props2,
          labelingTaskConfig: { ...props2.labelingTaskConfig, taskPrice: 1.5 },
        }),
    ).toThrow('taskPrice must be a positive integer');
  });
});

describe('MdaaGroundTruth with Verification', () => {
  const testApp = new MdaaTestApp();
  const testProps = makeVerificationProps(testApp);

  new MdaaGroundTruth(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Construct creates with verification config', () => {
    expect(testApp.testStack).toBeDefined();
  });

  test('Stores verification-enabled as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'true',
    });
  });

  test('Stores verification workteamArn as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'arn:test-partition:sagemaker:test-region:test-account:workteam/private/verify-team',
    });
  });

  test('Stores verification taskTitle as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'Verify Classification',
    });
  });

  test('Stores verification taskDescription as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: 'Verify text classification results',
    });
  });

  test('Stores verification taskKeywords as JSON array SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '["verify","classification"]',
    });
  });

  test('Stores verification numberOfHumanWorkersPerDataObject as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '2',
    });
  });

  test('Stores verification taskTimeLimitInSeconds as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '300',
    });
  });

  test('Stores verification taskAvailabilityLifetimeInSeconds as SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '10800',
    });
  });

  test('Stores verification taskPrice as JSON SSM parameter', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Value: '{"AmountInUsd":{"Dollars":0,"Cents":0,"TenthFractionsOfACent":3}}',
    });
  });

  test('labelingAttributeName is label for text_single_label_classification', () => {
    const testApp2 = new MdaaTestApp();
    const gt = new MdaaGroundTruth(testApp2.testStack, 'test-attr-label', makeVerificationProps(testApp2));
    expect(gt.labelingAttributeName).toBe('label');
  });

  test('labelingAttributeName is label-ref for image_semantic_segmentation', () => {
    const testApp2 = new MdaaTestApp();
    const gt = new MdaaGroundTruth(testApp2.testStack, 'test-attr-label-ref', {
      ...makeVerificationProps(testApp2),
      taskType: 'image_semantic_segmentation',
    });
    expect(gt.labelingAttributeName).toBe('label-ref');
  });
});
