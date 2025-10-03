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
  /**
   * Q-ENHANCED-PROPERTY
   * Required organization identifier for MDAA test context enabling organizational scope and resource naming. Provides the organization context for test environments affecting resource naming, tagging, and organizational boundaries in test scenarios.
   *
   * Use cases: Organizational scope; Resource naming; Test boundaries; Context identification
   *
   * AWS: Organization context for AWS resource naming and test environment organization
   *
   * Validation: Must be valid organization identifier string; required for test context and resource organization
   **/
  readonly org: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required environment identifier for MDAA test context enabling environment-specific testing and resource isolation. Provides the environment context for test scenarios affecting resource naming, configuration, and environment-specific behavior validation.
   *
   * Use cases: Environment-specific testing; Resource isolation; Configuration validation; Environment context
   *
   * AWS: Environment context for AWS resource deployment and test environment isolation
   *
   * Validation: Must be valid environment identifier string; required for test context and environment isolation
   **/
  readonly env: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required domain identifier for MDAA test context enabling domain-specific testing and logical grouping. Provides the domain context for test scenarios affecting resource organization, logical boundaries, and domain-specific configuration validation.
   *
   * Use cases: Domain-specific testing; Logical grouping; Resource organization; Domain context
   *
   * AWS: Domain context for AWS resource organization and test scenario grouping
   *
   * Validation: Must be valid domain identifier string; required for test context and logical organization
   **/
  readonly domain: string;
  readonly module_name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional module configuration parameters for MDAA test context enabling configuration-specific testing scenarios. Provides module-specific configuration for test scenarios affecting configuration validation, parameter testing, and module behavior verification.
   *
   * Use cases: Configuration testing; Parameter validation; Module behavior verification; Configuration scenarios
   *
   * AWS: MDAA module configuration for test scenario configuration and validation
   *
   * Validation: Must be valid configuration string if provided; enables configuration-specific testing when specified
   **/
  readonly module_configs?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional AWS region for MDAA test context enabling region-specific testing and deployment validation. Provides the AWS region context for test scenarios affecting regional resource deployment, region-specific behavior, and multi-region testing.
   *
   * Use cases: Region-specific testing; Deployment validation; Regional behavior; Multi-region testing
   *
   * AWS: AWS region for regional resource deployment and region-specific test validation
   *
   * Validation: Must be valid AWS region string if provided; defaults to us-east-1 for consistent testing
   **/
  readonly region?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional AWS account identifier for MDAA test context enabling account-specific testing and cross-account validation. Provides the AWS account context for test scenarios affecting account-specific resources, permissions, and cross-account behavior validation.
   *
   * Use cases: Account-specific testing; Cross-account validation; Permission testing; Account context
   *
   * AWS: AWS account ID for account-specific resource testing and validation
   *
   * Validation: Must be valid AWS account ID string if provided; defaults to placeholder for test scenarios
   **/
  readonly account?: string;
  readonly partition?: string;
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
  /**
   * Q-ENHANCED-PROPERTY
   * Additional CDK stack properties for customizing test stack configuration beyond the default MDAA test context settings. Provides optional stack-level configuration including tags, termination protection, and other CDK stack properties for enhanced test scenario setup and stack behavior customization.
   *
   * Use cases: Test customization; Stack configuration; Property override; Test scenario setup; Stack behavior control
   *
   * AWS: AWS CDK Stack properties for CloudFormation stack configuration and deployment settings
   *
   * Validation: Must be valid CDK StackProps object; optional for additional stack configuration beyond defaults
   */
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
