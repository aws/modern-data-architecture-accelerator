/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaOrgDomainEnvConfigValueTransformer } from '../lib/org-domain-env-transformer';
import { MdaaDefaultResourceNaming } from '@aws-mdaa/naming';
import { Stack } from 'aws-cdk-lib';

describe('MdaaOrgDomainEnvConfigValueTransformer', () => {
  let transformer: MdaaOrgDomainEnvConfigValueTransformer;

  beforeEach(() => {
    const stack = new Stack();
    const naming = new MdaaDefaultResourceNaming({
      cdkNode: stack.node,
      org: 'test-org',
      env: 'dev',
      domain: 'test-domain',
      moduleName: 'test',
    });
    transformer = new MdaaOrgDomainEnvConfigValueTransformer(naming);
  });

  test('transforms ssm-org: prefix', () => {
    const result = transformer.transformValue('ssm-org:my-param');
    expect(result).toContain('ssm:');
    expect(result).toContain('test-org');
  });

  test('transforms ssm-domain: prefix', () => {
    const result = transformer.transformValue('ssm-domain:my-param');
    expect(result).toContain('ssm:');
    expect(result).toContain('test-domain');
  });

  test('transforms ssm-env: prefix', () => {
    const result = transformer.transformValue('ssm-env:my-param');
    expect(result).toContain('ssm:');
    expect(result).toContain('dev');
  });

  test('returns unchanged value for non-matching prefix', () => {
    const result = transformer.transformValue('regular-value');
    expect(result).toBe('regular-value');
  });
});
