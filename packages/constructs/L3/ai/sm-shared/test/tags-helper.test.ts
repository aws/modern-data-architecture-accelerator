/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { addSageMakerTags } from '../lib/tags-helper';

describe('addSageMakerTags', () => {
  it('adds project-name tag to resources', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new Bucket(stack, 'TestBucket');
    addSageMakerTags(stack, 'my-project');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([Match.objectLike({ Key: 'sagemaker:project-name', Value: 'my-project' })]),
    });
  });

  it('adds domain-id tag when provided', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new Bucket(stack, 'TestBucket');
    addSageMakerTags(stack, 'my-project', 'd-abc123');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([Match.objectLike({ Key: 'sagemaker:domain-id', Value: 'd-abc123' })]),
    });
  });

  it('adds domain-arn tag when provided', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new Bucket(stack, 'TestBucket');
    addSageMakerTags(stack, 'my-project', 'd-abc123', 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-abc123');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      Tags: Match.arrayWith([
        Match.objectLike({
          Key: 'sagemaker:domain-arn',
          Value: 'arn:aws:sagemaker:us-east-1:123456789012:domain/d-abc123',
        }),
      ]),
    });
  });

  it('does not add domain-id or domain-arn when undefined', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new Bucket(stack, 'TestBucket');
    addSageMakerTags(stack, 'my-project', undefined, undefined);
    const template = Template.fromStack(stack);
    const bucketTags = template.findResources('AWS::S3::Bucket');
    const tagKeys = Object.values(bucketTags)
      .flatMap(
        (r: Record<string, unknown>) =>
          ((r.Properties as Record<string, unknown>)?.Tags as Array<{ Key: string }>) ?? [],
      )
      .map((t: { Key: string }) => t.Key);
    expect(tagKeys).toContain('sagemaker:project-name');
    expect(tagKeys).not.toContain('sagemaker:domain-id');
    expect(tagKeys).not.toContain('sagemaker:domain-arn');
  });
});
