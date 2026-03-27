/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for mdaa-integ-helpers module exports.
 *
 * Property 11: Helper Module Exports
 * For any import of `@aws-mdaa/testing`, the module SHALL export
 * `getIntegEnv`, `getIntegNaming`, `getFixtureResources`, `getFixtureKmsKey`, and `ForceDestroy`.
 *
 * Validates: Requirements 4.2, 4.3
 */

import { App, Stack } from 'aws-cdk-lib';
import * as testing from '../lib';
import {
  getIntegEnv,
  getIntegNaming,
  getFixtureResources,
  getFixtureKmsKey,
  ForceDestroy,
} from '../lib/mdaa-integ-helpers';

describe('mdaa-integ-helpers module exports', () => {
  /**
   * Property 11: Helper Module Exports
   * Verify all expected functions are exported from @aws-mdaa/testing
   */
  describe('module exports', () => {
    test('getIntegEnv is exported', () => {
      expect(testing.getIntegEnv).toBeDefined();
      expect(typeof testing.getIntegEnv).toBe('function');
    });

    test('getIntegNaming is exported', () => {
      expect(testing.getIntegNaming).toBeDefined();
      expect(typeof testing.getIntegNaming).toBe('function');
    });

    test('getFixtureResources is exported', () => {
      expect(testing.getFixtureResources).toBeDefined();
      expect(typeof testing.getFixtureResources).toBe('function');
    });

    test('getFixtureKmsKey is exported', () => {
      expect(testing.getFixtureKmsKey).toBeDefined();
      expect(typeof testing.getFixtureKmsKey).toBe('function');
    });

    test('ForceDestroy is exported', () => {
      expect(testing.ForceDestroy).toBeDefined();
      expect(typeof testing.ForceDestroy).toBe('function');
    });
  });

  /**
   * Test getIntegEnv returns correct structure
   */
  describe('getIntegEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('returns object with account and region properties', () => {
      process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
      process.env.CDK_DEFAULT_REGION = 'us-east-1';

      const env = getIntegEnv();

      expect(env).toHaveProperty('account');
      expect(env).toHaveProperty('region');
      expect(env.account).toBe('123456789012');
      expect(env.region).toBe('us-east-1');
    });

    test('returns undefined values when env vars not set', () => {
      delete process.env.CDK_DEFAULT_ACCOUNT;
      delete process.env.CDK_DEFAULT_REGION;

      const env = getIntegEnv();

      expect(env).toHaveProperty('account');
      expect(env).toHaveProperty('region');
      expect(env.account).toBeUndefined();
      expect(env.region).toBeUndefined();
    });
  });

  /**
   * Test getIntegNaming returns valid naming instance
   */
  describe('getIntegNaming', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.CDK_DEFAULT_REGION = 'us-east-1';
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('returns IMdaaResourceNaming instance with default module name', () => {
      process.env.CI_PIPELINE_ID = '12345';
      const app = new App();
      const naming = getIntegNaming(app);

      expect(naming).toBeDefined();
      expect(naming.props).toBeDefined();
      expect(naming.props.org).toBe('mdaa');
      expect(naming.props.domain).toBe('12345'); // domain is now the run ID
      expect(naming.props.moduleName).toBe('fixture');
      delete process.env.CI_PIPELINE_ID;
    });

    test('returns IMdaaResourceNaming instance with custom module name', () => {
      process.env.CI_PIPELINE_ID = '12345';
      const app = new App();
      const naming = getIntegNaming(app, 's3-test');

      expect(naming).toBeDefined();
      expect(naming.props.moduleName).toBe('s3-test');
      delete process.env.CI_PIPELINE_ID;
    });

    test('resourceName method is available and returns valid name', () => {
      process.env.CI_PIPELINE_ID = '12345';
      const app = new App();
      const naming = getIntegNaming(app);

      expect(typeof naming.resourceName).toBe('function');
      const name = naming.resourceName('bucket');
      expect(name).toContain('mdaa');
      expect(name).toContain('12345'); // domain is now the run ID
      expect(name).toContain('bucket');
      delete process.env.CI_PIPELINE_ID;
    });

    test('env is derived from account and region, domain is run ID', () => {
      process.env.CDK_DEFAULT_REGION = 'us-west-2';
      process.env.CDK_DEFAULT_ACCOUNT = '123456789012';
      process.env.CI_PIPELINE_ID = '12345';
      const app = new App();
      const naming = getIntegNaming(app);

      // env: account 123456789012 + us-west-2 should become '123456789012-usw2'
      expect(naming.props.env).toBe('123456789012-usw2');
      // domain: pipeline 12345
      expect(naming.props.domain).toBe('12345');
      delete process.env.CI_PIPELINE_ID;
    });

    test('defaults to us-east-1 when region not set, domain is timestamp run ID', () => {
      delete process.env.CDK_DEFAULT_REGION;
      process.env.CDK_DEFAULT_ACCOUNT = '987654321098';
      delete process.env.CI_PIPELINE_ID;
      const app = new App();
      const naming = getIntegNaming(app);

      // env: account 987654321098 + us-east-1 should become '987654321098-use1'
      expect(naming.props.env).toBe('987654321098-use1');
      // domain: timestamp (6 digits)
      expect(naming.props.domain).toMatch(/^\d{6}$/);
    });
  });

  /**
   * Test ForceDestroy aspect class
   */
  describe('ForceDestroy', () => {
    test('can be instantiated', () => {
      const aspect = new ForceDestroy();
      expect(aspect).toBeDefined();
      expect(aspect).toBeInstanceOf(ForceDestroy);
    });

    test('has visit method', () => {
      const aspect = new ForceDestroy();
      expect(typeof aspect.visit).toBe('function');
    });
  });

  /**
   * Test getFixtureResources throws when env vars not set
   */
  describe('getFixtureResources', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('throws when INTEG_KMS_KEY_ARN not set', () => {
      delete process.env.INTEG_KMS_KEY_ARN;
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => getFixtureResources(stack)).toThrow('INTEG_KMS_KEY_ARN environment variable not set');
    });

    test('throws when INTEG_VPC_ID not set', () => {
      process.env.INTEG_KMS_KEY_ARN = 'arn:aws:kms:us-east-1:123456789012:key/test-key';
      delete process.env.INTEG_VPC_ID;
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => getFixtureResources(stack)).toThrow('INTEG_VPC_ID environment variable not set');
    });

    test('throws when INTEG_PRIVATE_SUBNETS not set', () => {
      process.env.INTEG_KMS_KEY_ARN = 'arn:aws:kms:us-east-1:123456789012:key/test-key';
      process.env.INTEG_VPC_ID = 'vpc-12345';
      delete process.env.INTEG_PRIVATE_SUBNETS;
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => getFixtureResources(stack)).toThrow('INTEG_PRIVATE_SUBNETS environment variable not set');
    });

    test('throws when INTEG_AZS not set', () => {
      process.env.INTEG_KMS_KEY_ARN = 'arn:aws:kms:us-east-1:123456789012:key/test-key';
      process.env.INTEG_VPC_ID = 'vpc-12345';
      process.env.INTEG_PRIVATE_SUBNETS = 'subnet-1,subnet-2';
      delete process.env.INTEG_AZS;
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => getFixtureResources(stack)).toThrow('INTEG_AZS environment variable not set');
    });
  });

  /**
   * Test getFixtureKmsKey throws when env var not set
   */
  describe('getFixtureKmsKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('throws when INTEG_KMS_KEY_ARN not set', () => {
      delete process.env.INTEG_KMS_KEY_ARN;
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => getFixtureKmsKey(stack)).toThrow('INTEG_KMS_KEY_ARN environment variable not set');
    });

    test('returns IKey when INTEG_KMS_KEY_ARN is set', () => {
      process.env.INTEG_KMS_KEY_ARN = 'arn:aws:kms:us-east-1:123456789012:key/test-key-id';
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const key = getFixtureKmsKey(stack);
      expect(key).toBeDefined();
      expect(key.keyArn).toBe('arn:aws:kms:us-east-1:123456789012:key/test-key-id');
    });
  });
});
