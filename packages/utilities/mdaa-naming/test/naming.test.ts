/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDefaultResourceNaming, MdaaResourceNamingConfig } from '../lib';
import { App } from 'aws-cdk-lib';

describe('MdaaDefaultResourceNaming', () => {
  const namingProps: MdaaResourceNamingConfig = {
    cdkNode: new App().node,
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    moduleName: 'test-module',
  };

  const naming = new MdaaDefaultResourceNaming(namingProps);

  test('resourceName', () => {
    expect(naming.resourceName()).toBe('test-org-test-env-test-domain-test-module');
    expect(naming.resourceName('test-resource')).toBe('test-org-test-env-test-domain-test-module-test-resource');
    expect(naming.resourceName('test-resource', 20)).toBe('test-org-tes-a115c7e');
  });

  test('ssmPath', () => {
    expect(naming.ssmPath('test-path')).toBe('/test-org/test-domain/test-module/test-path');
    expect(naming.ssmPath('test-path', false)).toBe('/test-org/test-domain/test-path');
    expect(naming.ssmPath('${Token[TOKEN.123]}')).toBe('/test-org/test-domain/test-module/${Token[TOKEN.123]}');
    expect(naming.ssmPath('${Token[TOKEN.123]}', true, true)).toBe(
      '/test-org/test-domain/test-module/${Token[TOKEN.123]}',
    );
  });

  test('exportName', () => {
    expect(naming.exportName('test-path')).toBe('test-org:test-domain:test-module:test-path');
    expect(naming.exportName('test-path', false)).toBe('test-org:test-domain:test-path');
    expect(naming.exportName('${Token[TOKEN.123]}')).toBe('test-org:test-domain:test-module:${Token[TOKEN.123]}');
    expect(naming.exportName('${Token[TOKEN.123]}', true, true)).toBe(
      'test-org:test-domain:test-module:${Token[TOKEN.123]}',
    );
  });

  test('stackName', () => {
    expect(naming.stackName()).toBe('test-org-test-env-test-domain-test-module');
    expect(naming.stackName('test-suffix')).toBe('test-org-test-env-test-domain-test-module-test-suffix');
  });

  test('withModuleName', () => {
    expect(naming.withModuleName('new-test-module').resourceName()).toBe(
      'test-org-test-env-test-domain-new-test-module',
    );
  });
});
