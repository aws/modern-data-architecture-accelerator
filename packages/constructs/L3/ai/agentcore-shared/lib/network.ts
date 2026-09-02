/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * VPC network-member array bounds shared by the AgentCore Runtime and Harness L3 constructs, from
 * the CloudFormation `VpcConfig` spec: `securityGroups` and `subnets` are each
 * {@link NETWORK_MEMBERS_MIN}-{@link NETWORK_MEMBERS_MAX} entries.
 *
 * Both the bounds and the bound-check itself are shared (see {@link validateAgentcoreVpcNetworkMembers}).
 * The two constructs still validate at different points (the Runtime inside its builder, the Harness
 * up-front in a dedicated validator); they differ only in the module prefix on the error message.
 */
export const NETWORK_MEMBERS_MIN = 1;
export const NETWORK_MEMBERS_MAX = 16;

/**
 * Validates the two VPC network-member arrays (`securityGroups` and `subnets`) against the shared
 * {@link NETWORK_MEMBERS_MIN}-{@link NETWORK_MEMBERS_MAX} bounds. Mirrors the argument shape of
 * {@link buildAgentcoreVpcNetworkConfiguration} so callers validate and build from the same pair of
 * arrays. This is the single source of truth for the bound-check both the AgentCore Runtime and
 * Harness constructs run; they differ only in the `prefix` that opens each error message (e.g.
 * `Agentcore` vs `Harness`). The bounds in the message are interpolated from the constants.
 *
 * @param securityGroups - The `securityGroups` array to validate (may be undefined from an
 *   untyped/YAML caller)
 * @param subnets - The `subnets` array to validate (may be undefined from an untyped/YAML caller)
 * @param prefix - Module prefix that opens each error message (e.g. `Agentcore`, `Harness`)
 * @throws Error if either array is missing/empty or exceeds the maximum
 */
export function validateAgentcoreVpcNetworkMembers(
  securityGroups: string[] | undefined,
  subnets: string[] | undefined,
  prefix: string,
): void {
  const inBounds = (values: string[] | undefined): boolean =>
    !!values && values.length >= NETWORK_MEMBERS_MIN && values.length <= NETWORK_MEMBERS_MAX;

  if (!inBounds(securityGroups)) {
    throw new Error(
      `${prefix} "networkConfiguration.securityGroups" must contain ${NETWORK_MEMBERS_MIN}-${NETWORK_MEMBERS_MAX} security group IDs.`,
    );
  }
  if (!inBounds(subnets)) {
    throw new Error(
      `${prefix} "networkConfiguration.subnets" must contain ${NETWORK_MEMBERS_MIN}-${NETWORK_MEMBERS_MAX} subnet IDs.`,
    );
  }
}

/**
 * Builds the VPC network-configuration object shared by the AgentCore Runtime and Harness L3
 * constructs. MDAA hardcodes `NetworkMode: VPC` (the single source of truth for MDAA's VPC-mode
 * enforcement). The returned plain object matches the `NetworkConfiguration` shape of both
 * `CfnRuntime` and `CfnHarness` (structurally identical), so callers assign it directly to their
 * typed L1 network property.
 *
 * This helper does not validate — callers validate `securityGroups` / `subnets` themselves (see
 * {@link NETWORK_MEMBERS_MIN} / {@link NETWORK_MEMBERS_MAX}) before calling.
 */
export function buildAgentcoreVpcNetworkConfiguration(
  securityGroups: string[],
  subnets: string[],
): { networkMode: string; networkModeConfig: { securityGroups: string[]; subnets: string[] } } {
  return {
    networkMode: 'VPC',
    networkModeConfig: {
      securityGroups,
      subnets,
    },
  };
}
