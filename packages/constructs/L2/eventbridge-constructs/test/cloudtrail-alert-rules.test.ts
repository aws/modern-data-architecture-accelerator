/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { CLOUDTRAIL_API_CALL_DETAIL_TYPE, CLOUDTRAIL_RESOURCES_ARN_FIELD, createCloudTrailAlertRules } from '../lib';

const SOURCES = ['aws.test-service'];
const EVENT_SOURCES = ['test-service.amazonaws.com'];
const RESOURCE_ARN = 'arn:test-partition:test-service:test-region:test-account:resource/my-resource-abc123';
const REMEDIATION_LAMBDA_ARN = 'arn:test-partition:lambda:test-region:test-account:function:remediation';

describe('createCloudTrailAlertRules', () => {
  let testApp: MdaaTestApp;
  let topic: ITopic;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    topic = new Topic(testApp.testStack, 'TestTopic', { masterKey: new Key(testApp.testStack, 'TestKey') });
  });

  const baseProps = () => ({
    resourceName: 'my-resource',
    naming: testApp.naming,
    sources: SOURCES,
    eventSources: EVENT_SOURCES,
    notificationTopic: topic,
    resourceArns: [RESOURCE_ARN],
    alertSubject: 'Test service security event',
  });

  describe('event pattern', () => {
    // Every structural field of the pattern comes from the caller and is pinned here.
    // A wrong source or detail-type is silent: the rule deploys cleanly, matches
    // nothing, and reads as covered.
    test('applies the caller-supplied source, detail-type, and eventSource', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      expect(CLOUDTRAIL_API_CALL_DETAIL_TYPE).toEqual('AWS API Call via CloudTrail');

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        State: 'ENABLED',
        EventPattern: Match.objectLike({
          source: SOURCES,
          'detail-type': ['AWS API Call via CloudTrail'],
          detail: Match.objectLike({
            eventSource: EVENT_SOURCES,
            errorCode: ['AccessDenied'],
          }),
        }),
      });
    });

    // The requestParameters field carrying a resource's identity differs per API, and
    // a pattern naming a field the event lacks does not match at all - so every
    // identity form is OR'd rather than picking one.
    test('scopes rules by every identity form, combined with $or', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        resourceRequestParameters: { resourceId: 'my-resource-abc123', resourceArn: RESOURCE_ARN },
        rules: { 'config-change': { eventNames: ['UpdateResource', 'DeleteResource'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          detail: Match.objectLike({
            eventName: ['UpdateResource', 'DeleteResource'],
            $or: [
              { requestParameters: { resourceId: ['my-resource-abc123'] } },
              { requestParameters: { resourceArn: [RESOURCE_ARN] } },
              { resources: { ARN: [RESOURCE_ARN] } },
            ],
          }),
        }),
      });
    });

    // detail.resources[].ARN is the only identity on events whose requestParameters is
    // null (e.g. AgentCore's InvokeAgentRuntime). Scoping that omits it yields a rule
    // that deploys cleanly and never fires on those APIs.
    test('scopes on detail.resources.ARN, accepting every ARN form supplied', () => {
      const endpointArn = `${RESOURCE_ARN}/endpoint/DEFAULT`;
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        resourceArns: [RESOURCE_ARN, endpointArn],
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      expect(CLOUDTRAIL_RESOURCES_ARN_FIELD).toEqual('resources');
      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          detail: Match.objectLike({
            $or: Match.arrayWith([{ resources: { ARN: [RESOURCE_ARN, endpointArn] } }]),
          }),
        }),
      });
    });

    // A requestParameters-only caller must not get an empty `{ resources: { ARN: [] } }`
    // branch in the $or: an empty value list matches nothing, so the branch would be
    // dead weight in the pattern.
    test('omits the resources.ARN branch when no resourceArns are supplied', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        resourceArns: undefined,
        resourceRequestParameters: { resourceId: 'my-resource-abc123' },
        rules: { 'config-change': { eventNames: ['UpdateResource'] } },
      });

      const rules = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Events::Rule'));
      expect(rules[0].Properties.EventPattern.detail.$or).toEqual([
        { requestParameters: { resourceId: ['my-resource-abc123'] } },
      ]);
    });

    // errorCodes are CloudTrail `errorCode` values, NOT SDK exception names: an IAM
    // denial returns AccessDeniedException to the caller but CloudTrail records plain
    // AccessDenied. Pinned so a future "normalisation" cannot silently rewrite a
    // configured value.
    test('passes CloudTrail errorCode values through verbatim', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied', 'AccessDeniedException'] } },
      });

      const rules = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Events::Rule'));
      expect(rules).toHaveLength(1);
      expect(rules[0].Properties.EventPattern.detail.errorCode).toEqual(['AccessDenied', 'AccessDeniedException']);
    });

    test('omits errorCode when only eventNames are configured, and vice versa', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: {
          'names-only': { eventNames: ['UpdateResource'] },
          'codes-only': { errorCodes: ['AccessDenied'] },
        },
      });

      const rules = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Events::Rule'));
      const namesOnly = rules.find(r => r.Properties.EventPattern.detail.eventName);
      const codesOnly = rules.find(r => r.Properties.EventPattern.detail.errorCode);

      expect(namesOnly?.Properties.EventPattern.detail.errorCode).toBeUndefined();
      expect(codesOnly?.Properties.EventPattern.detail.eventName).toBeUndefined();
    });

    // Supplying both ANDs them: only calls to those APIs that failed with those codes.
    test('sets both errorCode and eventName when both are configured', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { both: { errorCodes: ['AccessDenied'], eventNames: ['InvokeResource'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: Match.objectLike({
          detail: Match.objectLike({
            errorCode: ['AccessDenied'],
            eventName: ['InvokeResource'],
          }),
        }),
      });
    });
  });

  describe('rules map', () => {
    test('creates one rule per map entry, keyed by name', () => {
      const result = createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: {
          'auth-failure': { errorCodes: ['AccessDenied'] },
          'config-change': { eventNames: ['UpdateResource'] },
        },
      });

      expect(Object.keys(result.rules).sort()).toEqual(['auth-failure', 'config-change']);
      Template.fromStack(testApp.testStack).resourceCountIs('AWS::Events::Rule', 2);
    });

    // Rule names must stay distinct and within EventBridge's 64-char limit. MDAA's
    // naming prefix consumes most of that budget and truncates the tail with a
    // uniqueness hash, so this asserts distinctness rather than a literal substring:
    // two rules colliding on one name would silently overwrite each other.
    test('gives each rule a distinct name within the EventBridge length limit', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: {
          'auth-failure': { errorCodes: ['AccessDenied'] },
          'config-change': { eventNames: ['UpdateResource'] },
        },
      });

      const names = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Events::Rule')).map(
        r => r.Properties.Name as string,
      );

      expect(names).toHaveLength(2);
      expect(new Set(names).size).toEqual(2);
      names.forEach(name => expect(name.length).toBeLessThanOrEqual(64));
    });

    // When `org-env-domain-module` alone fills the 64-char limit, MDAA truncates from
    // the right and the entire suffix becomes the uniqueness hash, so the rule key does
    // NOT appear in the name. Pinned so the ordering of the qualified name is not
    // mistaken for a guarantee: names stay unique, but only the description reliably
    // identifies a rule.
    test('drops the rule key from the name when the naming prefix fills the limit', () => {
      const longApp = new MdaaTestApp({ moduleName: 'test-bedrock-agentcore-runtime-main' });
      createCloudTrailAlertRules(longApp.testStack, 'Alerts', {
        ...baseProps(),
        naming: longApp.naming,
        notificationTopic: new Topic(longApp.testStack, 'LongTopic'),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const rules = Object.values(Template.fromStack(longApp.testStack).findResources('AWS::Events::Rule'));
      expect(rules[0].Properties.Name).not.toContain('auth-failure');
      // The description remains the reliable way to tell rules apart.
      expect(rules[0].Properties.Description).toContain('auth-failure');
    });

    // With a shorter prefix there is room, and leading with the key keeps it legible.
    // This is what the ordering buys - it is not something operators can rely on.
    test('keeps the leading rule key when the naming prefix leaves room', () => {
      const shortApp = new MdaaTestApp({ org: 'o', env: 'e', domain: 'd', moduleName: 'm' });
      createCloudTrailAlertRules(shortApp.testStack, 'Alerts', {
        ...baseProps(),
        resourceName: 'rt',
        naming: shortApp.naming,
        notificationTopic: new Topic(shortApp.testStack, 'ShortTopic'),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const rules = Object.values(Template.fromStack(shortApp.testStack).findResources('AWS::Events::Rule'));
      expect(rules).toHaveLength(1);
      expect(rules[0].Properties.Name).toContain('auth-failure');
    });

    test('uses the configured description', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { description: 'Denied invocations', errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: 'Denied invocations',
      });
    });

    // The default description carries the alert subject so an operator can tell which
    // subsystem a rule belongs to without opening the event pattern.
    test('defaults the description to the alert subject, rule key, and resource', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: "Test service security event rule 'auth-failure' for my-resource",
      });
    });
  });

  describe('targets', () => {
    test('targets the notification topic with a transformed message', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: Match.anyValue(),
            InputTransformer: Match.objectLike({
              // The readable message pulls principal, error code, and source IP out
              // of the CloudTrail event rather than dumping the raw payload.
              InputPathsMap: Match.objectLike({
                'detail-errorCode': '$.detail.errorCode',
                'detail-userIdentity-arn': '$.detail.userIdentity.arn',
                'detail-sourceIPAddress': '$.detail.sourceIPAddress',
              }),
              InputTemplate: Match.stringLikeRegexp('Test service security event'),
            }),
          }),
        ]),
      });
    });

    // No Lambda is created for notification - SNS delivers to Slack/PagerDuty via
    // subscription. A Lambda target appears only when the customer supplies one.
    test('creates no Lambda resources when targetLambdaArn is omitted', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Lambda::Function', 0);
      template.resourceCountIs('AWS::Lambda::Permission', 0);
      // Exactly one target: the SNS topic.
      const rule = Object.values(template.findResources('AWS::Events::Rule'))[0];
      expect(rule.Properties.Targets).toHaveLength(1);
    });

    // Without sameEnvironment: true on the imported function, CDK silently skips the
    // resource-based permission and EventBridge can never invoke the target.
    test('adds the customer Lambda as a second target with invoke permission', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: {
          'auth-failure': { errorCodes: ['AccessDenied'], targetLambdaArn: REMEDIATION_LAMBDA_ARN },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      // This helper does not create the function; it only references and permissions it.
      template.resourceCountIs('AWS::Lambda::Function', 0);
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        FunctionName: REMEDIATION_LAMBDA_ARN,
        Principal: 'events.amazonaws.com',
      });

      const rule = Object.values(template.findResources('AWS::Events::Rule'))[0];
      expect(rule.Properties.Targets).toHaveLength(2);
      expect(rule.Properties.Targets.map((t: { Arn: unknown }) => t.Arn)).toContain(REMEDIATION_LAMBDA_ARN);
    });

    // Delivery is authorized by a per-rule IAM role, not by a service-principal grant
    // on the topic policy. The role's identity policy is scoped to this topic, so there
    // is no statement authorizing every EventBridge rule in the account to publish.
    test('grants publish via a scoped delivery role, not a topic-policy grant', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({ Effect: 'Allow', Action: 'sns:Publish', Resource: Match.anyValue() }),
          ]),
        }),
      });
      // The rule passes the role to EventBridge rather than relying on the service
      // principal; without RoleArn the target would fall back to the wide grant.
      const rule = Object.values(template.findResources('AWS::Events::Rule'))[0];
      expect(rule.Properties.Targets[0].RoleArn).toBeDefined();
    });

    // REGRESSION GUARD: CDK's default (authorizeUsingRole omitted) adds an
    // unconditioned sns:Publish for events.amazonaws.com to the topic policy, which
    // authorizes ANY EventBridge rule in the account - a confused-deputy surface. It
    // cannot be narrowed after the fact: grantPublish deduplicates, so adding a second
    // conditioned grant leaves the wide statement in place. Assert no such statement
    // exists at all.
    test('adds no unconditioned events.amazonaws.com grant to the topic policy', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const wideGrants = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::SNS::TopicPolicy'))
        .flatMap(p => p.Properties.PolicyDocument.Statement as { Principal?: { Service?: string } }[])
        .filter(s => s.Principal?.Service === 'events.amazonaws.com');

      expect(wideGrants).toHaveLength(0);
    });

    // The topic is CMK-encrypted, so publish access alone is not enough: without
    // kms:GenerateDataKey* the publish fails at runtime and the notification is
    // silently lost even though the rule matched. Granted on the delivery role's
    // identity policy and scoped to the key ARN, which also sidesteps the AWS
    // restriction on conditioning a KMS resource-policy grant for this path.
    test('grants the delivery role use of the topic CMK, scoped to the key', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith(['kms:GenerateDataKey*']),
              Resource: Match.anyValue(),
            }),
          ]),
        }),
      });
    });

    // The key's RESOURCE policy gains no events.amazonaws.com statement at all now.
    // That matters because AWS does not support aws:SourceAccount/SourceArn/SourceOrgID
    // in a KMS resource policy for EventBridge-to-encrypted-topic delivery, so such a
    // statement could never be scoped - it would have to stay wide. Routing the grant
    // onto the delivery role's identity policy avoids the restriction rather than
    // colliding with it. Pinned so a change back to the service-principal grant fails
    // here and has to read this reason.
    test('adds no events.amazonaws.com statement to the KMS key resource policy', () => {
      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const eventsGrants = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::KMS::Key'))
        .flatMap(k => k.Properties.KeyPolicy.Statement as { Principal?: { Service?: string } }[])
        .filter(s => s.Principal?.Service === 'events.amazonaws.com');

      expect(eventsGrants).toHaveLength(0);
    });

    test('targets an existing topic referenced by ARN', () => {
      const importedTopic = Topic.fromTopicArn(
        testApp.testStack,
        'ImportedTopic',
        'arn:test-partition:sns:test-region:test-account:existing-alerts',
      );

      createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
        ...baseProps(),
        notificationTopic: importedTopic,
        rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({ Arn: 'arn:test-partition:sns:test-region:test-account:existing-alerts' }),
        ]),
      });
    });
  });

  describe('validation', () => {
    test('throws when the rules map is empty', () => {
      expect(() => createCloudTrailAlertRules(testApp.testStack, 'Alerts', { ...baseProps(), rules: {} })).toThrow(
        /at least one rule/,
      );
    });

    // The configured path appears in the message so a config-driven caller can point
    // the user at the key they actually set.
    test('names the caller-supplied config path in validation messages', () => {
      expect(() =>
        createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
          ...baseProps(),
          rulesConfigPath: 'eventBridgeAlerts.rules',
          rules: { empty: {} },
        }),
      ).toThrow(/eventBridgeAlerts\.rules\.empty must set errorCodes/);
    });

    // A rule with neither field would match every API call for the resource - alert
    // fatigue rather than signal.
    test('throws when a rule sets neither errorCodes nor eventNames', () => {
      expect(() =>
        createCloudTrailAlertRules(testApp.testStack, 'Alerts', { ...baseProps(), rules: { empty: {} } }),
      ).toThrow(/must set errorCodes and\/or eventNames/);
    });

    test('throws when a rule supplies only empty arrays', () => {
      expect(() =>
        createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
          ...baseProps(),
          rules: { empty: { errorCodes: [], eventNames: [] } },
        }),
      ).toThrow(/must set errorCodes and\/or eventNames/);
    });

    // Unscoped rules would fire on every resource of the service in the account. Both
    // the empty-collection and the omitted-entirely forms are rejected, since both
    // props are optional and a caller can reach this state by simply not passing them.
    test.each([
      ['empty', { resourceRequestParameters: {}, resourceArns: [] }],
      ['omitted', { resourceRequestParameters: undefined, resourceArns: undefined }],
    ])('throws when resource scoping is %s', (_name, override) => {
      expect(() =>
        createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
          ...baseProps(),
          ...override,
          rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
        }),
      ).toThrow(/must contain at least one entry/);
    });

    // A rule with no source would match CloudTrail events from every service in the
    // account, which is alert fatigue rather than signal.
    test.each([
      ['sources', { sources: [] }],
      ['eventSources', { eventSources: [] }],
    ])('throws when %s is empty', (_name, override) => {
      expect(() =>
        createCloudTrailAlertRules(testApp.testStack, 'Alerts', {
          ...baseProps(),
          ...override,
          rules: { 'auth-failure': { errorCodes: ['AccessDenied'] } },
        }),
      ).toThrow(/sources and eventSources must each contain at least one value/);
    });
  });
});
