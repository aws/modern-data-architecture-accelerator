/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  BedrockBuilderL3Construct,
  BedrockBuilderL3ConstructProps,
  LambdaFunctionProps,
  NamedGatewayProps,
  NamedGatewayTargetProps,
} from '../lib';

// Exercises the bedrock-builder orchestration of AgentCore gateways + targets: the flat
// gateways/gatewayTargets config, generated-function: Lambda reference resolution, per-gateway CMK,
// and the target-reference validation graph. Gateway/target/interceptor Lambdas are built from the
// real fixture dir (./test/lambda/test), consistent with the compliance suite.

const dataAdminRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/test-role',
  name: 'test-role',
};

// A tool Lambda and an interceptor Lambda, both defined once in the shared pool and referenced by
// name via generated-function:<name>.
const lambdaFunctions: LambdaFunctionProps = {
  functions: [
    {
      functionName: 'weather-tool',
      srcDir: './test/lambda/test',
      handler: 'test_handler',
      roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      runtime: 'python3.14',
    },
    {
      functionName: 'authz-interceptor',
      srcDir: './test/lambda/test',
      handler: 'test_handler',
      roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      runtime: 'python3.14',
    },
  ],
};

const customJwt = {
  customJwt: {
    discoveryUrl: 'https://example.com/.well-known/openid-configuration',
    allowedAudience: ['my-audience'],
  },
};

function lambdaTarget(functionRef: string): NamedGatewayTargetProps {
  return {
    weather: {
      targetConfiguration: {
        lambda: {
          lambdaArn: functionRef,
          toolSchema: {
            inlinePayload: [{ name: 'getWeather', description: 'Weather', inputSchema: { type: 'object' } }],
          },
        },
      },
    },
  };
}

function build(props: {
  gateways?: NamedGatewayProps;
  gatewayTargets?: NamedGatewayTargetProps;
}): () => BedrockBuilderL3Construct {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  const constructProps: BedrockBuilderL3ConstructProps = {
    dataAdminRoles: [dataAdminRoleRef],
    roleHelper,
    naming: testApp.naming,
    lambdaFunctions,
    gateways: props.gateways,
    gatewayTargets: props.gatewayTargets,
  };
  return () => new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps);
}

function template(props: { gateways?: NamedGatewayProps; gatewayTargets?: NamedGatewayTargetProps }): Template {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', {
    dataAdminRoles: [dataAdminRoleRef],
    roleHelper,
    naming: testApp.naming,
    lambdaFunctions,
    gateways: props.gateways,
    gatewayTargets: props.gatewayTargets,
  });
  return Template.fromStack(testApp.testStack);
}

