/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppProps, MdaaCdkApp } from '../lib/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaAppConfigParserProps, MdaaSageMakerCustomBluePrintConfig } from '../lib/app_config';
import { Aspects, Stack } from 'aws-cdk-lib';
import { InlinePolicyNamingAspect } from '@aws-mdaa/construct'; //NOSONAR

class TestApp extends MdaaCdkApp {
  constructor(props: MdaaAppProps = {}) {
    super(props, { name: '@aws-mdaa/test-app', version: '1.0.0' });
  }

  protected subGenerateResources(
    _stack: Stack,
    _l3Props: MdaaL3ConstructProps,
    _parserProps: MdaaAppConfigParserProps,
  ) {
    console.log(`Not implementing: ${_stack}, ${_l3Props}, ${_parserProps}`);
  }

  static testParsePackageJson(path: string) {
    return MdaaCdkApp.parsePackageJson(path);
  }
}

describe('MdaaCdkApp', () => {
  const baseContext = {
    org: 'test-org',
    env: 'dev',
    domain: 'test-domain',
    module_name: 'test-module',
  };

  test('constructor requires org context', () => {
    expect(
      () =>
        new TestApp({
          context: {
            ...baseContext,
            org: undefined,
          },
        }),
    ).toThrow("Organization must be specified in context as 'org'");
  });

  test('constructor requires env context', () => {
    expect(
      () =>
        new TestApp({
          context: {
            ...baseContext,
            env: undefined,
          },
        }),
    ).toThrow("Environment must be specified in context as 'env'");
  });

  test('constructor requires domain context', () => {
    expect(
      () =>
        new TestApp({
          context: {
            ...baseContext,
            domain: undefined,
          },
        }),
    ).toThrow("Domain must be specified in context as 'domain'");
  });

  test('constructor requires module_name context', () => {
    expect(
      () =>
        new TestApp({
          context: {
            ...baseContext,
            module_name: undefined,
          },
        }),
    ).toThrow("Module Name must be specified in context as 'module_name'");
  });

  test('creates app with valid context', () => {
    const app = new TestApp({ context: baseContext });
    expect(app).toBeDefined();
  });

  test('generateStack returns stack', () => {
    const app = new TestApp({ context: baseContext });
    const stack = app.generateStack();
    expect(stack).toBeDefined();
    expect(Stack.isStack(stack)).toBe(true);
  });

  test('parsePackageJson extracts name and version', () => {
    const result = TestApp.testParsePackageJson(`${__dirname}/../package.json`);
    expect(result.name).toBeDefined();
    expect(result.version).toBeDefined();
  });

  test('handles useBootstrap from props', () => {
    const app = new TestApp({ context: baseContext, useBootstrap: false });
    expect(app).toBeDefined();
  });

  test('handles useBootstrap from context', () => {
    const app = new TestApp({ context: { ...baseContext, use_bootstrap: 'false' } });
    expect(app).toBeDefined();
  });

  test('handles additional_stacks with region', () => {
    const app = new TestApp({
      context: {
        ...baseContext,
        additional_stacks: JSON.stringify([{ region: 'us-west-2' }]),
      },
    });
    const stack = app.generateStack();
    expect(stack).toBeDefined();
  });

  test('handles additional_stacks with account', () => {
    const app = new TestApp({
      context: {
        ...baseContext,
        additional_stacks: JSON.stringify([{ account: '123456789012' }]),
      },
    });
    const stack = app.generateStack();
    expect(stack).toBeDefined();
  });

  test('throws error when additional_stacks missing both account and region', () => {
    expect(
      () =>
        new TestApp({
          context: {
            ...baseContext,
            additional_stacks: JSON.stringify([{}]),
          },
        }),
    ).toThrow('One of account or region must be specified in additional_stacks');
  });

  describe('deploy region resolution', () => {
    const regionEnvVars = ['CI_SUPPLIED_TARGET_REGION', 'CDK_DEPLOY_REGION', 'CDK_DEFAULT_REGION'];
    const savedEnv: { [key: string]: string | undefined } = {};

    beforeEach(() => {
      regionEnvVars.forEach(name => {
        savedEnv[name] = process.env[name];
        delete process.env[name];
      });
    });

    afterEach(() => {
      regionEnvVars.forEach(name => {
        if (savedEnv[name] === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = savedEnv[name];
        }
      });
    });

    test.each([
      ['uses CDK_DEPLOY_REGION exported by the MDAA CLI', { CDK_DEPLOY_REGION: 'eu-west-2' }, 'eu-west-2'],
      [
        'CDK_DEPLOY_REGION takes precedence over CDK_DEFAULT_REGION',
        { CDK_DEPLOY_REGION: 'eu-west-2', CDK_DEFAULT_REGION: 'us-east-1' },
        'eu-west-2',
      ],
      [
        'CI_SUPPLIED_TARGET_REGION takes precedence over CDK_DEPLOY_REGION',
        { CI_SUPPLIED_TARGET_REGION: 'us-west-2', CDK_DEPLOY_REGION: 'eu-west-2' },
        'us-west-2',
      ],
      [
        'an empty CI_SUPPLIED_TARGET_REGION falls through to CDK_DEPLOY_REGION',
        { CI_SUPPLIED_TARGET_REGION: '', CDK_DEPLOY_REGION: 'eu-west-2' },
        'eu-west-2',
      ],
      ['falls back to CDK_DEFAULT_REGION', { CDK_DEFAULT_REGION: 'ap-southeast-2' }, 'ap-southeast-2'],
    ])('%s', (_name, env: { [key: string]: string }, expectedRegion) => {
      Object.assign(process.env, env);
      const app = new TestApp({ context: baseContext });
      expect(app.generateStack().region).toBe(expectedRegion);
    });
  });

  describe('InlinePolicyNamingAspect application', () => {
    const hasInlineAspect = (app: MdaaCdkApp): boolean =>
      Aspects.of(app).all.some(a => a instanceof InlinePolicyNamingAspect);

    test('is not applied when the context flag is absent', () => {
      const app = new TestApp({ context: baseContext });
      expect(hasInlineAspect(app)).toBe(false);
    });

    test('is not applied when the context flag is false', () => {
      const app = new TestApp({
        context: { ...baseContext, '@aws-mdaa/namingEnforceInlinePolicies': 'false' },
      });
      expect(hasInlineAspect(app)).toBe(false);
    });

    test('is applied when the context flag is true', () => {
      const app = new TestApp({
        context: { ...baseContext, '@aws-mdaa/namingEnforceInlinePolicies': 'true' },
      });
      expect(hasInlineAspect(app)).toBe(true);
    });

    test('flag parsing is case-insensitive', () => {
      const app = new TestApp({
        context: { ...baseContext, '@aws-mdaa/namingEnforceInlinePolicies': 'TRUE' },
      });
      expect(hasInlineAspect(app)).toBe(true);
    });

    test('is applied when the context flag is a quoted value from the CLI', () => {
      // The CLI emits the flag value wrapped in double quotes; cleanContextStringValue
      // strips them. Exercise that quote-stripping path for this flag.
      const app = new TestApp({
        context: { ...baseContext, '@aws-mdaa/namingEnforceInlinePolicies': '"true"' },
      });
      expect(hasInlineAspect(app)).toBe(true);
    });
  });

  describe('SageMaker Blueprint', () => {
    test('generateStack with sagemakerBlueprint using SSM param creates blueprint stack', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        domainConfigSSMParam: '/test/domain/config',
        description: 'Test Blueprint',
        blueprintName: 'test-blueprint',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      const stack = app.generateStack();
      expect(stack).toBeDefined();
      expect(Stack.isStack(stack)).toBe(true);
    });

    test('generateStack with domainConfigSSMParam instead of domainConfig', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        domainConfigSSMParam: '/test/domain/config',
        description: 'Test Blueprint with SSM',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      const stack = app.generateStack();
      expect(stack).toBeDefined();
    });

    test('throws error when neither domainConfig nor domainConfigSSMParam provided', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        description: 'Test Blueprint',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      expect(() => app.generateStack()).toThrow('One of domainConfig or domainConfigSSMParam must be specified');
    });

    test('handles blueprint with provisioningRoleArn', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        domainConfigSSMParam: '/test/domain/config',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
        description: 'Test Blueprint with Role',
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      const stack = app.generateStack();
      expect(stack).toBeDefined();
    });

    test('handles blueprint with parameters', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
        domainConfigSSMParam: '/test/domain/config',
        description: 'Test Blueprint with Parameters',
        parameters: {
          InstanceType: {
            blueprintParamProps: {
              fieldType: 'STRING',
              defaultValue: 'ml.t3.medium',
              description: 'Instance type for SageMaker',
              isEditable: true,
              isOptional: false,
            },
            cfnParamProps: {
              type: 'String',
              default: 'ml.t3.medium',
            },
          },
        },
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      const stack = app.generateStack();
      expect(stack).toBeDefined();
    });

    describe('resolveDomainBucketName', () => {
      test('returns bucket name as-is', () => {
        const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
          domainBucketName: 'my-regular-bucket-name',
          domainConfigSSMParam: '/test/domain/config',
          description: 'Test Blueprint',
          provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
        };

        const app = new TestApp({
          context: baseContext,
          appConfigRaw: {
            sagemakerBlueprint: sagemakerConfig,
          },
        });

        const stack = app.generateStack();
        expect(stack).toBeDefined();
      });
    });

    test('blueprint uses custom blueprintName when provided', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        domainConfigSSMParam: '/test/domain/config',
        blueprintName: 'custom-blueprint-name',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
        description: 'Test Blueprint',
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      const stack = app.generateStack();
      expect(stack).toBeDefined();
    });

    test('blueprint generates default name when blueprintName not provided', () => {
      const sagemakerConfig: MdaaSageMakerCustomBluePrintConfig = {
        domainBucketName: 'test-domain-bucket',
        domainConfigSSMParam: '/test/domain/config',
        description: 'Test Blueprint',
        provisioningRole: { arn: 'arn:aws:iam::123456789012:role/test-provisioning-role' },
      };

      const app = new TestApp({
        context: baseContext,
        appConfigRaw: {
          sagemakerBlueprint: sagemakerConfig,
        },
      });

      const stack = app.generateStack();
      expect(stack).toBeDefined();
    });
  });
});
