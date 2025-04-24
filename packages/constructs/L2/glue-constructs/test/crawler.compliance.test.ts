/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaCfnCrawler, MdaaCfnCrawlerProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaCfnCrawlerProps = {
    naming: testApp.naming,
    crawlerSecurityConfiguration: 'test-security-config',
    name: 'test-crawler',
    role: 'test-role',
    targets: {},
    createOutputs: false,
    createParams: false,
  };

  new MdaaCfnCrawler(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Name', () => {
    template.hasResourceProperties('AWS::Glue::Crawler', {
      Name: testApp.naming.resourceName('test-crawler'),
    });
  });

  test('Role', () => {
    template.hasResourceProperties('AWS::Glue::Crawler', {
      Role: 'test-role',
    });
  });

  test('CrawlerSecurityConfiguration', () => {
    template.hasResourceProperties('AWS::Glue::Crawler', {
      CrawlerSecurityConfiguration: 'test-security-config',
    });
  });
});
