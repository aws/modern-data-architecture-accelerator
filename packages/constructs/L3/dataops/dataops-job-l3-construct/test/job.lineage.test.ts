/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { GlueJobL3Construct, GlueJobL3ConstructProps, JobCommand, JobConfig } from '../lib';

const jobCommand: JobCommand = {
  name: 'glueetl',
  scriptLocation: './test/src/glue/python/job.py',
};

const baseJobProps: JobConfig = {
  executionRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-execution-role',
  command: jobCommand,
  description: 'lineage test job',
};

const expectedLineageConf = (domainId: string, accountId: string) =>
  [
    'spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener',
    '--conf spark.openlineage.transport.type=amazon_datazone_api',
    `--conf spark.openlineage.transport.domainId=${domainId}`,
    '--conf spark.openlineage.facets.custom_environment_variables=[AWS_DEFAULT_REGION;GLUE_VERSION;GLUE_COMMAND_CRITERIA;GLUE_PYTHON_VERSION;]',
    `--conf spark.glue.accountId=${accountId}`,
  ].join(' ');

function createConstructorProps(stack: Stack, testApp: MdaaTestApp, jobConfig: JobConfig): GlueJobL3ConstructProps {
  return {
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    securityConfigurationName: 'test-security-configuration',
    projectName: 'test-project',
    notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:MyTopic',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-deployment-role',
    bucketName: 'some-project-bucket-name',
    jobConfigs: { testJob: jobConfig },
  };
}

