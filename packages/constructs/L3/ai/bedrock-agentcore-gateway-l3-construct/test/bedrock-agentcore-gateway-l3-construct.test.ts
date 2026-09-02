/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  BedrockAgentcoreGatewayL3Construct,
  BedrockAgentcoreGatewayL3ConstructProps,
  GatewayExceptionLevel,
} from '../lib';

// Interceptor functions are deployed inline via the shared LambdaFunctionL3Construct, which builds
// code with Code.fromAsset(srcDir). Redirect fromAsset to an existing directory (this test dir) so
// the tests need no dedicated on-disk fixture. (Code.fromInline can't be used here: the dataops
// construct builds the runtime via `new Runtime(string)`, which never supportsInlineCode.)
const originalFromAsset = lambda.Code.fromAsset.bind(lambda.Code);
jest.spyOn(lambda.Code, 'fromAsset').mockImplementation(() => originalFromAsset(__dirname));

// The gateway no longer provisions or imports a key — the caller resolves and injects a mutable CMK
// (mirrors the Bedrock Knowledge Base construct). Create one rotation-enabled key per test stack;
// the gateway adds its role grants and the log-delivery grants to this key's policy.
function baseProps(testApp: MdaaTestApp, roleHelper: MdaaRoleHelper): BedrockAgentcoreGatewayL3ConstructProps {
  return {
    gatewayName: 'test-gateway',
    authorizerConfiguration: {
      customJwt: {
        discoveryUrl: 'https://example.com/.well-known/openid-configuration',
        allowedAudience: ['my-audience'],
      },
    },
    kmsKey: new Key(testApp.testStack, 'GwKey', { enableKeyRotation: true }),
    naming: testApp.naming,
    roleHelper,
  };
}

// An interceptor with an inline Lambda function definition (MDAA deploys it). srcDir is redirected
// to this test dir by the fromAsset mock above, so no on-disk fixture is needed.
function interceptor(
  interceptionPoints: ('REQUEST' | 'RESPONSE')[],
  functionName: string,
  passRequestHeaders?: boolean,
) {
  return {
    interceptionPoints,
    passRequestHeaders,
    lambdaFunction: {
      functionName,
      srcDir: __dirname,
      handler: 'index.handler',
      runtime: 'python3.12',
      roleArn: 'arn:aws:iam::123456789012:role/interceptor-fn-role',
    },
  };
}

