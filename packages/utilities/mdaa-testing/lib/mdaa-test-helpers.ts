/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib';

/**
 * Memoizes a function without parameter. Returns a new function that
 * will call the original function on the first invocation. Subsequent
 * invocations will return the same result.
 */
export function memoize<TResult>(fn: () => TResult) {
  let ran = false;
  let result: TResult;
  return (): TResult => {
    if (!ran) {
      result = fn();
      ran = true;
    }
    return result;
  };
}

/**
 * Base interface for MDAA test context
 */
export interface MdaaTestContext {
  org: string;
  env: string;
  domain: string;
  module_name: string;
  module_configs?: string;
  region?: string;
  account?: string;
  partition?: string;
}

/**
 * Default test context values
 */
export const DEFAULT_TEST_CONTEXT: MdaaTestContext = {
  org: 'test-org',
  env: 'test-env',
  domain: 'test-domain',
  module_name: 'test-module',
  region: 'us-east-1',
  account: 'xxxxxxxxxxxxx',
  partition: 'aws',
};

/**
 * Creates a test context with default values merged with provided overrides
 */
export function createTestContext(overrides: Partial<MdaaTestContext> = {}): MdaaTestContext {
  return {
    ...DEFAULT_TEST_CONTEXT,
    ...overrides,
  };
}
/**
 * Creates a mock CDK App with standard test environment
 */
export function createTestApp(context?: Record<string, boolean>): cdk.App {
  return new cdk.App({
    context: {
      '@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId': true,
      '@aws-cdk/core:stackRelativeExports': true,
      '@aws-cdk/aws-rds:lowercaseDbIdentifier': true,
      '@aws-cdk/aws-lambda:recognizeVersionProps': true,
      '@aws-cdk/aws-cloudfront:defaultSecurityPolicyTLSv1.2_2021': true,
      ...context,
    },
  });
}

/**
 * Creates a test stack with standard naming and environment
 */
export function createTestStack(
  app: cdk.App,
  stackName: string,
  context: MdaaTestContext,
  props?: cdk.StackProps,
): cdk.Stack {
  return new cdk.Stack(app, stackName, {
    env: {
      account: context.account,
      region: context.region,
    },
    stackName: `${context.org}-${context.env}-${context.domain}-${stackName}`,
    ...props,
  });
}

export class TestConfigurations {
  /**
   * Creates standard L3 construct props for testing
   * Note: This should be called within a stack context
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getL3ConstructProps(context: MdaaTestContext, stack?: any): any {
    const { MdaaDefaultResourceNaming } = require('@aws-mdaa/naming');
    const { MdaaRoleHelper } = require('@aws-mdaa/iam-role-helper');

    const mockNode = {
      tryGetContext: () => undefined,
    };

    const naming = new MdaaDefaultResourceNaming({
      cdkNode: mockNode,
      org: context.org,
      env: context.env,
      domain: context.domain,
      moduleName: context.module_name,
    });

    const roleHelper = new MdaaRoleHelper(stack, naming);

    return {
      naming,
      roleHelper,
      tags: {
        Environment: context.env,
        Organization: context.org,
        Domain: context.domain,
        Module: context.module_name,
        TestContext: 'snapshot-test',
      },
    };
  }
}

/**
 * Utility class for creating different types of MDAA test scenarios
 */
export class Create {
  static stackProvider(
    _stackName: string,
    stackFactory: (app: cdk.App, context: MdaaTestContext) => cdk.Stack,
    context: Partial<MdaaTestContext> = {},
  ): () => cdk.Stack {
    return memoize(() => {
      const testContext = createTestContext(context);
      const app = createTestApp();
      return stackFactory(app, testContext);
    });
  }

  static appProvider(
    appFactory: (context: MdaaTestContext) => cdk.App,
    context: Partial<MdaaTestContext> = {},
  ): () => cdk.App {
    return memoize(() => {
      const testContext = createTestContext(context);
      return appFactory(testContext);
    });
  }
}
