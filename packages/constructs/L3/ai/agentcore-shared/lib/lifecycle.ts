/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared session-lifecycle second bounds for AgentCore Runtime and Harness. Both services accept a
 * `LifecycleConfiguration` whose `idleRuntimeSessionTimeout` and `maxLifetime` must each fall in the
 * 60-28800 second range (from the CloudFormation `LifecycleConfiguration` spec).
 */
export const LIFECYCLE_MIN_SECONDS = 60;
export const LIFECYCLE_MAX_SECONDS = 28800;

/**
 * Session-lifecycle configuration shared by the AgentCore Runtime and Harness L3 constructs. The
 * field set matches both services' `LifecycleConfiguration` exactly, so a built object (see
 * {@link buildAgentcoreLifecycleConfiguration}) is assignable to either L1's typed lifecycle
 * property (`CfnRuntime`/`CfnHarness` are structurally identical here).
 */
export interface LifecycleConfigProperty {
  /**
   * Idle session timeout in seconds before automatic termination.
   *
   * Validation: Optional; Number; 60-28800 seconds
   **/
  readonly idleRuntimeSessionTimeout?: number;
  /**
   * Maximum session lifetime in seconds before forced termination regardless of activity.
   *
   * Validation: Optional; Number; 60-28800 seconds
   **/
  readonly maxLifetime?: number;
}

/**
 * Error-message field labels for {@link buildAgentcoreLifecycleConfiguration}. The Runtime and
 * Harness constructs surface the same validation but with their own casing conventions in the
 * thrown message (Runtime uses `IdleRuntimeSessionTimeout` / `MaxLifetime`; Harness uses the
 * camelCase config-field names), so each caller passes its own labels to keep its exact,
 * test-asserted error strings.
 */
export interface LifecycleConfigLabels {
  readonly idleTimeoutLabel: string;
  readonly maxLifetimeLabel: string;
}

/**
 * Builds the lifecycle configuration object for an AgentCore L1 construct, validating each supplied
 * field against the shared 60-28800 second range. The returned plain object matches the
 * `LifecycleConfiguration` shape of both `CfnRuntime` and `CfnHarness` (structurally identical), so
 * callers assign it directly to their typed L1 lifecycle property. Only fields that are set are
 * emitted, so the template omits unset ones.
 *
 * @param lifecycleConfig - The caller's lifecycle configuration
 * @param labels - Per-caller error-message field labels (see {@link LifecycleConfigLabels})
 * @returns A validated lifecycle configuration object
 * @throws Error if a supplied timeout is outside the 60-28800 second range
 */
export function buildAgentcoreLifecycleConfiguration(
  lifecycleConfig: LifecycleConfigProperty,
  labels: LifecycleConfigLabels,
): LifecycleConfigProperty {
  const config: { idleRuntimeSessionTimeout?: number; maxLifetime?: number } = {};
  if (lifecycleConfig.idleRuntimeSessionTimeout !== undefined) {
    const timeout = lifecycleConfig.idleRuntimeSessionTimeout;
    if (timeout < LIFECYCLE_MIN_SECONDS || timeout > LIFECYCLE_MAX_SECONDS) {
      throw new Error(
        `${labels.idleTimeoutLabel} must be between ${LIFECYCLE_MIN_SECONDS} and ${LIFECYCLE_MAX_SECONDS} seconds`,
      );
    }
    config.idleRuntimeSessionTimeout = timeout;
  }
  if (lifecycleConfig.maxLifetime !== undefined) {
    const lifetime = lifecycleConfig.maxLifetime;
    if (lifetime < LIFECYCLE_MIN_SECONDS || lifetime > LIFECYCLE_MAX_SECONDS) {
      throw new Error(
        `${labels.maxLifetimeLabel} must be between ${LIFECYCLE_MIN_SECONDS} and ${LIFECYCLE_MAX_SECONDS} seconds`,
      );
    }
    config.maxLifetime = lifetime;
  }
  return config;
}