describe('BedrockBuilderL3Construct AgentCore gateway wiring', () => {
  test('creates one gateway per gateways-map entry with the derived name', () => {
    const t = template({
      gateways: {
        'gw-a': { authorizerConfiguration: customJwt },
        'gw-b': { authorizerConfiguration: customJwt },
      },
    });
    t.resourceCountIs('AWS::BedrockAgentCore::Gateway', 2);
    const names = Object.values(t.findResources('AWS::BedrockAgentCore::Gateway')).map(
      g => g.Properties.Name as string,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'test-org-test-env-test-domain-test-module-gw-a',
        'test-org-test-env-test-domain-test-module-gw-b',
      ]),
    );
  });

  test('gateways reuse the single shared module CMK (no per-gateway key)', () => {
    // The module provisions ONE shared CMK (getOrCreateKmsKey) for agents/KBs/guardrails/Lambdas and
    // gateways alike. A gateway must not create its own key — expect exactly one KMS::Key, and the
    // gateway wired to a key ARN.
    const t = template({ gateways: { 'gw-a': { authorizerConfiguration: customJwt } } });
    t.resourceCountIs('AWS::KMS::Key', 1);
    t.hasResourceProperties('AWS::BedrockAgentCore::Gateway', { KmsKeyArn: Match.anyValue() });
  });

  test('two gateways still share one CMK (no per-gateway key)', () => {
    // Multiple gateways must not multiply keys: one shared module CMK regardless of gateway count.
    const t = template({
      gateways: {
        'gw-a': { authorizerConfiguration: customJwt },
        'gw-b': { authorizerConfiguration: customJwt },
      },
    });
    t.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('the builder grants each gateway role CMK use via an identity policy; the shared key carries the vended-delivery grant', () => {
    // The gateway L3 adds no key grants (pure consumer). The builder:
    //  - grants the gateway EXECUTION ROLE its AgentCore encryption use of the shared CMK via an
    //    IDENTITY policy scoped to the key ARN, with no condition on the data-key ops. Both AWS-documented
    //    tightenings — kms:ViaService and the aws:bedrock-agentcore-gateway:arn encryption context — were
    //    deploy-tested and BOTH fail closed: AgentCore assumes the role and calls KMS directly on the
    //    target-encryption path, where neither is present, denying kms:GenerateDataKey; and
    //  - adds the gateways' vended-delivery service grant to the shared key policy for the audit-log
    //    pipeline. (The CloudWatch Logs at-rest grant is already on the shared key from getOrCreateKmsKey.)
    const t = template({ gateways: { 'gw-a': { authorizerConfiguration: customJwt } } });
    // delivery.logs supplies its SourceArn under the KMS encryption context (not aws:logs:arn); the
    // grant scopes it to this account/region's log ARNs.
    const logSourceArn = 'arn:test-partition:logs:test-region:test-account:*';
    const allJson = JSON.stringify(t.toJSON());

    // No kms:ViaService and no gateway-ARN encryption-context condition on the gateway-role grant
    // (both fail closed on the direct assumed-role KMS call).
    expect(allJson).not.toContain('bedrock-agentcore.test-region.amazonaws.com');
    expect(allJson).not.toContain('kms:EncryptionContext:aws:bedrock-agentcore-gateway:arn');

    // The gateway-role KMS grant is an identity managed policy: GenerateDataKey/Decrypt/DescribeKey
    // plus a constrained CreateGrant, scoped to the key ARN, no data-key condition.
    t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'GatewayCmkEncryptDecrypt',
            Action: ['kms:DescribeKey', 'kms:Decrypt', 'kms:GenerateDataKey'],
          }),
          Match.objectLike({
            Sid: 'GatewayCmkCreateGrant',
            Action: 'kms:CreateGrant',
            Condition: {
              StringEquals: { 'kms:GrantConstraintType': 'EncryptionContextSubset' },
              'ForAllValues:StringEquals': { 'kms:GrantOperations': ['Decrypt', 'GenerateDataKey'] },
            },
          }),
        ]),
      },
    });

    // The gateways' vended-delivery grant is added once to the shared key: delivery.logs principal,
    // minimal actions, guarded by two AND-ed conditions verified against the live service — the
    // SourceArn encryption context (the key delivery.logs actually sends, scoped to this account/
    // region's log ARNs) and aws:SourceAccount (cross-service confused-deputy protection).
    t.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowGatewayVendedLogDeliveryEncryption',
            Effect: 'Allow',
            Principal: { Service: 'delivery.logs.amazonaws.com' },
            Action: ['kms:GenerateDataKey', 'kms:Decrypt'],
            Condition: {
              StringEquals: {
                'kms:EncryptionContext:SourceArn': logSourceArn,
                'aws:SourceAccount': 'test-account',
              },
            },
          }),
        ]),
      },
    });
  });

  test('resolves a target generated-function: reference to the built function ARN', () => {
    const t = template({
      gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['weather'] } },
      gatewayTargets: lambdaTarget('generated-function:weather-tool'),
    });
    t.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 1);
    // The gateway role is granted scoped invoke on the resolved (GetAtt) tool-function ARN — not the
    // literal generated-function: string.
    const allJson = JSON.stringify(t.toJSON());
    expect(allJson).not.toContain('generated-function:weather-tool');
    t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Action: 'lambda:InvokeFunction' })]),
      },
    });
  });

  test('passes a plain target lambdaArn through unchanged', () => {
    const plainArn = 'arn:test-partition:lambda:test-region:111111111111:function:external-tool';
    const t = template({
      gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['weather'] } },
      gatewayTargets: lambdaTarget(plainArn),
    });
    const allJson = JSON.stringify(t.toJSON());
    expect(allJson).toContain(plainArn);
  });

  test('resolves an interceptor generated-function: reference to a by-ref interceptor ARN', () => {
    // Baseline: a gateway with no interceptors. The by-ref interceptor must add ZERO functions (it is
    // wired to the already-deployed shared-pool function, not re-deployed by the gateway).
    const baseline = template({ gateways: { 'gw-a': { authorizerConfiguration: customJwt } } });
    const baselineFnCount = Object.keys(baseline.findResources('AWS::Lambda::Function')).length;

    const t = template({
      gateways: {
        'gw-a': {
          authorizerConfiguration: customJwt,
          interceptors: [{ interceptionPoints: ['REQUEST'], lambdaArn: 'generated-function:authz-interceptor' }],
        },
      },
    });
    expect(Object.keys(t.findResources('AWS::Lambda::Function')).length).toBe(baselineFnCount);

    const gateways = t.findResources('AWS::BedrockAgentCore::Gateway');
    const cfg = Object.values(gateways)[0].Properties.InterceptorConfigurations[0];
    expect(cfg.InterceptionPoints).toEqual(['REQUEST']);
    // Wired to the shared-pool function ARN (a GetAtt token), not the generated-function: string.
    expect(JSON.stringify(cfg.Interceptor.Lambda.Arn)).toContain('Fn::GetAtt');
    expect(JSON.stringify(cfg.Interceptor.Lambda.Arn)).not.toContain('generated-function:');
  });

  test('throws when a target references an unknown generated function', () => {
    expect(
      build({
        gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['weather'] } },
        gatewayTargets: lambdaTarget('generated-function:does-not-exist'),
      }),
    ).toThrow(/gateway target "weather" references non-existent Generated Lambda function: does-not-exist/);
  });

  test('throws when an interceptor references an unknown generated function', () => {
    expect(
      build({
        gateways: {
          'gw-a': {
            authorizerConfiguration: customJwt,
            interceptors: [{ interceptionPoints: ['REQUEST'], lambdaArn: 'generated-function:missing-interceptor' }],
          },
        },
      }),
    ).toThrow(/gateway interceptor at index 0 references non-existent Generated Lambda function: missing-interceptor/);
  });

  test('throws when a gateway references a target not defined in gatewayTargets', () => {
    expect(
      build({
        gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['ghost'] } },
        gatewayTargets: lambdaTarget('generated-function:weather-tool'),
      }),
    ).toThrow(/Gateway "gw-a" references gateway target "ghost", which is not defined in gatewayTargets/);
  });

  test('throws when a target is referenced by more than one gateway', () => {
    expect(
      build({
        gateways: {
          'gw-a': { authorizerConfiguration: customJwt, targets: ['weather'] },
          'gw-b': { authorizerConfiguration: customJwt, targets: ['weather'] },
        },
        gatewayTargets: lambdaTarget('generated-function:weather-tool'),
      }),
    ).toThrow(/Gateway target "weather" is referenced by more than one gateway/);
  });

  test('resolves a RESPONSE interceptor generated-function: reference (not just REQUEST)', () => {
    // Coverage: resolveInterceptorLambdaReferences must rewrite a generated-function ref regardless of
    // interception point. Confirm a RESPONSE interceptor is wired by-ref to the shared-pool function.
    const t = template({
      gateways: {
        'gw-a': {
          authorizerConfiguration: customJwt,
          interceptors: [{ interceptionPoints: ['RESPONSE'], lambdaArn: 'generated-function:authz-interceptor' }],
        },
      },
    });
    const cfg = Object.values(t.findResources('AWS::BedrockAgentCore::Gateway'))[0].Properties
      .InterceptorConfigurations[0];
    expect(cfg.InterceptionPoints).toEqual(['RESPONSE']);
    expect(JSON.stringify(cfg.Interceptor.Lambda.Arn)).toContain('Fn::GetAtt');
    expect(JSON.stringify(cfg.Interceptor.Lambda.Arn)).not.toContain('generated-function:');
  });

  test('passes a plain-ARN interceptor through unchanged (resolveInterceptorLambdaReferences non-generated branch)', () => {
    // Coverage: the non generated-function branch of resolveInterceptorLambdaReferences — a plain
    // lambdaArn is left untouched, deploys no function, and is wired to the literal ARN.
    const plainArn = 'arn:test-partition:lambda:test-region:111111111111:function:external-interceptor';
    const baseline = template({ gateways: { 'gw-a': { authorizerConfiguration: customJwt } } });
    const baselineFnCount = Object.keys(baseline.findResources('AWS::Lambda::Function')).length;

    const t = template({
      gateways: {
        'gw-a': {
          authorizerConfiguration: customJwt,
          interceptors: [{ interceptionPoints: ['REQUEST'], lambdaArn: plainArn }],
        },
      },
    });
    expect(Object.keys(t.findResources('AWS::Lambda::Function')).length).toBe(baselineFnCount);
    const cfg = Object.values(t.findResources('AWS::BedrockAgentCore::Gateway'))[0].Properties
      .InterceptorConfigurations[0];
    expect(cfg.Interceptor.Lambda.Arn).toEqual(plainArn);
  });

  test('passes an inline lambdaFunction interceptor through so the gateway L3 deploys it (non-generated branch)', () => {
    // Coverage: resolveInterceptorLambdaReferences leaves an inline lambdaFunction interceptor
    // untouched; the gateway L3 then deploys it. Assert one MORE function than the by-ref baseline.
    const baseline = template({ gateways: { 'gw-a': { authorizerConfiguration: customJwt } } });
    const baselineFnCount = Object.keys(baseline.findResources('AWS::Lambda::Function')).length;

    const t = template({
      gateways: {
        'gw-a': {
          authorizerConfiguration: customJwt,
          interceptors: [
            {
              interceptionPoints: ['REQUEST'],
              lambdaFunction: {
                functionName: 'inline-interceptor',
                srcDir: './test/lambda/test',
                handler: 'test_handler',
                runtime: 'python3.14',
                roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
              },
            },
          ],
        },
      },
    });
    expect(Object.keys(t.findResources('AWS::Lambda::Function')).length).toBe(baselineFnCount + 1);
    const cfg = Object.values(t.findResources('AWS::BedrockAgentCore::Gateway'))[0].Properties
      .InterceptorConfigurations[0];
    // Wired to the just-deployed inline function (a GetAtt token).
    expect(JSON.stringify(cfg.Interceptor.Lambda.Arn)).toContain('Fn::GetAtt');
  });

  test('throws on a malformed generated-function reference with an empty function name', () => {
    // Coverage: resolveGeneratedFunctionRef edge case — 'generated-function:' with no name segment
    // (empty after the colon) resolves to no function and throws naming an empty function.
    expect(
      build({
        gateways: {
          'gw-a': {
            authorizerConfiguration: customJwt,
            interceptors: [{ interceptionPoints: ['REQUEST'], lambdaArn: 'generated-function:' }],
          },
        },
      }),
    ).toThrow(/gateway interceptor at index 0 references non-existent Generated Lambda function:/);
  });

  test('registers multiple targets on a single gateway (multi-target-per-gateway)', () => {
    // Coverage: a gateway referencing more than one target — every prior test used exactly one.
    const t = template({
      gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['weather', 'catalog'] } },
      gatewayTargets: {
        weather: {
          targetConfiguration: {
            lambda: {
              lambdaArn: 'generated-function:weather-tool',
              toolSchema: {
                inlinePayload: [{ name: 'getWeather', description: 'Weather', inputSchema: { type: 'object' } }],
              },
            },
          },
        },
        catalog: {
          targetConfiguration: {
            lambda: {
              lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:catalog',
              toolSchema: {
                inlinePayload: [{ name: 'getCatalog', description: 'Catalog', inputSchema: { type: 'object' } }],
              },
            },
          },
        },
      },
    });
    t.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 2);
  });

  test('resolves an S3-tool-schema target through the builder (no lambdaArn rewrite on the schema)', () => {
    // Coverage: a target whose toolSchema is S3 (not inline). The builder still resolves the Lambda
    // ARN (generated-function here) and passes the S3 schema through to the target resource.
    const t = template({
      gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['weather'] } },
      gatewayTargets: {
        weather: {
          targetConfiguration: {
            lambda: {
              lambdaArn: 'generated-function:weather-tool',
              toolSchema: { s3: { uri: 's3://example-schemas/weather.json' } },
            },
          },
        },
      },
    });
    t.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 1);
    const allJson = JSON.stringify(t.toJSON());
    expect(allJson).toContain('s3://example-schemas/weather.json');
    expect(allJson).not.toContain('generated-function:weather-tool');
  });

  test('passes a non-Lambda target config through unchanged (resolveGatewayTargets if(!lambda) branch)', () => {
    // Coverage: the if(!lambda) passthrough in resolveGatewayTargets. A non-Lambda target type is not
    // rewritten by the builder; the gateway L3 then rejects it as not-yet-supported. The throw from
    // the gateway L3 (not a builder-side crash dereferencing lambda.lambdaArn) proves the passthrough.
    expect(
      build({
        gateways: { 'gw-a': { authorizerConfiguration: customJwt, targets: ['api'] } },
        gatewayTargets: {
          api: {
            targetConfiguration: {
              mcpServer: { endpoint: 'https://mcp.example.com' },
            },
          },
        },
      }),
    ).toThrow(/not yet supported/);
  });

  test('no gateways produces no gateway resources', () => {
    const t = template({});
    t.resourceCountIs('AWS::BedrockAgentCore::Gateway', 0);
    t.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 0);
  });
});
