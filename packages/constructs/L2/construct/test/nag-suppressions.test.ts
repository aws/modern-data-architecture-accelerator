/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Fn, Stack } from 'aws-cdk-lib';
import { CfnBucket } from 'aws-cdk-lib/aws-s3';
import { MdaaNagSuppressions } from '../lib';

function createTestStack(context: Record<string, string> = {}) {
  const app = new App({ context });
  const stack = new Stack(app, 'TestStack');
  const bucket = new CfnBucket(stack, 'TestBucket');
  return { app, stack, bucket };
}

describe('MdaaNagSuppressions', () => {
  describe('addCodeResourceSuppressions', () => {
    test('prefixes reason with [MDAA:...] source location', () => {
      const { bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [{ id: 'AwsSolutions-S1', reason: 'Test reason' }]);
      const metadata = bucket.cfnOptions.metadata;
      expect(metadata).toBeDefined();
      const suppressions = metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toBeDefined();
      expect(suppressions).toHaveLength(1);
      expect(suppressions[0].reason).toMatch(/^\[MDAA:.*\] Test reason$/);
    });

    test('renders an unresolved appliesTo the way cdk-nag renders its findings', () => {
      // On an env-agnostic synth the account is the AWS::AccountId pseudo-parameter, and cdk-nag
      // reports the finding's resource as `<AWS::AccountId>`. An appliesTo carrying CDK's token
      // instead would never match, so the suppression would silently miss and the rule would fail.
      const { stack, bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard scoped to this account',
          appliesTo: [`Resource::arn:${stack.partition}:logs:${stack.region}:${stack.account}:log-group:*sagemaker*`],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual([
        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*sagemaker*',
      ]);
    });

    test('renders a resource attribute reference as its <LogicalId.Attr> placeholder', () => {
      // A wildcard scoped to a resource attribute — a bucket ARN via attrArn — resolves to an
      // Fn::GetAtt rather than a Ref, which cdk-nag reports as `<LogicalId.Attr>`.
      const { stack, bucket } = createTestStack();
      const target = new CfnBucket(stack, 'AttrBucket');
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard scoped to the bucket contents',
          appliesTo: [`Resource::${target.attrArn}/*`],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual([`Resource::<${stack.resolve(target.logicalId)}.Arn>/*`]);
    });

    test('renders an intrinsic cdk-nag does not special-case the way cdk-nag renders it', () => {
      // Any intrinsic outside Ref/Fn::GetAtt/Fn::Join reaches the fallback. cdk-nag renders such a
      // value as JSON, so the fallback has to as well — `[object Object]` would match nothing.
      const { bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard scoped via an unhandled intrinsic',
          appliesTo: [`Resource::${Fn.select(0, Fn.getAzs())}/*`],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual(['Resource::{"Fn::Select":[0,{"Fn::GetAZs":""}]}/*']);
    });

    test('flattens only the unresolved entries of a mixed appliesTo array', () => {
      const { stack, bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'One unresolved and one literal entry',
          appliesTo: [
            `Resource::arn:${stack.partition}:s3:::bucket/*`,
            'Resource::arn:aws:s3:::literal-bucket/*',
            'Action::s3:*',
          ],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual([
        'Resource::arn:<AWS::Partition>:s3:::bucket/*',
        'Resource::arn:aws:s3:::literal-bucket/*',
        'Action::s3:*',
      ]);
    });

    test('leaves a resolved appliesTo untouched', () => {
      const { bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard scoped to a known account',
          appliesTo: ['Resource::arn:aws:logs:us-east-1:123456789012:log-group:*sagemaker*'],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual([
        'Resource::arn:aws:logs:us-east-1:123456789012:log-group:*sagemaker*',
      ]);
    });

    test('handles multiple suppressions', () => {
      const { bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        { id: 'AwsSolutions-S1', reason: 'Reason one' },
        { id: 'AwsSolutions-S2', reason: 'Reason two' },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toHaveLength(2);
      expect(suppressions[0].reason).toMatch(/^\[MDAA:.*\] Reason one$/);
      expect(suppressions[1].reason).toMatch(/^\[MDAA:.*\] Reason two$/);
    });

    test('applies to children when applyToChildren is true', () => {
      const { stack } = createTestStack();
      const parent = new CfnBucket(stack, 'Parent');
      new CfnBucket(parent, 'Child');
      MdaaNagSuppressions.addCodeResourceSuppressions(
        parent,
        [{ id: 'AwsSolutions-S1', reason: 'Applied to children' }],
        true,
      );
      const suppressions = parent.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toBeDefined();
      expect(suppressions[0].reason).toContain('Applied to children');
    });

    test('preserves suppression id', () => {
      const { bucket } = createTestStack();
      MdaaNagSuppressions.addCodeResourceSuppressions(bucket, [
        { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'No replication needed' },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].id).toBe('NIST.800.53.R5-S3BucketReplicationEnabled');
    });
  });

  describe('addConfigResourceSuppressions', () => {
    test('prefixes reason with relative config file path', () => {
      const { bucket } = createTestStack({
        module_configs: './sample_configs/sample-config-comprehensive.yaml',
      });
      MdaaNagSuppressions.addConfigResourceSuppressions(bucket, [{ id: 'AwsSolutions-S1', reason: 'Config reason' }]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toHaveLength(1);
      expect(suppressions[0].reason).toMatch(
        /^\[CONFIG:sample_configs\/sample-config-comprehensive\.yaml\] Config reason$/,
      );
    });

    test('normalizes absolute path to relative', () => {
      const absolutePath = process.cwd() + '/sample_configs/sample-config-noproject.yaml';
      const { bucket } = createTestStack({
        module_configs: absolutePath,
      });
      MdaaNagSuppressions.addConfigResourceSuppressions(bucket, [
        { id: 'AwsSolutions-S1', reason: 'Absolute path test' },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].reason).toBe('[CONFIG:sample_configs/sample-config-noproject.yaml] Absolute path test');
    });

    test('handles undefined module_configs context', () => {
      const { bucket } = createTestStack();
      MdaaNagSuppressions.addConfigResourceSuppressions(bucket, [{ id: 'AwsSolutions-S1', reason: 'No config' }]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].reason).toBe('[CONFIG:undefined] No config');
    });

    test('handles multiple suppressions', () => {
      const { bucket } = createTestStack({
        module_configs: './sample_configs/sample-config.yaml',
      });
      MdaaNagSuppressions.addConfigResourceSuppressions(bucket, [
        { id: 'AwsSolutions-S1', reason: 'First' },
        { id: 'AwsSolutions-S2', reason: 'Second' },
        { id: 'AwsSolutions-S3', reason: 'Third' },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toHaveLength(3);
      suppressions.forEach((s: { reason: string }) => {
        expect(s.reason).toMatch(/^\[CONFIG:sample_configs\/sample-config\.yaml\]/);
      });
    });

    test('applies to children when applyToChildren is true', () => {
      const { stack } = createTestStack({
        module_configs: './sample_configs/sample-config.yaml',
      });
      const parent = new CfnBucket(stack, 'Parent');
      new CfnBucket(parent, 'Child');
      MdaaNagSuppressions.addConfigResourceSuppressions(
        parent,
        [{ id: 'AwsSolutions-S1', reason: 'Children too' }],
        true,
      );
      const suppressions = parent.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toBeDefined();
      expect(suppressions[0].reason).toContain('Children too');
    });

    test('renders an unresolved appliesTo the way cdk-nag renders its findings', () => {
      // Config-sourced suppressions carry appliesTo from the MDAA config, so they need the same
      // alignment as code-sourced ones.
      const { stack, bucket } = createTestStack({
        module_configs: './sample_configs/sample-config.yaml',
      });
      MdaaNagSuppressions.addConfigResourceSuppressions(bucket, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard scoped to this account',
          appliesTo: [`Resource::arn:${stack.partition}:s3:::${stack.account}-bucket/*`],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual(['Resource::arn:<AWS::Partition>:s3:::<AWS::AccountId>-bucket/*']);
    });
  });

  describe('addConfigResourceSuppressionsByPath', () => {
    test('prefixes reason with [CONFIG] (no file path)', () => {
      const { stack } = createTestStack();
      const bucket = new CfnBucket(stack, 'PathBucket');
      const bucketPath = '/' + bucket.node.path;
      MdaaNagSuppressions.addConfigResourceSuppressionsByPath(stack, bucketPath, [
        { id: 'AwsSolutions-S1', reason: 'By path reason' },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toHaveLength(1);
      expect(suppressions[0].reason).toBe('[CONFIG] By path reason');
    });

    test('handles array of paths', () => {
      const { stack } = createTestStack();
      const bucket1 = new CfnBucket(stack, 'Bucket1');
      const bucket2 = new CfnBucket(stack, 'Bucket2');
      const paths = ['/' + bucket1.node.path, '/' + bucket2.node.path];
      MdaaNagSuppressions.addConfigResourceSuppressionsByPath(stack, paths, [
        { id: 'AwsSolutions-S1', reason: 'Multi-path' },
      ]);
      const s1 = bucket1.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      const s2 = bucket2.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(s1[0].reason).toBe('[CONFIG] Multi-path');
      expect(s2[0].reason).toBe('[CONFIG] Multi-path');
    });

    test('handles multiple suppressions', () => {
      const { stack } = createTestStack();
      const bucket = new CfnBucket(stack, 'MultiBucket');
      const bucketPath = '/' + bucket.node.path;
      MdaaNagSuppressions.addConfigResourceSuppressionsByPath(stack, bucketPath, [
        { id: 'AwsSolutions-S1', reason: 'Reason A' },
        { id: 'AwsSolutions-S2', reason: 'Reason B' },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toHaveLength(2);
      expect(suppressions[0].reason).toBe('[CONFIG] Reason A');
      expect(suppressions[1].reason).toBe('[CONFIG] Reason B');
    });

    test('applies to children when applyToChildren is true', () => {
      const { stack } = createTestStack();
      const bucket = new CfnBucket(stack, 'ParentBucket');
      new CfnBucket(bucket, 'ChildBucket');
      const bucketPath = '/' + bucket.node.path;
      MdaaNagSuppressions.addConfigResourceSuppressionsByPath(
        stack,
        bucketPath,
        [{ id: 'AwsSolutions-S1', reason: 'With children' }],
        true,
      );
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions).toBeDefined();
      expect(suppressions[0].reason).toBe('[CONFIG] With children');
    });

    test('renders an unresolved appliesTo the way cdk-nag renders its findings', () => {
      // This overload resolves against the stack rather than the target construct, so its
      // alignment is wired separately from the two construct-scoped methods.
      const { stack } = createTestStack();
      const bucket = new CfnBucket(stack, 'ByPathTokenBucket');
      MdaaNagSuppressions.addConfigResourceSuppressionsByPath(stack, '/' + bucket.node.path, [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard scoped to this region',
          appliesTo: [`Resource::arn:${stack.partition}:logs:${stack.region}:*:log-group:*`],
        },
      ]);
      const suppressions = bucket.cfnOptions.metadata!['cdk_nag']?.rules_to_suppress;
      expect(suppressions[0].applies_to).toEqual(['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:*:log-group:*']);
    });
  });
});
