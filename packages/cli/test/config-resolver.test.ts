/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  computeEffectiveMdaaVersion,
  computeEffectiveContext,
  computeEffectiveTagConfig,
  computeEffectiveTagConfigFiles,
  computeEffectiveCustomAspects,
  computeEffectiveCustomNaming,
  computeEffectiveTerraformConfig,
  computeEffectivePermissionsBoundaryArn,
} from '../lib/config-resolver';
import { EffectiveConfig } from '../lib/config-types';

function makeParent(overrides: Partial<EffectiveConfig> = {}): EffectiveConfig {
  return {
    effectiveContext: {},
    effectiveTagConfig: {},
    tagConfigFiles: [],
    customAspects: [],
    ...overrides,
  };
}

describe('computeEffectiveMdaaVersion', () => {
  it('returns child when child is provided', () => {
    const parent = makeParent({ effectiveMdaaVersion: '1.5.0' });
    expect(computeEffectiveMdaaVersion(parent, '1.6.0')).toBe('1.6.0');
  });

  it('falls back to parent when child is undefined', () => {
    const parent = makeParent({ effectiveMdaaVersion: '1.5.0' });
    expect(computeEffectiveMdaaVersion(parent, undefined)).toBe('1.5.0');
  });

  it('falls back to parent when child is empty string (|| semantics)', () => {
    const parent = makeParent({ effectiveMdaaVersion: '1.5.0' });
    expect(computeEffectiveMdaaVersion(parent, '')).toBe('1.5.0');
  });

  it('returns undefined when neither parent nor child have a version', () => {
    const parent = makeParent();
    expect(computeEffectiveMdaaVersion(parent, undefined)).toBeUndefined();
  });
});

describe('computeEffectiveContext', () => {
  it('merges child over parent', () => {
    const parent = makeParent({ effectiveContext: { a: '1', b: '2' } });
    expect(computeEffectiveContext(parent, { b: '3', c: '4' })).toEqual({ a: '1', b: '3', c: '4' });
  });

  it('returns parent context when child is undefined', () => {
    const parent = makeParent({ effectiveContext: { x: 'y' } });
    expect(computeEffectiveContext(parent, undefined)).toEqual({ x: 'y' });
  });
});

describe('computeEffectiveTagConfig', () => {
  it('merges child over parent', () => {
    const parent = makeParent({ effectiveTagConfig: { env: 'prod', team: 'data' } });
    expect(computeEffectiveTagConfig(parent, { team: 'ml' })).toEqual({ env: 'prod', team: 'ml' });
  });

  it('returns parent tags when child is undefined', () => {
    const parent = makeParent({ effectiveTagConfig: { env: 'dev' } });
    expect(computeEffectiveTagConfig(parent, undefined)).toEqual({ env: 'dev' });
  });
});

describe('computeEffectiveTagConfigFiles', () => {
  it('appends child to parent', () => {
    const parent = makeParent({ tagConfigFiles: ['a.yaml'] });
    expect(computeEffectiveTagConfigFiles(parent, ['b.yaml'])).toEqual(['a.yaml', 'b.yaml']);
  });

  it('returns parent files when child is undefined', () => {
    const parent = makeParent({ tagConfigFiles: ['a.yaml'] });
    expect(computeEffectiveTagConfigFiles(parent, undefined)).toEqual(['a.yaml']);
  });

  it('returns child files when parent is empty', () => {
    const parent = makeParent({ tagConfigFiles: [] });
    expect(computeEffectiveTagConfigFiles(parent, ['c.yaml'])).toEqual(['c.yaml']);
  });
});

describe('computeEffectiveCustomAspects', () => {
  it('appends child to parent', () => {
    const parentAspect = { classpath: 'com.Aspect1' } as never;
    const childAspect = { classpath: 'com.Aspect2' } as never;
    const parent = makeParent({ customAspects: [parentAspect] });
    expect(computeEffectiveCustomAspects(parent, [childAspect])).toEqual([parentAspect, childAspect]);
  });

  it('returns parent aspects when child is undefined', () => {
    const aspect = { classpath: 'com.A' } as never;
    const parent = makeParent({ customAspects: [aspect] });
    expect(computeEffectiveCustomAspects(parent, undefined)).toEqual([aspect]);
  });
});

