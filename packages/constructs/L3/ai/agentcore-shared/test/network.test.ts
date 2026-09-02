/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildAgentcoreVpcNetworkConfiguration, NETWORK_MEMBERS_MAX, NETWORK_MEMBERS_MIN } from '../lib';

describe('buildAgentcoreVpcNetworkConfiguration', () => {
  it('hardcodes NetworkMode VPC and passes through the members', () => {
    expect(buildAgentcoreVpcNetworkConfiguration(['sg-1'], ['subnet-a', 'subnet-b'])).toEqual({
      networkMode: 'VPC',
      networkModeConfig: { securityGroups: ['sg-1'], subnets: ['subnet-a', 'subnet-b'] },
    });
  });

  it('does not validate (callers own their own bounds/message contract)', () => {
    expect(() => buildAgentcoreVpcNetworkConfiguration([], [])).not.toThrow();
    expect(buildAgentcoreVpcNetworkConfiguration([], [])).toEqual({
      networkMode: 'VPC',
      networkModeConfig: { securityGroups: [], subnets: [] },
    });
  });
});

describe('network member bounds', () => {
  it('exposes the CloudFormation VpcConfig 1-16 bounds', () => {
    expect(NETWORK_MEMBERS_MIN).toBe(1);
    expect(NETWORK_MEMBERS_MAX).toBe(16);
  });
});
