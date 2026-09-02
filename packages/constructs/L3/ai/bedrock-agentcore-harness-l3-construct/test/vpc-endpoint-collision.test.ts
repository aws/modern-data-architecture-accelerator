/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { HarnessVpcEndpointCollisionEntry, HarnessVpcEndpointName, validateHarnessVpcEndpointCollisions } from '../lib';

/** The five interface endpoints every VPC-mode harness derives when nothing is excluded. */
const ALL_SUPPORTING = [
  HarnessVpcEndpointName.BEDROCK_RUNTIME,
  HarnessVpcEndpointName.ECR_API,
  HarnessVpcEndpointName.ECR_DOCKER,
  HarnessVpcEndpointName.STS,
  HarnessVpcEndpointName.LOGS,
];

/** Builds a collision entry, defaulting to a no-gateway harness with an empty (create-everything) config. */
function entry(
  overrides: Partial<HarnessVpcEndpointCollisionEntry> & { harnessName: string },
): HarnessVpcEndpointCollisionEntry {
  return {
    vpcId: 'vpc-shared',
    securityGroups: ['sg-a'],
    config: {},
    hasGatewayTool: false,
    ...overrides,
  };
}

describe('validateHarnessVpcEndpointCollisions', () => {
  it('is a no-op for no entries', () => {
    expect(() => validateHarnessVpcEndpointCollisions([])).not.toThrow();
  });

  it('is a no-op for a single harness (nothing to collide with)', () => {
    expect(() => validateHarnessVpcEndpointCollisions([entry({ harnessName: 'solo' })])).not.toThrow();
  });

  // Case 1: different VPCs, both create — never interact.
  it('allows harnesses that each create the full set in different VPCs', () => {
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a', vpcId: 'vpc-1' }),
        entry({ harnessName: 'b', vpcId: 'vpc-2' }),
      ]),
    ).not.toThrow();
  });

  // Case 4: same VPC, same SG, the second harness excludes everything the first creates.
  it('allows same-VPC harnesses that share security groups and do not overlap (excludes on the second)', () => {
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a' }),
        entry({ harnessName: 'b', config: { exclude: ALL_SUPPORTING } }),
      ]),
    ).not.toThrow();
  });

  it('compares security-group sets order-insensitively', () => {
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a', securityGroups: ['sg-a', 'sg-b'] }),
        entry({ harnessName: 'b', securityGroups: ['sg-b', 'sg-a'], config: { exclude: ALL_SUPPORTING } }),
      ]),
    ).not.toThrow();
  });

  // Case 3: same VPC, same SG, no excludes — both derive the same five endpoints.
  it('rejects same-VPC harnesses that both create the same endpoints (duplicate at deploy)', () => {
    expect(() =>
      validateHarnessVpcEndpointCollisions([entry({ harnessName: 'a' }), entry({ harnessName: 'b' })]),
    ).toThrow(/only one Private-DNS interface endpoint per service per VPC/);
  });

  it('names the duplicated endpoints and both harnesses, pointing at exclude', () => {
    let message = '';
    try {
      validateHarnessVpcEndpointCollisions([entry({ harnessName: 'alpha' }), entry({ harnessName: 'beta' })]);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('vpc-shared');
    expect(message).toContain('alpha');
    expect(message).toContain('beta');
    expect(message).toContain('vpcEndpoints.exclude');
    // Every duplicated interface endpoint is listed by name.
    ALL_SUPPORTING.forEach(name => expect(message).toContain(name));
  });

  // Case 2: same VPC, different SGs — even with excludes eliminating every duplicate, the second
  // harness cannot reach the shared endpoints.
  it('rejects same-VPC harnesses with different security groups even when they do not overlap', () => {
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a', securityGroups: ['sg-a'] }),
        entry({ harnessName: 'b', securityGroups: ['sg-b'], config: { exclude: ALL_SUPPORTING } }),
      ]),
    ).toThrow(/different "networkConfiguration.securityGroups"/);
  });

  it('reports the security-group mismatch before the overlap when both are present', () => {
    // Different SGs AND both create the full set: the SG trap is the one exclude cannot fix, so it wins.
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a', securityGroups: ['sg-a'] }),
        entry({ harnessName: 'b', securityGroups: ['sg-b'] }),
      ]),
    ).toThrow(/hangs at first invoke/);
  });

  it('detects an overlap on the gateway endpoint alone when the supporting set is excluded on both', () => {
    // Both exclude all five supporting endpoints but both declare a gateway tool, so they collide only
    // on the AgentCore Gateway endpoint — proving the check honors hasGatewayTool, not just the defaults.
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a', hasGatewayTool: true, config: { exclude: ALL_SUPPORTING } }),
        entry({ harnessName: 'b', hasGatewayTool: true, config: { exclude: ALL_SUPPORTING } }),
      ]),
    ).toThrow(new RegExp(HarnessVpcEndpointName.AGENTCORE_GATEWAY));
  });

  it('allows a gateway harness alongside a non-overlapping supporting harness in the same VPC', () => {
    // 'gw' creates only the gateway endpoint; 'support' creates only the five supporting ones — disjoint.
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({
          harnessName: 'gw',
          hasGatewayTool: true,
          config: { exclude: ALL_SUPPORTING },
        }),
        entry({
          harnessName: 'support',
          config: { exclude: [HarnessVpcEndpointName.AGENTCORE_GATEWAY] },
        }),
      ]),
    ).not.toThrow();
  });

  it('validates each VPC group independently', () => {
    // vpc-1 is fine (excludes on the second); vpc-2 collides — the collision must still be caught.
    expect(() =>
      validateHarnessVpcEndpointCollisions([
        entry({ harnessName: 'a1', vpcId: 'vpc-1' }),
        entry({ harnessName: 'b1', vpcId: 'vpc-1', config: { exclude: ALL_SUPPORTING } }),
        entry({ harnessName: 'a2', vpcId: 'vpc-2' }),
        entry({ harnessName: 'b2', vpcId: 'vpc-2' }),
      ]),
    ).toThrow(/vpc-2/);
  });
});
