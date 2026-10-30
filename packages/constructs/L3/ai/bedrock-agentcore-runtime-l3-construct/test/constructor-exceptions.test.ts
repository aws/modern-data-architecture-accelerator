/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { BedrockAgentcoreRuntimeL3Construct } from '../lib';

describe('BedrockAgentcoreRuntimeL3Construct Exception Tests', () => {
  // '' is included because it survives the `??` default to the runtime's current version.
  test.each(['', '0', '1.0.0', 'latest', '100000'])(
    'runtimeEndpoint.agentRuntimeVersion "%s" is rejected at synth',
    agentRuntimeVersion => {
      const testApp = new MdaaTestApp();
      expect(
        () =>
          new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'endpoint-runtime-construct', {
            agentRuntimeName: 'endpoint-runtime',
            agentRuntimeArtifact: {
              containerConfiguration: {
                containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
              },
            },
            networkConfiguration: {
              securityGroups: ['sg-12345678'],
              subnets: ['subnet-12345678'],
            },
            runtimeEndpoint: { name: 'my_endpoint', agentRuntimeVersion },
            naming: testApp.naming,
            roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          }),
      ).toThrow(`Agentcore "runtimeEndpoint.agentRuntimeVersion" must match`);
    },
  );
});
