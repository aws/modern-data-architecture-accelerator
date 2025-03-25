/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaBoto3LayerVersion, MdaaBoto3LayerVersionProps } from '../lib/boto3-layer';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaBoto3LayerVersionProps = {
    naming: testApp.naming,
    boto3Version: '1.36.11',
  };

  new MdaaBoto3LayerVersion(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
  test('LayerName', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: testApp.naming.resourceName(`boto3-1_36_11`),
    });
  });
});
