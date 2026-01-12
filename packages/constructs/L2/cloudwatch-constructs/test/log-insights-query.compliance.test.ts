/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaLogInsightsQuery, MdaaLogInsightsQueryProps } from '../lib';

describe('MDAA Log Insights Query Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testConstructProps: MdaaLogInsightsQueryProps = {
    naming: testApp.naming,
    createOutputs: false,
    createParams: true,
    queryName: 'test-query',
    queryString: `
      fields @timestamp, @message
      | filter @message like /ERROR/
      | sort @timestamp desc
    `,
    logGroupNames: ['/aws/lambda/test-function'],
  };

  new MdaaLogInsightsQuery(testApp.testStack, 'test-query-construct', testConstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log(JSON.stringify(template.toJSON(), undefined, 2));

  test('QueryDefinitionCreated', () => {
    template.hasResourceProperties('AWS::Logs::QueryDefinition', {
      Name: 'test-query',
      LogGroupNames: ['/aws/lambda/test-function'],
    });
  });

  test('QueryStringCleaned', () => {
    template.hasResourceProperties('AWS::Logs::QueryDefinition', {
      QueryString: `fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 10000`,
    });
  });

  test('SSMParameterForQueryIdCreated', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/insights-query/test-query/id',
      Type: 'String',
    });
  });

  test('SSMParameterForQueryNameCreated', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test-org/test-domain/test-module/insights-query/test-query/name',
      Value: 'test-query',
      Type: 'String',
    });
  });

  test('SSMParametersHaveNagSuppressions', () => {
    // Verify that CDK-NAG suppressions are present
    const resources = template.toJSON().Resources;
    const ssmParams = Object.values(resources).filter(
      (
        resource,
      ): resource is { Type: string; Metadata?: { cdk_nag?: { rules_to_suppress?: Array<{ id: string }> } } } =>
        (resource as { Type?: string }).Type === 'AWS::SSM::Parameter',
    );

    expect(ssmParams.length).toBeGreaterThan(0);

    ssmParams.forEach(param => {
      expect(param.Metadata).toBeDefined();
      expect(param.Metadata?.['cdk_nag']).toBeDefined();
      expect(param.Metadata?.['cdk_nag']?.rules_to_suppress).toBeDefined();

      const suppressions = param.Metadata?.['cdk_nag']?.rules_to_suppress || [];
      const hasSSM4Suppression = suppressions.some(s => s.id === 'AwsSolutions-SSM4');
      expect(hasSSM4Suppression).toBe(true);
    });
  });
});

describe('MDAA Log Insights Query - Query String Processing', () => {
  test('LimitClauseAddedWhenMissing', () => {
    const testApp = new MdaaTestApp();

    const propsWithoutLimit: MdaaLogInsightsQueryProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      queryName: 'test-query-no-limit',
      queryString: 'fields @timestamp, @message',
      logGroupNames: ['/aws/lambda/test-function'],
    };

    new MdaaLogInsightsQuery(testApp.testStack, 'test-query-no-limit', propsWithoutLimit);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::QueryDefinition', {
      QueryString: `fields @timestamp, @message
| limit 10000`,
    });
  });

  test('LimitClausePreservedWhenPresent', () => {
    const testApp = new MdaaTestApp();

    const propsWithLimit: MdaaLogInsightsQueryProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      queryName: 'test-query-with-limit',
      queryString: 'fields @timestamp, @message | limit 100',
      logGroupNames: ['/aws/lambda/test-function'],
    };

    new MdaaLogInsightsQuery(testApp.testStack, 'test-query-with-limit', propsWithLimit);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::QueryDefinition', {
      QueryString: 'fields @timestamp, @message | limit 100',
    });
  });

  test('WhitespaceStrippedFromLines', () => {
    const testApp = new MdaaTestApp();

    const propsWithWhitespace: MdaaLogInsightsQueryProps = {
      naming: testApp.naming,
      createOutputs: false,
      createParams: false,
      queryName: 'test-query-whitespace',
      queryString: `
        fields @timestamp, @message
        | filter @message like /ERROR/
        | sort @timestamp desc
      `,
      logGroupNames: ['/aws/lambda/test-function'],
    };

    new MdaaLogInsightsQuery(testApp.testStack, 'test-query-whitespace', propsWithWhitespace);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Logs::QueryDefinition', {
      QueryString: `fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 10000`,
    });
  });
});
