/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaOpensearchPyLayerVersion } from '../lib/opensearchpy-layer';
import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaConstructProps = {
    naming: testApp.naming,
  };

  new MdaaOpensearchPyLayerVersion(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  test('LayerName', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: testApp.naming.resourceName(`opensarchpy`),
    });
  });
});
