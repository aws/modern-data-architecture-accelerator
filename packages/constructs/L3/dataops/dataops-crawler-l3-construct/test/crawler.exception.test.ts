/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { GlueCrawlerL3Construct, GlueCrawlerL3ConstructProps } from '../lib';
import { CrawlerDefinition, CrawlerTargets } from '../lib';

describe('GlueCrawlerL3Construct Exception Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const crawlerTargets: CrawlerTargets = {
    s3Targets: [{ connectionName: 'test-connection' }],
  };

  const crawlerDefinition: CrawlerDefinition = {
    executionRoleArn: 'arn:test-partition:iam::test-account:role/test',
    databaseName: 'test-database',
    description: 'test crawler',
    targets: crawlerTargets,
  };

  test('should throw error when securityConfigurationName is not provided', () => {
    const constructProps: GlueCrawlerL3ConstructProps = {
      crawlerConfigs: { testCrawler: crawlerDefinition },
      projectName: 'test-project',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:MyTopic',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new GlueCrawlerL3Construct(stack, 'test-construct', constructProps);
    }).toThrow('Security configuration name is required for crawler configuration');
  });

  test('should work when projectName is undefined', () => {
    const constructProps: GlueCrawlerL3ConstructProps = {
      crawlerConfigs: { testCrawler: crawlerDefinition },
      projectName: undefined,
      securityConfigurationName: 'test-security-config',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:MyTopic',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new GlueCrawlerL3Construct(stack, 'test-construct-no-project', constructProps);
    }).not.toThrow();
  });
});
