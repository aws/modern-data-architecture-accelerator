/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDefaultResourceNaming, MdaaResourceNamingConfig, MdaaResourceType } from '../lib';
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

  test('withResourceType (default impl is a no-op)', () => {
    expect(naming.withResourceType(MdaaResourceType.S3_BUCKET).resourceName('bronze')).toBe(
      naming.resourceName('bronze'),
    );
    expect(naming.withResourceType(MdaaResourceType.LAMBDA_FUNCTION).resourceName()).toBe(naming.resourceName());
    // Newer AgentCore resource types also resolve through the no-op default (no naming logic of their own).
    expect(naming.withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_GATEWAY).resourceName('gw')).toBe(
      naming.resourceName('gw'),
    );
    expect(naming.withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_GATEWAY_TARGET).resourceName('tgt')).toBe(
      naming.resourceName('tgt'),
    );
    // S3 Tables resource type resolves through the no-op default as well.
    expect(naming.withResourceType(MdaaResourceType.S3_TABLES).resourceName('analytics')).toBe(
      naming.resourceName('analytics'),
    );
    expect(naming.withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_HARNESS).resourceName('harness')).toBe(
      naming.resourceName('harness'),
    );
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

  describe('@mdaaIncludeEnvInSsmPath flag', () => {
    const namingWithEnvFlag = (env: string, flagValue: unknown = true) =>
      new MdaaDefaultResourceNaming({
        cdkNode: new App({ context: { '@mdaaIncludeEnvInSsmPath': flagValue } }).node,
        org: 'test-org',
        env,
        domain: 'test-domain',
        moduleName: 'test-module',
      });

    test('ssmPath includes env after domain when flag is true', () => {
      const envNaming = namingWithEnvFlag('dev');
      expect(envNaming.ssmPath('test-path')).toBe('/test-org/test-domain/dev/test-module/test-path');
      expect(envNaming.ssmPath('test-path', false)).toBe('/test-org/test-domain/dev/test-path');
      expect(envNaming.ssmPath('TEST-PATH', true, false)).toBe('/test-org/test-domain/dev/test-module/TEST-PATH');
    });

    test('exportName includes env after domain when flag is true', () => {
      const envNaming = namingWithEnvFlag('dev');
      expect(envNaming.exportName('test-path')).toBe('test-org:test-domain:dev:test-module:test-path');
    });

    test('flag accepts the string "true" as well as boolean true', () => {
      const stringNaming = namingWithEnvFlag('dev', 'true');
      expect(stringNaming.ssmPath('test-path')).toBe('/test-org/test-domain/dev/test-module/test-path');
      expect(stringNaming.exportName('test-path')).toBe('test-org:test-domain:dev:test-module:test-path');
    });

    test('flag is off for boolean false, string "false", and absent', () => {
      // Boolean false
      const falseNaming = namingWithEnvFlag('dev', false);
      expect(falseNaming.ssmPath('test-path')).toBe('/test-org/test-domain/test-module/test-path');
      expect(falseNaming.exportName('test-path')).toBe('test-org:test-domain:test-module:test-path');
      // String "false"
      const falseStringNaming = namingWithEnvFlag('dev', 'false');
      expect(falseStringNaming.ssmPath('test-path')).toBe('/test-org/test-domain/test-module/test-path');
      // Absent (no context key at all)
      expect(naming.ssmPath('test-path')).toBe('/test-org/test-domain/test-module/test-path');
      expect(naming.exportName('test-path')).toBe('test-org:test-domain:test-module:test-path');
    });

    test('flag throws on any value other than true/false', () => {
      for (const bad of ['yes', '1', 'True', 'TRUE', ' true ', 'enabled']) {
        const badNaming = namingWithEnvFlag('dev', bad);
        expect(() => badNaming.ssmPath('test-path')).toThrow(/Expected 'true' or 'false'/);
      }
    });

    test('two environments of the same module do not collide when flag is true', () => {
      const devNaming = namingWithEnvFlag('dev');
      const prodNaming = namingWithEnvFlag('prod');
      expect(devNaming.ssmPath('kms/cmk/arn')).toBe('/test-org/test-domain/dev/test-module/kms/cmk/arn');
      expect(prodNaming.ssmPath('kms/cmk/arn')).toBe('/test-org/test-domain/prod/test-module/kms/cmk/arn');
      expect(devNaming.ssmPath('kms/cmk/arn')).not.toBe(prodNaming.ssmPath('kms/cmk/arn'));
      expect(devNaming.exportName('kms:cmk:arn')).not.toBe(prodNaming.exportName('kms:cmk:arn'));
    });
  });
});
