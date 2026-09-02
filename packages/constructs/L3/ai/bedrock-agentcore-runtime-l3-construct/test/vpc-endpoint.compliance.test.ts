/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { createAgentCoreVpcEndpoint } from '../lib/vpc-endpoint';

describe('createAgentCoreVpcEndpoint Compliance', () => {
  const testApp = new MdaaTestApp();

  createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
    vpcId: 'vpc-0123456789abcdef0',
    subnetIds: ['subnet-12345678', 'subnet-87654321'],
    ingressSecurityGroupIds: ['sg-12345678'],
    vpcEndpointConfig: { createSupportingEndpoints: true },
    naming: testApp.naming,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});
