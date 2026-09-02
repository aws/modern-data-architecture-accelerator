/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildAgentcoreLifecycleConfiguration, LIFECYCLE_MAX_SECONDS, LIFECYCLE_MIN_SECONDS } from '../lib';

// Distinct labels per caller (Runtime uses PascalCase, Harness uses camelCase); the shared helper
// interpolates whatever the caller passes so each keeps its exact, test-asserted error strings.
const LABELS = { idleTimeoutLabel: 'IdleRuntimeSessionTimeout', maxLifetimeLabel: 'MaxLifetime' };

describe('buildAgentcoreLifecycleConfiguration', () => {
  it('maps both idleRuntimeSessionTimeout and maxLifetime when in range', () => {
    expect(buildAgentcoreLifecycleConfiguration({ idleRuntimeSessionTimeout: 900, maxLifetime: 3600 }, LABELS)).toEqual(
      { idleRuntimeSessionTimeout: 900, maxLifetime: 3600 },
    );
  });

  it('accepts the exact min and max bounds', () => {
    expect(
      buildAgentcoreLifecycleConfiguration(
        { idleRuntimeSessionTimeout: LIFECYCLE_MIN_SECONDS, maxLifetime: LIFECYCLE_MAX_SECONDS },
        LABELS,
      ),
    ).toEqual({ idleRuntimeSessionTimeout: LIFECYCLE_MIN_SECONDS, maxLifetime: LIFECYCLE_MAX_SECONDS });
  });

  it('omits fields that are not set', () => {
    expect(buildAgentcoreLifecycleConfiguration({ idleRuntimeSessionTimeout: 120 }, LABELS)).toEqual({
      idleRuntimeSessionTimeout: 120,
    });
    expect(buildAgentcoreLifecycleConfiguration({}, LABELS)).toEqual({});
  });

  it('throws on out-of-range idleRuntimeSessionTimeout, interpolating the caller label', () => {
    expect(() => buildAgentcoreLifecycleConfiguration({ idleRuntimeSessionTimeout: 59 }, LABELS)).toThrow(
      'IdleRuntimeSessionTimeout must be between 60 and 28800 seconds',
    );
    expect(() => buildAgentcoreLifecycleConfiguration({ idleRuntimeSessionTimeout: 28801 }, LABELS)).toThrow(
      'IdleRuntimeSessionTimeout must be between 60 and 28800 seconds',
    );
  });

  it('throws on out-of-range maxLifetime, interpolating the caller label', () => {
    expect(() => buildAgentcoreLifecycleConfiguration({ maxLifetime: 59 }, LABELS)).toThrow(
      'MaxLifetime must be between 60 and 28800 seconds',
    );
  });

  it('uses the caller-supplied labels verbatim (Harness camelCase)', () => {
    expect(() =>
      buildAgentcoreLifecycleConfiguration(
        { idleRuntimeSessionTimeout: 10 },
        { idleTimeoutLabel: 'idleRuntimeSessionTimeout', maxLifetimeLabel: 'maxLifetime' },
      ),
    ).toThrow('idleRuntimeSessionTimeout must be between 60 and 28800 seconds');
  });
});
