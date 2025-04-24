/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Match } from 'aws-cdk-lib/assertions';
import { MdaaRedshiftClusterParameterGroup, MdaaRedshiftClusterParameterGroupProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaRedshiftClusterParameterGroupProps = {
    naming: testApp.naming,
    description: 'test-param-group',
    parameters: {},
  };

  new MdaaRedshiftClusterParameterGroup(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Description', () => {
    template.hasResourceProperties('AWS::Redshift::ClusterParameterGroup', {
      Description: testApp.naming.resourceName('test-param-group'),
    });
  });

  test('require_SSL', () => {
    template.hasResourceProperties('AWS::Redshift::ClusterParameterGroup', {
      Parameters: Match.arrayWith([
        {
          ParameterName: 'require_SSL',
          ParameterValue: 'true',
        },
      ]),
    });
  });

  test('use_fips_ssl', () => {
    template.hasResourceProperties('AWS::Redshift::ClusterParameterGroup', {
      Parameters: Match.arrayWith([
        {
          ParameterName: 'use_fips_ssl',
          ParameterValue: 'true',
        },
      ]),
    });
  });

  test('enable_user_activity_logging', () => {
    template.hasResourceProperties('AWS::Redshift::ClusterParameterGroup', {
      Parameters: Match.arrayWith([
        {
          ParameterName: 'enable_user_activity_logging',
          ParameterValue: 'true',
        },
      ]),
    });
  });
});