describe('computeEffectiveCustomNaming', () => {
  it('returns child when child is provided', () => {
    const parentNaming = { classpath: 'com.Parent' } as never;
    const childNaming = { classpath: 'com.Child' } as never;
    const parent = makeParent({ customNaming: parentNaming });
    expect(computeEffectiveCustomNaming(parent, childNaming)).toBe(childNaming);
  });

  it('falls back to parent when child is undefined', () => {
    const parentNaming = { classpath: 'com.Parent' } as never;
    const parent = makeParent({ customNaming: parentNaming });
    expect(computeEffectiveCustomNaming(parent, undefined)).toBe(parentNaming);
  });

  it('returns undefined when neither has naming', () => {
    const parent = makeParent();
    expect(computeEffectiveCustomNaming(parent, undefined)).toBeUndefined();
  });
});

describe('computeEffectiveTerraformConfig', () => {
  it('returns undefined when neither parent nor child has config', () => {
    const parent = makeParent();
    expect(computeEffectiveTerraformConfig(parent, undefined)).toBeUndefined();
  });

  it('returns parent config when child is undefined', () => {
    const parent = makeParent({ terraform: { enabled: true } as never });
    const result = computeEffectiveTerraformConfig(parent, undefined);
    expect(result).toBeDefined();
    expect((result as { enabled: boolean }).enabled).toBe(true);
  });

  it('deep-merges child with parent on non-conflicting keys', () => {
    const parent = makeParent({ terraform: { enabled: true, backend: { type: 's3' } } as never });
    const child = { backend: { bucket: 'my-bucket' } } as never;
    const result = computeEffectiveTerraformConfig(parent, child);
    expect(result).toMatchObject({ enabled: true, backend: { type: 's3', bucket: 'my-bucket' } });
  });

  it('child overrides parent on a conflicting key (matches every other computeEffective* helper)', () => {
    const parent = makeParent({ terraform: { backend: { type: 's3' } } as never });
    const child = { backend: { type: 'gcs' } } as never;
    const result = computeEffectiveTerraformConfig(parent, child);
    expect(result).toMatchObject({ backend: { type: 'gcs' } });
  });

  it('does not mutate the child object passed in', () => {
    const parent = makeParent({ terraform: { backend: { type: 's3' } } as never });
    const child = { backend: { bucket: 'my-bucket' } } as never;
    const childSnapshot = JSON.parse(JSON.stringify(child));
    computeEffectiveTerraformConfig(parent, child);
    expect(child).toEqual(childSnapshot);
  });
});

describe('computeEffectivePermissionsBoundaryArn', () => {
  it('returns child when child is provided', () => {
    const parent = makeParent({ permissionsBoundaryArn: 'arn:parent' });
    expect(computeEffectivePermissionsBoundaryArn(parent, 'arn:child')).toBe('arn:child');
  });

  it('preserves empty-string child (nullish coalescing, not ||)', () => {
    const parent = makeParent({ permissionsBoundaryArn: 'arn:parent' });
    // Empty string is a valid override meaning "no boundary" — ?? preserves it
    expect(computeEffectivePermissionsBoundaryArn(parent, '')).toBe('');
  });

  it('falls back to parent when child is undefined', () => {
    const parent = makeParent({ permissionsBoundaryArn: 'arn:parent' });
    expect(computeEffectivePermissionsBoundaryArn(parent, undefined)).toBe('arn:parent');
  });

  it('returns undefined when neither has an ARN', () => {
    const parent = makeParent();
    expect(computeEffectivePermissionsBoundaryArn(parent, undefined)).toBeUndefined();
  });
});
