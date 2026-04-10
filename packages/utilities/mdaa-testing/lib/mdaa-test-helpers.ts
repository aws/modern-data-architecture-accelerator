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
export interface MdaaTestContext {
  /** Organization identifier for MDAA test context enabling organizational scope and resource naming */
  readonly org: string;
  /** Environment identifier for MDAA test context enabling environment-specific testing and resource isolation */
  readonly env: string;
  /** Domain identifier for MDAA test context enabling domain-specific testing and logical grouping */
  readonly domain: string;
  readonly module_name: string;
  /** Module configuration parameters for MDAA test context enabling configuration-specific testing scenarios */
  readonly module_configs?: string;
  /** AWS region for MDAA test context enabling region-specific testing and deployment validation */
  readonly region?: string;
  /** AWS account identifier for MDAA test context enabling account-specific testing and cross-account validation */
  readonly account?: string;
  readonly partition?: string;
  /** Index signature to allow additional context variables such as cross-account references */
  readonly [key: string]: string | undefined;
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
  'account-2': 'test-account-2',
  'account-3': 'test-account-3',
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
  /** Additional CDK stack properties for customizing test stack configuration beyond the default MDAA test context settings */
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MdaaDefaultResourceNaming } = require('@aws-mdaa/naming');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MdaaRoleHelper } = require('@aws-mdaa/iam-role-helper');

    const mockNode = {
      tryGetContext: () => undefined,
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

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
