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
    const newName = naming.resourceName('x'.repeat(100), 20);
    expect(newName.length).toBe(20);
    expect(newName).toBe('test-org-te-5a4488cb');
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

    expect(naming.exportName('${Token[TOKEN.123]}')).toBe('test-org:test-domain:test-module:${Token[TOKEN.123]}');
  });

  test('stackName', () => {
    expect(naming.stackName()).toBe('test-org-test-env-test-domain-test-module');
    expect(naming.stackName('test-module')).toBe('test-org-test-env-test-domain-test-module-test-module');
  });

  test('withModuleName', () => {
    expect(naming.withModuleName('test-new-module').resourceName()).toBe(
      'test-org-test-env-test-domain-test-new-module',
    );
  });

  test('withOrg', () => {
    const newNaming = naming.withOrg('new-org');
    expect(newNaming.resourceName()).toBe('new-org-test-env-test-domain-test-module');
  });

  test('withEnv', () => {
    const newNaming = naming.withEnv('new-env');
    expect(newNaming.resourceName()).toBe('test-org-new-env-test-domain-test-module');
  });

  test('withDomain', () => {
    const newNaming = naming.withDomain('new-domain');
    expect(newNaming.resourceName()).toBe('test-org-test-env-new-domain-test-module');
  });

  test('withSuffix', () => {
    const newNaming = naming.withSuffix('suffix');
    expect(newNaming.resourceName()).toBe('test-org-test-env-test-domain-test-module-suffix');
  });

  test('ssmOrgPath', () => {
    expect(naming.ssmOrgPath('test-path')).toBe('/test-org/test-path');
    expect(naming.ssmOrgPath('/test-path')).toBe('/test-org/test-path');
    expect(naming.ssmOrgPath('TEST-PATH', false)).toBe('/test-org/TEST-PATH');
  });

  test('ssmDomainPath', () => {
    expect(naming.ssmDomainPath('test-path')).toBe('/test-org/test-domain/test-path');
    expect(naming.ssmDomainPath('/test-path')).toBe('/test-org/test-domain/test-path');
    expect(naming.ssmDomainPath('TEST-PATH', false)).toBe('/test-org/test-domain/TEST-PATH');
  });

  test('ssmEnvPath', () => {
    expect(naming.ssmEnvPath('test-path')).toBe('/test-org/test-domain/test-env/test-path');
    expect(naming.ssmEnvPath('/test-path')).toBe('/test-org/test-domain/test-env/test-path');
    expect(naming.ssmEnvPath('TEST-PATH', false)).toBe('/test-org/test-domain/test-env/TEST-PATH');
  });

  test('ssmPath with lowerCase false', () => {
    expect(naming.ssmPath('TEST-PATH', true, false)).toBe('/test-org/test-domain/test-module/TEST-PATH');
  });

  test('stackName sanitizes special characters', () => {
    const specialNaming = new MdaaDefaultResourceNaming({
      cdkNode: new App().node,
      org: 'test_org',
      env: 'test_env',
      domain: 'test_domain',
      moduleName: 'test_module',
    });
    expect(specialNaming.stackName()).toBe('test-org-test-env-test-domain-test-module');
  });
});