describe('DataZone Lineage', () => {
  describe('Lineage enabled on Glue 5.0 with defaulted account', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const jobConfig: JobConfig = {
      ...baseJobProps,
      glueVersion: '5.0',
      lineage: { enabled: true, domainId: 'dzd_test123' },
    };
    new GlueJobL3Construct(stack, 'teststack', createConstructorProps(stack, testApp, jobConfig));
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(stack);

    test('Injects the OpenLineage --conf with the deploying account', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        DefaultArguments: Match.objectLike({
          '--conf': expectedLineageConf('dzd_test123', 'test-account'),
        }),
      });
    });

    test('Grants datazone:PostLineageEvent on the domain to the execution role', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'datazone:PostLineageEvent',
              Effect: 'Allow',
              Resource: 'arn:test-partition:datazone:test-region:test-account:domain/dzd_test123',
            }),
          ]),
        }),
      });
    });
  });

  describe('Lineage enabled with explicit accountId override', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const jobConfig: JobConfig = {
      ...baseJobProps,
      glueVersion: '5.0',
      lineage: { enabled: true, domainId: 'dzd_test123', accountId: '123456789012' },
    };
    new GlueJobL3Construct(stack, 'teststack', createConstructorProps(stack, testApp, jobConfig));
    const template = Template.fromStack(stack);

    test('Uses the provided accountId in spark.glue.accountId', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        DefaultArguments: Match.objectLike({
          '--conf': expectedLineageConf('dzd_test123', '123456789012'),
        }),
      });
    });

    test('Scopes the domain grant to the deploying account, not the catalog accountId', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'datazone:PostLineageEvent',
              Effect: 'Allow',
              Resource: 'arn:test-partition:datazone:test-region:test-account:domain/dzd_test123',
            }),
          ]),
        }),
      });
    });
  });

  describe('Lineage accountId validation', () => {
    test('Throws when accountId is not a 12-digit account ID', () => {
      const testApp = new MdaaTestApp();
      const jobConfig: JobConfig = {
        ...baseJobProps,
        glueVersion: '5.0',
        lineage: { enabled: true, domainId: 'dzd_test123', accountId: 'not-an-account' },
      };
      expect(() => {
        new GlueJobL3Construct(
          testApp.testStack,
          'test-bad-account',
          createConstructorProps(testApp.testStack, testApp, jobConfig),
        );
      }).toThrow(/must be a 12-digit AWS account ID/);
    });
  });

  describe('Lineage with manageExecutionRolePolicy disabled', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const jobConfig: JobConfig = {
      ...baseJobProps,
      glueVersion: '5.0',
      lineage: { enabled: true, domainId: 'dzd_test123', manageExecutionRolePolicy: false },
    };
    new GlueJobL3Construct(stack, 'teststack', createConstructorProps(stack, testApp, jobConfig));
    const template = Template.fromStack(stack);

    test('Still injects the OpenLineage --conf', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        DefaultArguments: Match.objectLike({
          '--conf': expectedLineageConf('dzd_test123', 'test-account'),
        }),
      });
    });

    test('Does not attach a lineage managed policy', () => {
      template.resourcePropertiesCountIs(
        'AWS::IAM::ManagedPolicy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([Match.objectLike({ Action: 'datazone:PostLineageEvent' })]),
          }),
        }),
        0,
      );
    });
  });

  describe('Lineage preserves a user-supplied --conf', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const jobConfig: JobConfig = {
      ...baseJobProps,
      glueVersion: '5.0',
      defaultArguments: { '--conf': 'spark.sql.shuffle.partitions=42' },
      lineage: { enabled: true, domainId: 'dzd_test123' },
    };
    new GlueJobL3Construct(stack, 'teststack', createConstructorProps(stack, testApp, jobConfig));
    const template = Template.fromStack(stack);

    test('Appends lineage settings after the existing --conf value', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        DefaultArguments: Match.objectLike({
          '--conf': `spark.sql.shuffle.partitions=42 --conf ${expectedLineageConf('dzd_test123', 'test-account')}`,
        }),
      });
    });
  });

  describe('Lineage with a non-string --conf', () => {
    test('Throws rather than silently stringifying a numeric --conf', () => {
      const testApp = new MdaaTestApp();
      const jobConfig: JobConfig = {
        ...baseJobProps,
        glueVersion: '5.0',
        defaultArguments: { '--conf': 42 as unknown as string },
        lineage: { enabled: true, domainId: 'dzd_test123' },
      };
      expect(() => {
        new GlueJobL3Construct(
          testApp.testStack,
          'test-nonstring-conf',
          createConstructorProps(testApp.testStack, testApp, jobConfig),
        );
      }).toThrow(/non-string '--conf'/);
    });
  });

  describe('Lineage disabled', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const jobConfig: JobConfig = {
      ...baseJobProps,
      glueVersion: '5.0',
      lineage: { enabled: false, domainId: 'dzd_test123' },
    };
    new GlueJobL3Construct(stack, 'teststack', createConstructorProps(stack, testApp, jobConfig));
    const template = Template.fromStack(stack);

    test('Does not inject any --conf argument', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        DefaultArguments: Match.objectLike({
          '--conf': Match.absent(),
        }),
      });
    });
  });

  describe('Glue version enforcement', () => {
    test('Throws when glueVersion is below 5.0', () => {
      const testApp = new MdaaTestApp();
      const jobConfig: JobConfig = {
        ...baseJobProps,
        glueVersion: '4.0',
        lineage: { enabled: true, domainId: 'dzd_test123' },
      };
      expect(() => {
        new GlueJobL3Construct(
          testApp.testStack,
          'test-low-version',
          createConstructorProps(testApp.testStack, testApp, jobConfig),
        );
      }).toThrow(/requires Glue version 5.0 or higher/);
    });

    test('Throws when glueVersion is undefined', () => {
      const testApp = new MdaaTestApp();
      const jobConfig: JobConfig = {
        ...baseJobProps,
        lineage: { enabled: true, domainId: 'dzd_test123' },
      };
      expect(() => {
        new GlueJobL3Construct(
          testApp.testStack,
          'test-no-version',
          createConstructorProps(testApp.testStack, testApp, jobConfig),
        );
      }).toThrow(/requires Glue version 5.0 or higher/);
    });

    test('Throws when glueVersion is not a parseable number', () => {
      const testApp = new MdaaTestApp();
      const jobConfig: JobConfig = {
        ...baseJobProps,
        glueVersion: 'latest',
        lineage: { enabled: true, domainId: 'dzd_test123' },
      };
      expect(() => {
        new GlueJobL3Construct(
          testApp.testStack,
          'test-bad-version',
          createConstructorProps(testApp.testStack, testApp, jobConfig),
        );
      }).toThrow(/requires Glue version 5.0 or higher/);
    });
  });
});
