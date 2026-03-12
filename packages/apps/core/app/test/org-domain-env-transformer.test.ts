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

  test('wraps ssm-org: prefix with {{resolve:ssm:/test-org/<param>}}', () => {
    const result = transformer.transformValue('ssm-org:my-param');
    expect(result).toBe('{{resolve:ssm:/test-org/my-param}}');
  });

  test('wraps ssm-domain: prefix with {{resolve:ssm:/test-org/test-domain/<param>}}', () => {
    const result = transformer.transformValue('ssm-domain:my-param');
    expect(result).toBe('{{resolve:ssm:/test-org/test-domain/my-param}}');
  });

  test('wraps ssm-env: prefix with {{resolve:ssm:/test-org/test-domain/<param>}}', () => {
    const result = transformer.transformValue('ssm-env:my-param');
    expect(result).toBe('{{resolve:ssm:/test-org/test-domain/dev/my-param}}');
  });
});
