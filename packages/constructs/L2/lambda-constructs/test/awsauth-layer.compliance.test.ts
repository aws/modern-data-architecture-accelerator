/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaAwsAuthLayerVersion } from '../lib/awsauth-layer';
import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaConstructProps = {
    naming: testApp.naming,
  };

  new MdaaAwsAuthLayerVersion(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  test('LayerName', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: testApp.naming.resourceName(`awsauth`),
    });
  });
});
