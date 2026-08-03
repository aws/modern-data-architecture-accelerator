/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import {
  AGENTCORE_CLOUDTRAIL_EVENT_SOURCES,
  AGENTCORE_CLOUDTRAIL_SOURCES,
  AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER,
  AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER,
  createAgentCoreEventBridgeRules,
} from '../lib';

const RUNTIME_ID = 'my-runtime-abc123';
const RUNTIME_ARN = 'arn:aws:bedrock-agentcore:test-region:test-account:runtime/my-runtime-abc123';
const REMEDIATION_LAMBDA_ARN = 'arn:aws:lambda:test-region:test-account:function:agentcore-remediation';

const RESOURCE_ARNS = [RUNTIME_ARN];

const RESOURCE_PARAMETERS = {
  [AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER]: RUNTIME_ID,
  [AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER]: RUNTIME_ARN,
};

// The generic rule wiring - pattern assembly, rule naming and truncation, SNS/Lambda
// targets, the unconditioned EventBridge KMS grant, and the per-rule
// errorCodes/eventNames validation - lives in createCloudTrailAlertRules and is
// covered by cloudtrail-alert-rules.test.ts in @aws-mdaa/eventbridge-constructs. What
// is asserted here is only what this adapter contributes: the AgentCore CloudTrail
// sources, the AgentCore notification subject, and the stricter resourceArns guard.
describe('createAgentCoreEventBridgeRules', () => {
  let testApp: MdaaTestApp;
  let topic: ITopic;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    topic = new MdaaSnsTopic(testApp.testStack, 'TestTopic', {
      topicName: 'test-alerts',
      masterKey: new MdaaKmsKey(testApp.testStack, 'TestKey', {
        alias: 'test-alert-key',
        naming: testApp.naming,
      }),
      naming: testApp.naming,
    });
  });

  describe('AgentCore CloudTrail sources', () => {
    // A wrong source or eventSource is silent: the rule deploys cleanly, matches
    // nothing, and reads as covered. Pinned as deployed, not just as constants.
    test('applies the AgentCore sources and CloudTrail detail-type', () => {
      createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        notificationTopic: topic,
        resourceRequestParameters: RESOURCE_PARAMETERS,
        resourceArns: RESOURCE_ARNS,
        rules: {
          'auth-failure': { errorCodes: ['AccessDeniedException'] },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        State: 'ENABLED',
        EventPattern: Match.objectLike({
          source: AGENTCORE_CLOUDTRAIL_SOURCES,
          'detail-type': ['AWS API Call via CloudTrail'],
          detail: Match.objectLike({
            eventSource: AGENTCORE_CLOUDTRAIL_EVENT_SOURCES,
            errorCode: ['AccessDeniedException'],
          }),
        }),
      });
    });

    // AgentCore is served by two endpoints, but CloudTrail records BOTH planes under
    // the single source `bedrock-agentcore.amazonaws.com` - verified against delivered
    // CloudTrail logs, where CreateAgentRuntime (control plane) and InvokeAgentRuntime
    // (data plane) both carry that value. The `-control` variant is retained as a
    // forward-compatible fallback should the service ever split them; an EventBridge
    // list is an OR, so a value that never appears cannot narrow matching.
    test('matches the AgentCore CloudTrail source, with a -control fallback', () => {
      expect(AGENTCORE_CLOUDTRAIL_EVENT_SOURCES).toEqual([
        'bedrock-agentcore.amazonaws.com',
        'bedrock-agentcore-control.amazonaws.com',
      ]);
      expect(AGENTCORE_CLOUDTRAIL_SOURCES).toEqual(['aws.bedrock-agentcore', 'aws.bedrock-agentcore-control']);
    });

    // The notification subject and default rule description identify AgentCore alerts
    // at a glance in an inbox holding alerts from several subsystems.
    test('labels notifications and descriptions as AgentCore security events', () => {
      createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        notificationTopic: topic,
        resourceRequestParameters: RESOURCE_PARAMETERS,
        resourceArns: RESOURCE_ARNS,
        rules: { 'auth-failure': { errorCodes: ['AccessDeniedException'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: "AgentCore security event rule 'auth-failure' for my-runtime",
        Targets: Match.arrayWith([
          Match.objectLike({
            InputTransformer: Match.objectLike({
              InputTemplate: Match.stringLikeRegexp('AgentCore security event'),
            }),
          }),
        ]),
      });
    });
  });

  describe('resource scoping', () => {
    // The requestParameters field carrying a runtime's identity differs per API:
    // the lifecycle APIs take agentRuntimeId, invocation takes the ARN. A pattern
    // naming a field the event lacks does not match at all, so both are $or'd.
    test('scopes rules to the resource by every identity field, combined with $or', () => {
      createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        notificationTopic: topic,
        resourceRequestParameters: RESOURCE_PARAMETERS,
        resourceArns: RESOURCE_ARNS,
        rules: {
          'config-change': { eventNames: ['UpdateAgentRuntime', 'DeleteAgentRuntime'] },
        },
      });

      expect(AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER).toEqual('agentRuntimeId');
      expect(AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER).toEqual('agentRuntimeArn');

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          detail: Match.objectLike({
            eventName: ['UpdateAgentRuntime', 'DeleteAgentRuntime'],
            // All three identity forms. The resources.ARN branch is the one that
            // makes invoke events match at all - see the regression test below.
            $or: [
              { requestParameters: { agentRuntimeId: [RUNTIME_ID] } },
              { requestParameters: { agentRuntimeArn: [RUNTIME_ARN] } },
              { resources: { ARN: RESOURCE_ARNS } },
            ],
          }),
        }),
      });
    });

    // REGRESSION: this scoping shipped broken. The original version matched only
    // detail.requestParameters.{agentRuntimeId,agentRuntimeArn}, but CloudTrail
    // records `requestParameters: null` on InvokeAgentRuntime and identifies the
    // runtime solely via detail.resources[].ARN - verified against delivered
    // CloudTrail logs from a live deployment, and confirmed with
    // events:TestEventPattern (the old pattern returned false on the real event, the
    // fixed one returns true). The auth-failure rule therefore never fired: it
    // deployed cleanly and matched nothing, the exact failure this module guards
    // against. detail.resources.ARN must stay in the $or.
    test('scopes on detail.resources.ARN, which is the only identity on invoke events', () => {
      createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        notificationTopic: topic,
        resourceRequestParameters: RESOURCE_PARAMETERS,
        resourceArns: [RUNTIME_ARN, `${RUNTIME_ARN}/runtime-endpoint/DEFAULT`],
        rules: { 'auth-failure': { errorCodes: ['AccessDeniedException'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          detail: Match.objectLike({
            $or: Match.arrayWith([{ resources: { ARN: [RUNTIME_ARN, `${RUNTIME_ARN}/runtime-endpoint/DEFAULT`] } }]),
          }),
        }),
      });
    });

    // resourceArns is not optional for AgentCore, though the generic L2 builder accepts
    // requestParameters-only scoping: InvokeAgentRuntime carries a null
    // requestParameters (the confirmed case, verified against delivered CloudTrail
    // logs), so requestParameters-only scoping yields a rule that never matches an
    // invocation. Rejected at synth rather than deployed dormant. This guard is the
    // reason the adapter validates before delegating.
    test('throws when resourceArns is empty even if requestParameters are supplied', () => {
      expect(() =>
        createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          notificationTopic: topic,
          resourceRequestParameters: RESOURCE_PARAMETERS,
          resourceArns: [],
          rules: { 'auth-failure': { errorCodes: ['AccessDeniedException'] } },
        }),
      ).toThrow(/resourceArns must contain at least one ARN/);
    });
  });

  // Delegation is asserted through behaviour rather than by spying: the generic
  // builder's validation messages must reach the user with the AgentCore config path
  // substituted, or a misconfiguration would name a key the user never set.
  describe('delegation to the generic builder', () => {
    test('reports rule validation against the eventBridgeAlerts config path', () => {
      expect(() =>
        createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          notificationTopic: topic,
          resourceRequestParameters: RESOURCE_PARAMETERS,
          resourceArns: RESOURCE_ARNS,
          rules: { empty: {} },
        }),
      ).toThrow(/eventBridgeAlerts\.rules\.empty must set errorCodes and\/or eventNames/);
    });

    test('reports an empty rules map against the eventBridgeAlerts config path', () => {
      expect(() =>
        createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
          resourceName: 'my-runtime',
          naming: testApp.naming,
          notificationTopic: topic,
          resourceRequestParameters: RESOURCE_PARAMETERS,
          resourceArns: RESOURCE_ARNS,
          rules: {},
        }),
      ).toThrow(/eventBridgeAlerts\.rules must define at least one rule/);
    });

    // The customer remediation Lambda and the SNS target are wired by the generic
    // builder; asserted once here so the adapter's pass-through of per-rule config is
    // covered end-to-end from an AgentCore call site.
    test('passes per-rule targets through to the created rules', () => {
      const result = createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        notificationTopic: topic,
        resourceRequestParameters: RESOURCE_PARAMETERS,
        resourceArns: RESOURCE_ARNS,
        rules: {
          'auth-failure': { errorCodes: ['AccessDeniedException'] },
          'config-change': { eventNames: ['UpdateAgentRuntime'], targetLambdaArn: REMEDIATION_LAMBDA_ARN },
        },
      });

      expect(Object.keys(result.rules).sort()).toEqual(['auth-failure', 'config-change']);

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Events::Rule', 2);
      template.hasResourceProperties('AWS::Lambda::Permission', {
        FunctionName: REMEDIATION_LAMBDA_ARN,
        Principal: 'events.amazonaws.com',
      });
    });
  });

  // Service-agnostic within AgentCore by construction: the caller supplies the
  // resource identity fields and event names, so Gateway/Memory reuse the same helper.
  describe('service agnosticism', () => {
    test('scopes to an arbitrary AgentCore service resource identity', () => {
      const gatewayArn = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gateway-def456';
      createAgentCoreEventBridgeRules(testApp.testStack, 'GatewayAlerts', {
        resourceName: 'my-gateway',
        naming: testApp.naming,
        notificationTopic: topic,
        resourceRequestParameters: { gatewayIdentifier: gatewayArn },
        resourceArns: [gatewayArn],
        rules: { 'config-change': { eventNames: ['UpdateGateway', 'DeleteGateway'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          detail: Match.objectLike({
            eventName: ['UpdateGateway', 'DeleteGateway'],
            $or: [{ requestParameters: { gatewayIdentifier: [gatewayArn] } }, { resources: { ARN: [gatewayArn] } }],
          }),
        }),
      });
    });
  });

  describe('imported topic', () => {
    test('targets an existing topic referenced by ARN', () => {
      const importedTopic = Topic.fromTopicArn(
        testApp.testStack,
        'ImportedTopic',
        'arn:aws:sns:test-region:test-account:existing-alerts',
      );

      createAgentCoreEventBridgeRules(testApp.testStack, 'Alerts', {
        resourceName: 'my-runtime',
        naming: testApp.naming,
        notificationTopic: importedTopic,
        resourceRequestParameters: RESOURCE_PARAMETERS,
        resourceArns: RESOURCE_ARNS,
        rules: { 'auth-failure': { errorCodes: ['AccessDeniedException'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([Match.objectLike({ Arn: 'arn:aws:sns:test-region:test-account:existing-alerts' })]),
      });
    });
  });
});
