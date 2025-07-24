/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib';
import {
  memoize,
  MdaaTestContext,
  DEFAULT_TEST_CONTEXT,
  createTestContext,
  createTestApp,
  Create,
} from '../lib/mdaa-test-helpers';

describe('mdaa-test-helpers', () => {
  describe('memoize', () => {
    it('should call the function only once', () => {
      const mockFn = jest.fn().mockReturnValue('test-result');
      const memoizedFn = memoize(mockFn);

      const result1 = memoizedFn();
      const result2 = memoizedFn();
      const result3 = memoizedFn();

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-result');
      expect(result2).toBe('test-result');
      expect(result3).toBe('test-result');
    });
  });

  describe('createTestContext', () => {
    it('should return default test context when no overrides provided', () => {
      const context = createTestContext();

      expect(context).toEqual(DEFAULT_TEST_CONTEXT);
    });

    it('should merge overrides with default test context', () => {
      const overrides: Partial<MdaaTestContext> = {
        org: 'custom-org',
        env: 'custom-env',
        region: 'us-west-2',
      };

      const context = createTestContext(overrides);

      expect(context).toEqual({
        ...DEFAULT_TEST_CONTEXT,
        ...overrides,
      });
    });
  });

  describe('createTestApp', () => {
    it('should create a CDK app with default context', () => {
      const app = createTestApp();

      expect(app).toBeInstanceOf(cdk.App);
      expect(app.node.tryGetContext('@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId')).toBe(true);
      expect(app.node.tryGetContext('@aws-cdk/core:stackRelativeExports')).toBe(true);
      expect(app.node.tryGetContext('@aws-cdk/aws-rds:lowercaseDbIdentifier')).toBe(true);
      expect(app.node.tryGetContext('@aws-cdk/aws-lambda:recognizeVersionProps')).toBe(true);
      expect(app.node.tryGetContext('@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021')).toBe(true);
    });

    it('should merge custom context with default context', () => {
      const customContext = {
        'custom:key': true,
        '@aws-cdk/core:stackRelativeExports': false,
      };

      const app = createTestApp(customContext);

      expect(app.node.tryGetContext('custom:key')).toBe(true);
      expect(app.node.tryGetContext('@aws-cdk/core:stackRelativeExports')).toBe(false);
    });
  });

  describe('Create.stackProvider', () => {
    it('should create a memoized stack provider', () => {
      const mockStack = new cdk.Stack();
      const stackFactory = jest.fn().mockReturnValue(mockStack);

      const stackProvider = Create.stackProvider('test-stack', stackFactory);
      const stack1 = stackProvider();
      const stack2 = stackProvider();

      expect(stackFactory).toHaveBeenCalledTimes(1);
      expect(stack1).toBe(mockStack);
      expect(stack2).toBe(mockStack);
    });

    it('should pass correct context to stack factory', () => {
      const contextOverrides: Partial<MdaaTestContext> = {
        org: 'custom-org',
        env: 'custom-env',
      };
      const stackFactory = jest.fn().mockReturnValue(new cdk.Stack());

      const stackProvider = Create.stackProvider('test-stack', stackFactory, contextOverrides);
      stackProvider();

      expect(stackFactory).toHaveBeenCalledWith(
        expect.any(cdk.App),
        expect.objectContaining({
          ...DEFAULT_TEST_CONTEXT,
          ...contextOverrides,
        }),
      );
    });
  });

  describe('Create.appProvider', () => {
    it('should create a memoized app provider', () => {
      const mockApp = new cdk.App();
      const appFactory = jest.fn().mockReturnValue(mockApp);

      const appProvider = Create.appProvider(appFactory);
      const app1 = appProvider();
      const app2 = appProvider();

      expect(appFactory).toHaveBeenCalledTimes(1);
      expect(app1).toBe(mockApp);
      expect(app2).toBe(mockApp);
    });

    it('should pass correct context to app factory', () => {
      const contextOverrides: Partial<MdaaTestContext> = {
        org: 'custom-org',
        env: 'custom-env',
      };
      const appFactory = jest.fn().mockReturnValue(new cdk.App());

      const appProvider = Create.appProvider(appFactory, contextOverrides);
      appProvider();

      expect(appFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          ...DEFAULT_TEST_CONTEXT,
          ...contextOverrides,
        }),
      );
    });
  });
});