describe('BedrockAgentcoreGatewayL3Construct', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  test('creates exactly one gateway with a KMS key ARN and CUSTOM_JWT authorizer', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
    const template = Template.fromStack(testApp.testStack);

    template.resourceCountIs('AWS::BedrockAgentCore::Gateway', 1);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      AuthorizerType: 'CUSTOM_JWT',
      ProtocolType: 'MCP',
      KmsKeyArn: Match.anyValue(),
      AuthorizerConfiguration: {
        CustomJWTAuthorizer: {
          DiscoveryUrl: 'https://example.com/.well-known/openid-configuration',
          AllowedAudience: ['my-audience'],
        },
      },
    });
  });

  test('gateway name is sanitized to the hyphen pattern (no underscores)', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      gatewayName: 'my_gateway_01',
    });
    const template = Template.fromStack(testApp.testStack);
    const gateways = template.findResources('AWS::BedrockAgentCore::Gateway');
    const name = Object.values(gateways)[0].Properties.Name as string;
    expect(name).not.toContain('_');
    // The service enforces the 48-char gateway name pattern at runtime (CreateGateway).
    expect(name).toMatch(/^([0-9a-zA-Z][-]?){1,48}$/);
    expect(name.length).toBeLessThanOrEqual(48);
  });

  test('uses the caller-provided KMS key and provisions none itself', () => {
    // The gateway never creates or imports a key; it wires in the injected CMK. Only the single key
    // created by the caller (in baseProps) is present, and the gateway's KmsKeyArn resolves to it.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::KMS::Key', 1);
    const keyLogicalId = Object.keys(template.findResources('AWS::KMS::Key'))[0];
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      KmsKeyArn: { 'Fn::GetAtt': [keyLogicalId, 'Arn'] },
    });
  });

  test('auto-creates an execution role when role is omitted', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: 'bedrock-agentcore.amazonaws.com' },
            Condition: Match.objectLike({
              StringEquals: Match.objectLike({ 'aws:SourceAccount': Match.anyValue() }),
            }),
          }),
        ]),
      },
    });
  });

  test('references an existing role and creates none when role is provided', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      role: { arn: 'arn:aws:iam::123456789012:role/existing-gateway-role' },
    });
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::IAM::Role', 0);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      RoleArn: 'arn:aws:iam::123456789012:role/existing-gateway-role',
    });
  });

  test('a gateway with no interceptors creates no execution-role managed policy and grants no logs permissions', () => {
    // Least-privilege: the gateway execution role gets no CloudWatch Logs permissions (gateways log
    // via vended delivery), and with no interceptors there is no managed policy on the role at all.
    // Vended log delivery is now ON by default, but it adds no managed policy and no logs:* to the
    // role — it uses the key resource policy plus Cfn delivery resources — so these negatives hold.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      role: { arn: 'arn:aws:iam::123456789012:role/existing-gateway-role' },
    });
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::IAM::ManagedPolicy', 0);
    // No statement anywhere grants logs:* on the role.
    const allJson = JSON.stringify(template.toJSON());
    expect(allJson).not.toContain('logs:CreateLogGroup');
    expect(allJson).not.toContain('logs:DescribeLogGroups');
  });

  test('adds no grants to the injected key — the gateway is a pure key consumer', () => {
    // The gateway no longer mutates the key policy: the gateway-role encryption grants and the
    // CloudWatch Logs / vended-delivery grants are added by whoever provisions the key (the
    // orchestrating module/app). Guard that the gateway itself emits none of them onto the key.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      role: { arn: 'arn:aws:iam::123456789012:role/existing-gateway-role' },
    });
    const template = Template.fromStack(testApp.testStack);
    // Only the caller's key (from baseProps) exists, and the gateway adds no grant statements to it.
    template.resourceCountIs('AWS::KMS::Key', 1);
    const allJson = JSON.stringify(template.toJSON());
    // Guard the specific gateway-role encryption SIDs that were deleted from this construct.
    expect(allJson).not.toContain('AllowGatewayRoleDescribeDecrypt');
    expect(allJson).not.toContain('AllowGatewayRoleCreateGrant');
    // Guard the log-delivery grants by the SERVICE PRINCIPALS they would carry, not by SID strings the
    // construct never emits: a CDK-generated grant (e.g. key.grantEncryptDecrypt(...)) adds a SID-less
    // statement, so a SID check can't catch it. Any accidental at-rest (logs.{region}) or
    // vended-delivery (delivery.logs) grant surfaces as one of these principals on the key policy.
    const keyResource = Object.values(template.findResources('AWS::KMS::Key'))[0];
    const principals = JSON.stringify(
      (keyResource.Properties.KeyPolicy as { Statement: { Principal?: unknown }[] }).Statement.map(s => s.Principal),
    );
    expect(principals).not.toContain('logs.test-region.amazonaws.com');
    expect(principals).not.toContain('delivery.logs.amazonaws.com');
  });

  test('grants interceptor invoke to a referenced role', () => {
    // Regression: interceptor invoke grant was previously skipped for referenced roles.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      role: { arn: 'arn:aws:iam::123456789012:role/existing-gateway-role' },
      interceptors: [interceptor(['REQUEST'], 'req-interceptor')],
    });
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Roles: ['existing-gateway-role'],
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Action: 'lambda:InvokeFunction' })]),
      },
    });
  });

  test('never grants SynchronizeGatewayTargets to the execution role, even with semantic search', () => {
    // SynchronizeGatewayTargets is a control-plane action for the deploying principal (the CDK
    // CloudFormation execution role), not the gateway execution role — so the construct must not
    // attach it to the role under any searchType.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      protocolConfiguration: { searchType: 'SEMANTIC' },
    });
    const template = Template.fromStack(testApp.testStack);
    const policies = template.findResources('AWS::IAM::ManagedPolicy');
    const hasSync = Object.values(policies).some(p =>
      JSON.stringify(p.Properties.PolicyDocument).includes('SynchronizeGatewayTargets'),
    );
    expect(hasSync).toBe(false);
  });

  test('accepts a description containing punctuation', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      description: 'MCP gateway for prod (us-east-1): data-lake tools.',
    });
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      Description: 'MCP gateway for prod (us-east-1): data-lake tools.',
    });
  });

  test('scopes the auto-created role trust to this gateway ARN prefix', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
    const template = Template.fromStack(testApp.testStack);
    const roles = template.findResources('AWS::IAM::Role');
    const trustJson = JSON.stringify(Object.values(roles)[0].Properties.AssumeRolePolicyDocument);
    // SourceArn is scoped to gateway/<name>-* rather than gateway/*
    expect(trustJson).toContain(':gateway/');
    expect(trustJson).not.toContain(':gateway/*');
  });

  test('trust-policy SourceArn prefix matches the truncated gateway Name for a long name', () => {
    // A name long enough that the MDAA-prefixed name exceeds the 48-char gateway limit and is
    // truncated (with a hash suffix). The L2 and L3 must truncate to the SAME length, or the
    // trust-policy SourceArn prefix would not match the emitted Gateway Name and the service could
    // not assume the role. Derive the expected prefix from the actual Name so the test guards the
    // two truncations staying in lockstep rather than hardcoding the hash.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      gatewayName: 'supercalifragilistic-weather-intelligence-gateway',
    });
    const template = Template.fromStack(testApp.testStack);
    const gatewayName = Object.values(template.findResources('AWS::BedrockAgentCore::Gateway'))[0].Properties.Name;
    expect(gatewayName.length).toBe(48); // truncation actually bit
    const role = Object.values(template.findResources('AWS::IAM::Role'))[0];
    const trustJson = JSON.stringify(role.Properties.AssumeRolePolicyDocument);
    expect(trustJson).toContain(`:gateway/${gatewayName}-*`);
  });

  test('AWS_IAM (no customJwt) sets no authorizer configuration', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      gatewayName: 'iam-gateway',
      authorizerConfiguration: {},
      kmsKey: new Key(testApp.testStack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper,
    });
    const template = Template.fromStack(testApp.testStack);
    const gateways = template.findResources('AWS::BedrockAgentCore::Gateway');
    const props = Object.values(gateways)[0].Properties;
    expect(props.AuthorizerType).toBe('AWS_IAM');
    expect(props.AuthorizerConfiguration).toBeUndefined();
  });

  test('omitting authorizerConfiguration entirely falls back to AWS_IAM', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      gatewayName: 'iam-gateway',
      kmsKey: new Key(testApp.testStack, 'GwKey', { enableKeyRotation: true }),
      naming: testApp.naming,
      roleHelper,
    });
    const template = Template.fromStack(testApp.testStack);
    const props = Object.values(template.findResources('AWS::BedrockAgentCore::Gateway'))[0].Properties;
    expect(props.AuthorizerType).toBe('AWS_IAM');
    expect(props.AuthorizerConfiguration).toBeUndefined();
  });

  test('deploys an inline interceptor function, wires it to the gateway, and grants scoped invoke', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      interceptors: [interceptor(['REQUEST'], 'req-interceptor')],
    });
    const template = Template.fromStack(testApp.testStack);

    // The inline interceptor function is deployed.
    template.resourceCountIs('AWS::Lambda::Function', 1);

    // The gateway's interceptor is wired to the deployed function's ARN (a GetAtt token, not a
    // literal string) with the default passRequestHeaders=false.
    const gateways = template.findResources('AWS::BedrockAgentCore::Gateway');
    const cfg = Object.values(gateways)[0].Properties.InterceptorConfigurations[0];
    expect(cfg.InterceptionPoints).toEqual(['REQUEST']);
    expect(cfg.InputConfiguration).toEqual({ PassRequestHeaders: false });
    expect(JSON.stringify(cfg.Interceptor.Lambda.Arn)).toContain('Fn::GetAtt');

    // The gateway role is granted scoped lambda:InvokeFunction.
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Action: 'lambda:InvokeFunction' })]),
      },
    });
  });

  test('wires a by-ref interceptor (lambdaArn) onto the gateway, deploys no function, and grants scoped invoke', () => {
    const interceptorArn = 'arn:test-partition:lambda:test-region:111111111111:function:already-deployed-interceptor';
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      interceptors: [{ interceptionPoints: ['REQUEST'], lambdaArn: interceptorArn }],
    });
    const template = Template.fromStack(testApp.testStack);

    // No interceptor function is deployed for a by-ref interceptor (the function is owned elsewhere).
    template.resourceCountIs('AWS::Lambda::Function', 0);

    // The gateway's interceptor is wired to the literal ARN (not a GetAtt token).
    const gateways = template.findResources('AWS::BedrockAgentCore::Gateway');
    const cfg = Object.values(gateways)[0].Properties.InterceptorConfigurations[0];
    expect(cfg.InterceptionPoints).toEqual(['REQUEST']);
    expect(cfg.Interceptor.Lambda.Arn).toEqual(interceptorArn);

    // The gateway role is granted scoped lambda:InvokeFunction on exactly that ARN.
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Action: 'lambda:InvokeFunction', Resource: interceptorArn })]),
      },
    });
  });

  test('handles a mixed interceptor set (one inline lambdaFunction + one by-ref lambdaArn) in a single gateway', () => {
    // Exercises both branches of buildInterceptorFunctions in one invocation: the inline REQUEST
    // interceptor is deployed via the shared LambdaFunctionL3Construct, while the by-ref RESPONSE
    // interceptor is wired to its literal ARN with no function deployed for it.
    const byRefArn = 'arn:test-partition:lambda:test-region:111111111111:function:already-deployed-interceptor';
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      interceptors: [
        interceptor(['REQUEST'], 'req-interceptor'),
        { interceptionPoints: ['RESPONSE'], lambdaArn: byRefArn },
      ],
    });
    const template = Template.fromStack(testApp.testStack);

    // Exactly one function is deployed — for the inline interceptor only (the by-ref one adds none).
    template.resourceCountIs('AWS::Lambda::Function', 1);

    // Each interceptor is wired to its own source: the inline one to a GetAtt token (the deployed
    // function), the by-ref one to the literal ARN.
    const gateway = Object.values(template.findResources('AWS::BedrockAgentCore::Gateway'))[0];
    const configs = gateway.Properties.InterceptorConfigurations as {
      InterceptionPoints: string[];
      Interceptor: { Lambda: { Arn: unknown } };
    }[];
    const requestCfg = configs.find(c => c.InterceptionPoints.includes('REQUEST'))!;
    const responseCfg = configs.find(c => c.InterceptionPoints.includes('RESPONSE'))!;
    expect(JSON.stringify(requestCfg.Interceptor.Lambda.Arn)).toContain('Fn::GetAtt');
    expect(responseCfg.Interceptor.Lambda.Arn).toEqual(byRefArn);

    // The gateway role's scoped invoke policy covers both interceptor ARNs (one consolidated
    // statement whose Resource array contains the by-ref ARN alongside the deployed function's ARN).
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'lambda:InvokeFunction',
            Resource: Match.arrayWith([byRefArn]),
          }),
        ]),
      },
    });
  });

  test('gateway DependsOn the interceptor-invoke managed policy', () => {
    // The gateway references the role/KMS/interceptor-fn ARNs (implicit ordering), but NOT the
    // interceptor-invoke managed policy (it references the role, not the gateway). Explicit
    // DependsOn ensures the role can invoke the interceptors before the gateway is created.
    // Mirrors the bedrock-builder KB->policy dependency.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      interceptors: [interceptor(['REQUEST'], 'req-interceptor')],
    });
    const resources = Template.fromStack(testApp.testStack).toJSON().Resources as Record<
      string,
      { Type: string; DependsOn?: string[] | string }
    >;
    const typeOf = (id: string) => resources[id]?.Type;
    const gateway = Object.values(resources).find(r => r.Type === 'AWS::BedrockAgentCore::Gateway')!;
    const deps = gateway.DependsOn ? (Array.isArray(gateway.DependsOn) ? gateway.DependsOn : [gateway.DependsOn]) : [];
    const dependedPolicyCount = deps.filter(d => typeOf(d) === 'AWS::IAM::ManagedPolicy').length;

    // Only the interceptor-invoke policy exists now (no logs policy), and the gateway depends on it.
    expect(dependedPolicyCount).toBe(1);
  });

  test('renders SEMANTIC search onto the gateway protocol configuration', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      protocolConfiguration: { searchType: 'SEMANTIC' },
    });
    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::Gateway', {
      ProtocolConfiguration: { Mcp: Match.objectLike({ SearchType: 'SEMANTIC' }) },
    });
  });

  test('renders exceptionLevel DEBUG onto the gateway', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      exceptionLevel: GatewayExceptionLevel.DEBUG,
    });
    const gateways = Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::Gateway');
    expect(Object.values(gateways)[0].Properties.ExceptionLevel).toBe('DEBUG');
  });

  test('passRequestHeaders: true renders as PassRequestHeaders true on the interceptor', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      interceptors: [interceptor(['REQUEST'], 'req-interceptor', true)],
    });
    const gateways = Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::Gateway');
    const cfg = Object.values(gateways)[0].Properties.InterceptorConfigurations[0];
    expect(cfg.InputConfiguration).toEqual({ PassRequestHeaders: true });
  });

  test('deploys both REQUEST and RESPONSE interceptor functions and wires them onto the gateway', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      interceptors: [interceptor(['REQUEST'], 'req-interceptor'), interceptor(['RESPONSE'], 'res-interceptor')],
    });
    const template = Template.fromStack(testApp.testStack);

    // Both interceptor functions are deployed.
    template.resourceCountIs('AWS::Lambda::Function', 2);

    // Both interceptors are wired onto the gateway.
    const gateways = template.findResources('AWS::BedrockAgentCore::Gateway');
    const cfgs = Object.values(gateways)[0].Properties.InterceptorConfigurations;
    expect(cfgs).toHaveLength(2);
    expect(cfgs.map((c: { InterceptionPoints: string[] }) => c.InterceptionPoints[0]).sort()).toEqual([
      'REQUEST',
      'RESPONSE',
    ]);
  });

  // An inline Lambda tool source for a gateway target.
  function lambdaTarget(lambdaArn: string) {
    return {
      targetConfiguration: {
        lambda: {
          lambdaArn,
          toolSchema: {
            inlinePayload: [{ name: 'tool', description: 'a tool', inputSchema: { type: 'object' } }],
          },
        },
      },
    };
  }

  test('iterates the targets map into one GatewayTarget per entry, each referencing the gateway', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: {
        weather: lambdaTarget('arn:test-partition:lambda:test-region:111111111111:function:weather'),
        catalog: lambdaTarget('arn:test-partition:lambda:test-region:111111111111:function:catalog'),
      },
    });
    const template = Template.fromStack(testApp.testStack);

    // One target per map entry.
    template.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 2);

    // A single consolidated invoke policy on the gateway role covers ALL target Lambda ARNs (one
    // policy regardless of target count, to stay under the IAM attached-managed-policy limit).
    const targetInvokePolicies = Object.values(template.findResources('AWS::IAM::ManagedPolicy')).filter(p =>
      JSON.stringify(p.Properties.PolicyDocument).includes('GatewayInvokeTargetLambdas'),
    );
    expect(targetInvokePolicies).toHaveLength(1);
    const invokeStatement = targetInvokePolicies[0].Properties.PolicyDocument.Statement.find(
      (s: { Sid?: string }) => s.Sid === 'GatewayInvokeTargetLambdas',
    );
    expect(invokeStatement.Action).toBe('lambda:InvokeFunction');
    expect(invokeStatement.Resource).toEqual(
      expect.arrayContaining([
        'arn:test-partition:lambda:test-region:111111111111:function:weather',
        'arn:test-partition:lambda:test-region:111111111111:function:catalog',
      ]),
    );

    // Each target depends on the gateway (no create-time race).
    const resources = template.toJSON().Resources as Record<string, { Type: string; DependsOn?: string[] | string }>;
    const typeOf = (id: string) => resources[id]?.Type;
    const targets = Object.values(resources).filter(r => r.Type === 'AWS::BedrockAgentCore::GatewayTarget');
    targets.forEach(t => {
      const deps = t.DependsOn ? (Array.isArray(t.DependsOn) ? t.DependsOn : [t.DependsOn]) : [];
      expect(deps.some(d => typeOf(d) === 'AWS::BedrockAgentCore::Gateway')).toBe(true);
      expect(deps.some(d => typeOf(d) === 'AWS::IAM::ManagedPolicy')).toBe(true);
    });
  });

  test('publishes per-target SSM parameters keyed by the map name', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: { weather: lambdaTarget('arn:test-partition:lambda:test-region:111111111111:function:weather') },
    });
    const params = Template.fromStack(testApp.testStack).findResources('AWS::SSM::Parameter');
    const names = Object.values(params).map(p => p.Properties.Name as string);
    ['arn', 'id'].forEach(suffix => {
      expect(names.some(n => n.endsWith(`/gateway-target/weather/${suffix}`))).toBe(true);
    });
  });

  test('no targets map produces no GatewayTarget resources or target invoke policy', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 0);
    const hasTargetInvoke = Object.values(template.findResources('AWS::IAM::ManagedPolicy')).some(p =>
      JSON.stringify(p.Properties.PolicyDocument).includes('GatewayInvokeTargetLambdas'),
    );
    expect(hasTargetInvoke).toBe(false);
  });

  test('grants target invoke to a referenced role', () => {
    // Regression: the consolidated target invoke policy must attach (via Roles:[role]) to a
    // referenced execution role, not only an auto-created one — mirrors the interceptor equivalent.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      role: { arn: 'arn:test-partition:iam::111111111111:role/existing-gateway-role' },
      targets: { weather: lambdaTarget('arn:test-partition:lambda:test-region:111111111111:function:weather') },
    });
    const template = Template.fromStack(testApp.testStack);
    const targetInvoke = Object.values(template.findResources('AWS::IAM::ManagedPolicy')).find(p =>
      JSON.stringify(p.Properties.PolicyDocument).includes('GatewayInvokeTargetLambdas'),
    )!;
    expect(targetInvoke.Properties.Roles).toEqual(['existing-gateway-role']);
  });

  test('the consolidated target invoke policy has no wildcard resource', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: { weather: lambdaTarget('arn:test-partition:lambda:test-region:111111111111:function:weather') },
    });
    const policies = Template.fromStack(testApp.testStack).findResources('AWS::IAM::ManagedPolicy');
    const policyJson = JSON.stringify(Object.values(policies));
    expect(policyJson).toContain('lambda:InvokeFunction');
    expect(policyJson).not.toContain('lambda:*');
    expect(policyJson).not.toContain(':function:*');
  });

  test('two targets sharing one Lambda ARN produce a single deduped invoke resource entry', () => {
    const sharedArn = 'arn:test-partition:lambda:test-region:111111111111:function:shared';
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: { alpha: lambdaTarget(sharedArn), beta: lambdaTarget(sharedArn) },
    });
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 2);
    const policy = Object.values(template.findResources('AWS::IAM::ManagedPolicy')).find(p =>
      JSON.stringify(p.Properties.PolicyDocument).includes('GatewayInvokeTargetLambdas'),
    )!;
    const stmt = policy.Properties.PolicyDocument.Statement.find(
      (s: { Sid?: string }) => s.Sid === 'GatewayInvokeTargetLambdas',
    );
    // Deduped to a single ARN (rendered as a bare string or a one-element array).
    expect(JSON.stringify(stmt.Resource)).toBe(JSON.stringify(sharedArn));
  });

  // An S3-backed tool source for a gateway target (with an optional explicit bucket owner).
  function s3Target(lambdaArn: string, bucketOwnerAccountId?: string) {
    return {
      targetConfiguration: {
        lambda: {
          lambdaArn,
          toolSchema: {
            s3: { uri: 's3://schemas/weather.json', ...(bucketOwnerAccountId && { bucketOwnerAccountId }) },
          },
        },
      },
    };
  }

  test('defaults an S3 tool-schema bucketOwnerAccountId to the deploying account (confused-deputy protection)', () => {
    // MEDIUM finding remediation: an S3 tool schema with no explicit owner is bound to the deploying
    // account by default, so the gateway verifies the bucket owner on the cross-account read.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: { weather: s3Target('arn:test-partition:lambda:test-region:111111111111:function:weather') },
    });
    const target = Object.values(
      Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::GatewayTarget'),
    )[0];
    // MdaaTestApp deploys into account 'test-account'.
    expect(target.Properties.TargetConfiguration.Mcp.Lambda.ToolSchema.S3).toEqual({
      Uri: 's3://schemas/weather.json',
      BucketOwnerAccountId: 'test-account',
    });
  });

  test('preserves an explicit S3 bucketOwnerAccountId (cross-account tool schema), never overwriting it', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: {
        weather: s3Target('arn:test-partition:lambda:test-region:111111111111:function:weather', '999988887777'),
      },
    });
    const target = Object.values(
      Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::GatewayTarget'),
    )[0];
    expect(target.Properties.TargetConfiguration.Mcp.Lambda.ToolSchema.S3.BucketOwnerAccountId).toBe('999988887777');
  });

  test('grants the gateway role no s3:GetObject for an S3 tool schema', () => {
    // Least-privilege: the gateway reads an S3 tool schema with the deploying (control-plane)
    // principal at CreateGatewayTarget, not the execution role — so no s3:GetObject grant is added
    // to the role. Mirrors the logs:CreateLogGroup negative assertion above; catches an accidental
    // future grant.
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
      ...baseProps(testApp, roleHelper),
      targets: { weather: s3Target('arn:test-partition:lambda:test-region:111111111111:function:weather') },
    });
    const allJson = JSON.stringify(Template.fromStack(testApp.testStack).toJSON());
    expect(allJson).not.toContain('s3:GetObject');
  });

  test('publishes SSM parameters for arn, id, url, role-arn, kms-key-arn', () => {
    new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
    const template = Template.fromStack(testApp.testStack);
    const params = template.findResources('AWS::SSM::Parameter');
    const names = Object.values(params).map(p => p.Properties.Name as string);
    ['arn', 'id', 'url', 'role-arn', 'kms-key-arn'].forEach(suffix => {
      expect(names.some(n => n.endsWith(`/${suffix}`))).toBe(true);
    });
  });

  describe('vended audit log delivery', () => {
    test('default gateway provisions a CMK-encrypted destination log group with indefinite retention', () => {
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
      expect(logGroup.Properties.LogGroupName as string).toMatch(
        /^\/aws\/vendedlogs\/bedrock-agentcore\/gateway\/APPLICATION_LOGS\/.+/,
      );
      // CMK-encrypted (KmsKeyId present) with the default indefinite retention — omitting
      // logRetentionDays sets no retention, so CDK emits no RetentionInDays (audit-by-default: never
      // drop logs).
      expect(logGroup.Properties.KmsKeyId).toBeDefined();
      expect(logGroup.Properties.RetentionInDays).toBeUndefined();
    });

    test('accepts the never-expire sentinel (9999), rendering no RetentionInDays', () => {
      // 9999 (RetentionDays.INFINITE) is an accepted, explicit never-expire choice: the CDK log group
      // renders it as no RetentionInDays — the same never-expire result as omitting logRetentionDays.
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
        ...baseProps(testApp, roleHelper),
        logDelivery: { logRetentionDays: RetentionDays.INFINITE },
      });
      const template = Template.fromStack(testApp.testStack);
      const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
      expect(logGroup.Properties.RetentionInDays).toBeUndefined();
    });

    test('default gateway builds the vended delivery pipeline (source -> destination -> delivery)', () => {
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
      const template = Template.fromStack(testApp.testStack);

      // Delivery source is bound to the gateway ARN with the APPLICATION_LOGS log type.
      template.resourceCountIs('AWS::Logs::DeliverySource', 1);
      const source = Object.values(template.findResources('AWS::Logs::DeliverySource'))[0];
      expect(source.Properties.LogType).toBe('APPLICATION_LOGS');
      const gatewayLogicalId = Object.keys(template.findResources('AWS::BedrockAgentCore::Gateway'))[0];
      expect(JSON.stringify(source.Properties.ResourceArn)).toContain(gatewayLogicalId);

      // Destination + delivery both present (one each).
      template.resourceCountIs('AWS::Logs::DeliveryDestination', 1);
      template.resourceCountIs('AWS::Logs::Delivery', 1);
    });

    test('adds no CloudWatch Logs / vended-delivery grants to the key (granting is the provisioner’s job)', () => {
      // The gateway is a pure key consumer: it builds the pipeline but adds no grants to the CMK.
      // The at-rest (logs.{region}) and vended-delivery (delivery.logs) grants are added by whoever
      // provisions the key. Guard that the gateway itself emits neither onto the key policy.
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
      const template = Template.fromStack(testApp.testStack);
      // Assert on the key-policy PRINCIPALS (mirrors the helper's own compliance test), not on SID
      // strings the construct never emits: a CDK-generated grant carries no SID, so only the service
      // principal reliably reveals an accidental at-rest (logs.{region}) or vended-delivery
      // (delivery.logs) grant on the key.
      const keyResource = Object.values(template.findResources('AWS::KMS::Key'))[0];
      const principals = JSON.stringify(
        (keyResource.Properties.KeyPolicy as { Statement: { Principal?: unknown }[] }).Statement.map(s => s.Principal),
      );
      expect(principals).not.toContain('logs.test-region.amazonaws.com');
      expect(principals).not.toContain('delivery.logs.amazonaws.com');
    });

    test('honors a custom logRetentionDays', () => {
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
        ...baseProps(testApp, roleHelper),
        logDelivery: { logRetentionDays: 90 },
      });
      const template = Template.fromStack(testApp.testStack);
      const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
      expect(logGroup.Properties.RetentionInDays).toBe(90);
    });

    test('logDelivery.enabled=false provisions no log group or delivery', () => {
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
        ...baseProps(testApp, roleHelper),
        logDelivery: { enabled: false },
      });
      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Logs::LogGroup', 0);
      template.resourceCountIs('AWS::Logs::DeliverySource', 0);
      template.resourceCountIs('AWS::Logs::DeliveryDestination', 0);
      template.resourceCountIs('AWS::Logs::Delivery', 0);
      // No delivery-related KMS grants either (nothing to scope them to). Assert on the key-policy
      // PRINCIPALS rather than a never-emitted SID: the caller's key (from baseProps) is the only key,
      // and with delivery disabled its policy must carry neither log-service principal.
      const keyResource = Object.values(template.findResources('AWS::KMS::Key'))[0];
      const principals = JSON.stringify(
        (keyResource.Properties.KeyPolicy as { Statement: { Principal?: unknown }[] }).Statement.map(s => s.Principal),
      );
      expect(principals).not.toContain('logs.test-region.amazonaws.com');
      expect(principals).not.toContain('delivery.logs.amazonaws.com');
    });

    test('destination log group is encrypted with the injected key', () => {
      // The log group's KmsKeyId resolves (Fn::GetAtt Arn) to the caller-provided key, and the full
      // delivery pipeline is wired against that same key.
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
      const template = Template.fromStack(testApp.testStack);

      const keyLogicalId = Object.keys(template.findResources('AWS::KMS::Key'))[0];
      const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
      expect(logGroup.Properties.KmsKeyId).toEqual({ 'Fn::GetAtt': [keyLogicalId, 'Arn'] });
      template.resourceCountIs('AWS::Logs::Delivery', 1);
    });

    test('delivery is ordered after the delivery source via an explicit DependsOn', () => {
      // CfnDelivery references the source by NAME (a string), not by resource, so CDK adds no implicit
      // ordering — the construct wires delivery.addDependency(deliverySource) explicitly. Pin that so
      // a regression dropping it (letting CloudFormation create the delivery before its source) is caught.
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', baseProps(testApp, roleHelper));
      const template = Template.fromStack(testApp.testStack);

      const sourceLogicalId = Object.keys(template.findResources('AWS::Logs::DeliverySource'))[0];
      const delivery = Object.values(template.findResources('AWS::Logs::Delivery'))[0];
      expect(delivery.DependsOn as string[]).toContain(sourceLogicalId);
    });

    test('accepts an imported (immutable) key: pipeline built against it, no key resource emitted', () => {
      // The gateway consumes whatever key it is given without mutating it, so an imported key works
      // exactly like a mutable one: the destination log group is encrypted with the imported ARN and
      // the full delivery pipeline is built. (Grants on the imported key are the provisioner's job.)
      const importedKeyArn = 'arn:aws:kms:test-region:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab';
      // Build props inline (not via baseProps, which would eagerly create a mutable key in the stack)
      // so the only key referenced is the imported one.
      new BedrockAgentcoreGatewayL3Construct(testApp.testStack, 'gw', {
        gatewayName: 'test-gateway',
        authorizerConfiguration: {
          customJwt: {
            discoveryUrl: 'https://example.com/.well-known/openid-configuration',
            allowedAudience: ['my-audience'],
          },
        },
        kmsKey: Key.fromKeyArn(testApp.testStack, 'ImportedGwKey', importedKeyArn),
        naming: testApp.naming,
        roleHelper,
      });
      const template = Template.fromStack(testApp.testStack);

      // No KMS key resource is created for an import.
      template.resourceCountIs('AWS::KMS::Key', 0);
      // The pipeline is fully built and the destination log group uses the imported key ARN.
      template.resourceCountIs('AWS::Logs::Delivery', 1);
      const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
      expect(logGroup.Properties.KmsKeyId).toBe(importedKeyArn);
    });
  });
});
