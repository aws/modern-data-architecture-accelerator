/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BedrockAgentcoreRuntimeL3Construct,
  BedrockAgentcoreRuntimeL3ConstructProps,
  CONTAINMENT_TAG_KEY,
  MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY,
  resolveManagedPoliciesPerRoleQuota,
  RuntimeContainment,
  validateManagedPolicyHeadroom,
} from '../lib';

type Resource = { Properties: Record<string, unknown> };
type Step = { name: string; action: string; [key: string]: unknown };
type Statement = { Sid?: string; Effect: string; [key: string]: unknown };

const EXISTING_ROLE_ARN = 'arn:aws:iam::123456789012:role/service/existing-agent-role';

function baseProps(testApp: MdaaTestApp): BedrockAgentcoreRuntimeL3ConstructProps {
  return {
    agentRuntimeName: 'contain-runtime',
    agentRuntimeArtifact: {
      containerConfiguration: { containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest' },
    },
    networkConfiguration: { securityGroups: ['sg-12345678'], subnets: ['subnet-12345678'] },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
  };
}

function synth(
  props: Partial<BedrockAgentcoreRuntimeL3ConstructProps> = {},
  context: { [key: string]: string } = {},
): { template: Template; testApp: MdaaTestApp; construct: BedrockAgentcoreRuntimeL3Construct } {
  const testApp = new MdaaTestApp(context);
  const construct = new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'runtime', {
    ...baseProps(testApp),
    ...props,
  });
  return { template: Template.fromStack(testApp.testStack), testApp, construct };
}

function resourcesOfType(template: Template, type: string): [string, Resource][] {
  return Object.entries(template.findResources(type)) as [string, Resource][];
}

function logicalId(template: Template, type: string, idFragment: string): string {
  const match = resourcesOfType(template, type).find(([id]) => id.includes(idFragment));
  if (!match) {
    throw new Error(`No ${type} with logical ID containing ${idFragment}`);
  }
  return match[0];
}

function properties(template: Template, type: string, idFragment: string): Record<string, unknown> {
  return template.findResources(type)[logicalId(template, type, idFragment)].Properties;
}

function statements(template: Template, idFragment: string): Statement[] {
  const document = properties(template, 'AWS::IAM::ManagedPolicy', idFragment).PolicyDocument as {
    Statement: Statement[];
  };
  return document.Statement;
}

function statement(template: Template, idFragment: string, sid: string): Statement {
  const found = statements(template, idFragment).find(s => s.Sid === sid);
  if (!found) {
    throw new Error(`No statement ${sid} in ${idFragment}`);
  }
  return found;
}

type RunbookContent = {
  description: unknown;
  parameters: Record<string, Record<string, unknown>>;
  mainSteps: Step[];
  outputs: string[];
};

function runbook(template: Template, idFragment: string): RunbookContent {
  return properties(template, 'AWS::SSM::Document', idFragment).Content as RunbookContent;
}

function step(content: RunbookContent, name: string): Step {
  const found = content.mainSteps.find(s => s.name === name);
  if (!found) {
    throw new Error(`No step ${name}`);
  }
  return found;
}

function script(fileName: string): string {
  return readFileSync(join(__dirname, '..', 'src', 'automation', 'containment', fileName), 'utf-8');
}

function attachedPolicyRefs(template: Template): string[] {
  const roles = resourcesOfType(template, 'AWS::IAM::Role');
  return roles.flatMap(([, role]) =>
    ((role.Properties.ManagedPolicyArns as { Ref?: string }[] | undefined) ?? []).map(arn => arn.Ref ?? ''),
  );
}

describe('Runtime containment', () => {
  describe('Default runtime', () => {
    let template: Template;
    let construct: BedrockAgentcoreRuntimeL3Construct;
    let containmentPolicyId: string;
    let containRoleId: string;
    let releaseRoleId: string;
    let executionRoleId: string;

    beforeAll(() => {
      ({ template, construct } = synth());
      containmentPolicyId = logicalId(template, 'AWS::IAM::ManagedPolicy', 'ContainmentContainmentPolicy');
      containRoleId = logicalId(template, 'AWS::IAM::Role', 'ContainmentContainAutomationRole');
      releaseRoleId = logicalId(template, 'AWS::IAM::Role', 'ContainmentReleaseAutomationRole');
      executionRoleId = logicalId(template, 'AWS::IAM::Role', 'RuntimeRole');
    });

    test('exposes the containment resources on the construct', () => {
      expect(construct.containment).toBeInstanceOf(RuntimeContainment);
    });

    test('creates the containment policy unattached', () => {
      const policy = properties(template, 'AWS::IAM::ManagedPolicy', 'ContainmentContainmentPolicy');
      expect(policy.Roles).toBeUndefined();
      expect(policy.Users).toBeUndefined();
      expect(policy.Groups).toBeUndefined();
      expect(attachedPolicyRefs(template)).not.toContain(containmentPolicyId);
    });

    test('denies everything except log writes, and log writes outside the runtime log groups', () => {
      const policyStatements = statements(template, 'ContainmentContainmentPolicy');
      expect(policyStatements).toHaveLength(2);
      expect(policyStatements.every(s => s.Effect === 'Deny')).toBe(true);
      expect(statement(template, 'ContainmentContainmentPolicy', 'DenyAllExceptLogWrites')).toMatchObject({
        NotAction: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: '*',
      });
      const logWrites = statement(template, 'ContainmentContainmentPolicy', 'DenyLogWritesOutsideOwnLogGroups');
      expect(logWrites.Action).toEqual(['logs:CreateLogStream', 'logs:PutLogEvents']);
      const runtimeId = logicalId(template, 'AWS::BedrockAgentCore::Runtime', 'Runtime');
      expect(logWrites.NotResource).toEqual({
        'Fn::Join': [
          '',
          [
            'arn:test-partition:logs:test-region:test-account:log-group:/aws/bedrock-agentcore/runtimes/',
            { 'Fn::GetAtt': [runtimeId, 'AgentRuntimeId'] },
            '-*',
          ],
        ],
      });
    });

    test('trusts only Systems Manager Automation executions in this account, for both automation roles', () => {
      for (const roleId of [containRoleId, releaseRoleId]) {
        expect(template.findResources('AWS::IAM::Role')[roleId].Properties).toMatchObject({
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Action: 'sts:AssumeRole',
                Effect: 'Allow',
                Principal: { Service: 'ssm.amazonaws.com' },
                Condition: {
                  StringEquals: { 'aws:SourceAccount': 'test-account' },
                  ArnLike: {
                    'aws:SourceArn': 'arn:test-partition:ssm:test-region:test-account:automation-execution/*',
                  },
                },
              },
            ],
          },
        });
      }
    });

    test('lets the contain role only attach the containment policy, tag the role and stop sessions', () => {
      expect(statements(template, 'ContainmentContainAutomationPolicy').map(s => s.Sid)).toEqual([
        'AttachContainmentPolicyOnly',
        'TagContainmentTimeOnly',
        'StopRuntimeSessions',
      ]);
      expect(statement(template, 'ContainmentContainAutomationPolicy', 'AttachContainmentPolicyOnly')).toEqual({
        Sid: 'AttachContainmentPolicyOnly',
        Effect: 'Allow',
        Action: 'iam:AttachRolePolicy',
        Resource: { 'Fn::GetAtt': [executionRoleId, 'Arn'] },
        Condition: { ArnEquals: { 'iam:PolicyARN': { Ref: containmentPolicyId } } },
      });
      expect(statement(template, 'ContainmentContainAutomationPolicy', 'TagContainmentTimeOnly')).toMatchObject({
        Action: 'iam:TagRole',
        Resource: { 'Fn::GetAtt': [executionRoleId, 'Arn'] },
        Condition: { 'ForAllValues:StringEquals': { 'aws:TagKeys': [CONTAINMENT_TAG_KEY] } },
      });
    });

    test('lets the release role only detach the containment policy, untag and read the role', () => {
      expect(statements(template, 'ContainmentReleaseAutomationPolicy').map(s => s.Sid)).toEqual([
        'DetachContainmentPolicyOnly',
        'UntagContainmentTimeOnly',
        'ReadRoleForReleaseGate',
      ]);
      expect(statement(template, 'ContainmentReleaseAutomationPolicy', 'DetachContainmentPolicyOnly')).toEqual({
        Sid: 'DetachContainmentPolicyOnly',
        Effect: 'Allow',
        Action: 'iam:DetachRolePolicy',
        Resource: { 'Fn::GetAtt': [executionRoleId, 'Arn'] },
        Condition: { ArnEquals: { 'iam:PolicyARN': { Ref: containmentPolicyId } } },
      });
      expect(statement(template, 'ContainmentReleaseAutomationPolicy', 'UntagContainmentTimeOnly')).toMatchObject({
        Action: 'iam:UntagRole',
        Condition: { 'ForAllValues:StringEquals': { 'aws:TagKeys': [CONTAINMENT_TAG_KEY] } },
      });
      expect(statement(template, 'ContainmentReleaseAutomationPolicy', 'ReadRoleForReleaseGate')).toMatchObject({
        Action: 'iam:GetRole',
        Resource: { 'Fn::GetAtt': [executionRoleId, 'Arn'] },
      });
    });

    test('gives each automation role only its own managed policy', () => {
      const roles = template.findResources('AWS::IAM::Role');
      const containPolicyId = logicalId(template, 'AWS::IAM::ManagedPolicy', 'ContainmentContainAutomationPolicy');
      const releasePolicyId = logicalId(template, 'AWS::IAM::ManagedPolicy', 'ContainmentReleaseAutomationPolicy');
      expect(roles[containRoleId].Properties.ManagedPolicyArns).toEqual([{ Ref: containPolicyId }]);
      expect(roles[releaseRoleId].Properties.ManagedPolicyArns).toEqual([{ Ref: releasePolicyId }]);
      expect(roles[containRoleId].Properties.Policies).toBeUndefined();
      expect(roles[releaseRoleId].Properties.Policies).toBeUndefined();
    });

    test('grants StopRuntimeSession on the runtime and its DEFAULT endpoint only', () => {
      const stop = statement(template, 'ContainmentContainAutomationPolicy', 'StopRuntimeSessions');
      expect(stop.Action).toBe('bedrock-agentcore:StopRuntimeSession');
      const rendered = JSON.stringify(stop.Resource);
      expect(rendered).toContain('/runtime-endpoint/DEFAULT');
      expect(rendered).not.toContain('runtime-endpoint/*');
      expect(stop.Resource as unknown[]).toHaveLength(2);
    });

    test('creates both runbooks as Automation documents updated in place', () => {
      const documents = resourcesOfType(template, 'AWS::SSM::Document');
      expect(documents).toHaveLength(2);
      for (const [, document] of documents) {
        expect(document.Properties).toMatchObject({
          DocumentType: 'Automation',
          DocumentFormat: 'JSON',
          UpdateMethod: 'NewVersion',
        });
      }
      expect(properties(template, 'AWS::SSM::Document', 'ContainRunbook').Name).toMatch(
        /^test-org-test-env-test-domain-test-module-agentcore-contain-contain-runtime/,
      );
      expect(properties(template, 'AWS::SSM::Document', 'ReleaseRunbook').Name).toMatch(
        /^test-org-test-env-test-domain-test-module-agentcore-release-contain-runtime/,
      );
    });

    test.each([
      ['ContainRunbook', 'contain'],
      ['ReleaseRunbook', 'release'],
    ])('%s defaults AutomationAssumeRole to its own automation role and names its targets', (id, verb) => {
      const content = runbook(template, id);
      const roleId = verb === 'contain' ? containRoleId : releaseRoleId;
      expect(content.parameters.AutomationAssumeRole).toMatchObject({
        type: 'AWS::IAM::Role::Arn',
        default: { 'Fn::GetAtt': [roleId, 'Arn'] },
      });
      const description = JSON.stringify(content.description);
      expect(description).toContain('AgentRuntimeArn');
      expect(description).toContain(executionRoleId);
    });

    test.each(['ContainRunbook', 'ReleaseRunbook'])(
      '%s resolves the role name from the execution role ARN first',
      id => {
        const content = runbook(template, id);
        expect(content.mainSteps[0]).toMatchObject({
          name: 'ResolveExecutionRole',
          action: 'aws:executeScript',
          onFailure: 'Abort',
          inputs: { InputPayload: { RoleArn: { 'Fn::GetAtt': [executionRoleId, 'Arn'] } } },
          outputs: [{ Name: 'RoleName', Selector: '$.Payload.RoleName', Type: 'String' }],
        });
      },
    );

    test('contain checks approvers, approves, attaches, records the time, then stops sessions', () => {
      const content = runbook(template, 'ContainRunbook');
      expect(content.mainSteps.map(s => s.name)).toEqual([
        'ResolveExecutionRole',
        'CheckApprovers',
        'BranchOnApprovers',
        'WaitForApproval',
        'AttachContainmentPolicy',
        'RecordContainmentTime',
        'StopSessions',
      ]);
      expect(step(content, 'BranchOnApprovers').inputs).toEqual({
        Choices: [{ NextStep: 'WaitForApproval', Variable: '{{ CheckApprovers.HasApprovers }}', BooleanEquals: true }],
        Default: 'AttachContainmentPolicy',
      });
      expect(step(content, 'WaitForApproval')).toMatchObject({
        action: 'aws:approve',
        onFailure: 'Abort',
        inputs: { Approvers: '{{ Approvers }}', MinRequiredApprovals: 1 },
      });
      expect(step(content, 'AttachContainmentPolicy')).toMatchObject({
        action: 'aws:executeAwsApi',
        onFailure: 'Abort',
        inputs: {
          Service: 'iam',
          Api: 'AttachRolePolicy',
          RoleName: '{{ ResolveExecutionRole.RoleName }}',
          PolicyArn: { Ref: containmentPolicyId },
        },
      });
      expect(content.parameters.Approvers).toMatchObject({ type: 'StringList', default: [] });
      expect(content.parameters.SessionIds).toMatchObject({ type: 'StringList', default: [] });
    });

    test('contain records the time before stopping sessions, and a stop failure does not fail containment', () => {
      const content = runbook(template, 'ContainRunbook');
      expect(step(content, 'RecordContainmentTime')).toMatchObject({
        onFailure: 'step:StopSessions',
        inputs: { InputPayload: { RoleName: '{{ ResolveExecutionRole.RoleName }}', TagKey: CONTAINMENT_TAG_KEY } },
      });
      expect(step(content, 'StopSessions')).toMatchObject({
        isCritical: false,
        onFailure: 'Continue',
        inputs: { InputPayload: { SessionIds: '{{ SessionIds }}', Qualifier: '{{ Qualifier }}' } },
      });
      expect(content.parameters.Qualifier).toEqual({
        type: 'String',
        description: 'Endpoint the SessionIds run under.',
        default: 'DEFAULT',
        allowedValues: ['DEFAULT'],
      });
    });

    test('embeds each runbook script from its source file', () => {
      const contain = runbook(template, 'ContainRunbook');
      const release = runbook(template, 'ReleaseRunbook');
      const embedded = (content: RunbookContent, name: string) =>
        step(content, name).inputs as { Script: string; Runtime: string; Handler: string };
      expect(embedded(contain, 'ResolveExecutionRole').Script).toBe(script('resolve_role_name.py'));
      expect(embedded(release, 'ResolveExecutionRole').Script).toBe(script('resolve_role_name.py'));
      expect(embedded(contain, 'CheckApprovers').Script).toBe(script('has_approvers.py'));
      expect(embedded(contain, 'RecordContainmentTime').Script).toBe(script('record_containment.py'));
      expect(embedded(contain, 'StopSessions').Script).toBe(script('stop_sessions.py'));
      expect(embedded(release, 'CheckReleaseGate').Script).toBe(script('release_gate.py'));
      expect(embedded(release, 'CheckReleaseGate')).toMatchObject({ Runtime: 'python3.12', Handler: 'handler' });
    });

    test('release checks the gate with the default maxLifetime, then detaches and untags', () => {
      const content = runbook(template, 'ReleaseRunbook');
      expect(content.mainSteps.map(s => s.name)).toEqual([
        'ResolveExecutionRole',
        'CheckReleaseGate',
        'DetachContainmentPolicy',
        'RemoveContainmentTag',
      ]);
      expect(step(content, 'CheckReleaseGate')).toMatchObject({
        onFailure: 'Abort',
        inputs: {
          InputPayload: {
            RoleName: '{{ ResolveExecutionRole.RoleName }}',
            TagKey: CONTAINMENT_TAG_KEY,
            MaxLifetimeSeconds: 28800,
            Force: '{{ Force }}',
          },
        },
      });
      expect(step(content, 'DetachContainmentPolicy').inputs).toMatchObject({
        Api: 'DetachRolePolicy',
        RoleName: '{{ ResolveExecutionRole.RoleName }}',
        PolicyArn: { Ref: containmentPolicyId },
      });
      expect(step(content, 'RemoveContainmentTag').inputs).toMatchObject({
        Api: 'UntagRole',
        RoleName: '{{ ResolveExecutionRole.RoleName }}',
        TagKeys: [CONTAINMENT_TAG_KEY],
      });
      expect(content.parameters.Force).toMatchObject({ type: 'Boolean', default: false });
      expect(JSON.stringify(content.description)).toContain('(8 hours)');
      expect(JSON.stringify(content.description)).toContain(
        'Sessions started or resumed while contained are not covered',
      );
    });

    test.each([
      ['Contain', 'ContainRunbook', 'ReleaseRunbook'],
      ['Release', 'ReleaseRunbook', 'ContainRunbook'],
    ])('the %s responder policy starts only its own runbook', (verb, ownId, otherId) => {
      const policy = properties(template, 'AWS::IAM::ManagedPolicy', `Containment${verb}ResponderPolicy`);
      expect(policy.Roles).toBeUndefined();
      const ownName = properties(template, 'AWS::SSM::Document', ownId).Name as string;
      const otherName = properties(template, 'AWS::SSM::Document', otherId).Name as string;
      const start = JSON.stringify(statement(template, `Containment${verb}ResponderPolicy`, 'StartRunbook'));
      expect(start).toContain(`automation-definition/${ownName}:*`);
      expect(start).toContain(`document/${ownName}`);
      expect(start).toContain('automation-execution/*');
      expect(start).not.toContain(otherName);
    });

    test.each([
      ['Contain', 'contain'],
      ['Release', 'release'],
    ])('the %s responder policy passes only its own automation role, to Systems Manager only', (verb, roleVerb) => {
      const roleId = roleVerb === 'contain' ? containRoleId : releaseRoleId;
      expect(statement(template, `Containment${verb}ResponderPolicy`, 'PassAutomationRole')).toEqual({
        Sid: 'PassAutomationRole',
        Effect: 'Allow',
        Action: 'iam:PassRole',
        Resource: { 'Fn::GetAtt': [roleId, 'Arn'] },
        Condition: { StringEquals: { 'iam:PassedToService': 'ssm.amazonaws.com' } },
      });
    });

    test('the responder policies can read their runbook parameter and confirm the result', () => {
      const lookUp = statement(template, 'ContainmentContainResponderPolicy', 'LookUpRunbook');
      expect(JSON.stringify(lookUp.Resource)).toContain(
        'parameter/test-org/test-domain/test-module/agentruntime/contain-runtime/contain-runbook-name',
      );
      expect(statement(template, 'ContainmentContainResponderPolicy', 'ConfirmExecution')).toMatchObject({
        Action: ['ssm:GetAutomationExecution', 'ssm:DescribeAutomationStepExecutions'],
      });
      expect(statement(template, 'ContainmentContainResponderPolicy', 'ConfirmContainment')).toMatchObject({
        Action: 'iam:ListAttachedRolePolicies',
        Resource: { 'Fn::GetAtt': [executionRoleId, 'Arn'] },
      });
    });

    test.each([
      ['Contain', 'ContainRunbook', 'ReleaseRunbook'],
      ['Release', 'ReleaseRunbook', 'ContainRunbook'],
    ])('the %s responder policy can read only its own runbook document, for the console', (verb, ownId, otherId) => {
      const ownName = properties(template, 'AWS::SSM::Document', ownId).Name as string;
      const otherName = properties(template, 'AWS::SSM::Document', otherId).Name as string;
      const read = statement(template, `Containment${verb}ResponderPolicy`, 'ReadRunbook');
      expect(read.Action).toEqual(['ssm:DescribeDocument', 'ssm:GetDocument', 'ssm:DescribeDocumentParameters']);
      expect(JSON.stringify(read.Resource)).toContain(`document/${ownName}`);
      expect(JSON.stringify(read.Resource)).not.toContain(otherName);
      expect(JSON.stringify(read.Resource)).not.toContain('*');
    });

    test('scopes the responder wildcard suppression to the automation ARNs', () => {
      const metadata = template.findResources('AWS::IAM::ManagedPolicy')[
        logicalId(template, 'AWS::IAM::ManagedPolicy', 'ContainmentContainResponderPolicy')
      ].Metadata as { cdk_nag: { rules_to_suppress: { id: string; applies_to?: unknown[] }[] } };
      const [suppression] = metadata.cdk_nag.rules_to_suppress;
      expect(suppression.id).toBe('AwsSolutions-IAM5');
      expect(suppression.applies_to).toHaveLength(2);
    });

    test.each([
      'contain-runbook-name',
      'release-runbook-name',
      'contain-automation-role-arn',
      'release-automation-role-arn',
      'contain-responder-policy-arn',
      'release-responder-policy-arn',
    ])('publishes the %s SSM parameter', name => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: `/test-org/test-domain/test-module/agentruntime/contain-runtime/${name}`,
      });
    });
  });

  describe('Runtime with a named endpoint and a lifecycle configuration', () => {
    let template: Template;

    beforeAll(() => {
      template = synth({ runtimeEndpoint: { name: 'prod' }, lifecycleConfiguration: { maxLifetime: 3600 } }).template;
    });

    test('grants StopRuntimeSession on the named endpoint too, without a wildcard', () => {
      const stop = statement(template, 'ContainmentContainAutomationPolicy', 'StopRuntimeSessions');
      const endpointId = logicalId(template, 'AWS::BedrockAgentCore::RuntimeEndpoint', 'RuntimeEndpoint');
      expect(stop.Resource as unknown[]).toHaveLength(3);
      expect(stop.Resource).toContainEqual({ 'Fn::GetAtt': [endpointId, 'AgentRuntimeEndpointArn'] });
      expect(JSON.stringify(stop.Resource)).not.toContain('runtime-endpoint/*');
    });

    test('defaults the contain Qualifier to the named endpoint and allows DEFAULT', () => {
      const endpointName = properties(template, 'AWS::BedrockAgentCore::RuntimeEndpoint', 'RuntimeEndpoint')
        .Name as string;
      expect(runbook(template, 'ContainRunbook').parameters.Qualifier).toMatchObject({
        default: endpointName,
        allowedValues: [endpointName, 'DEFAULT'],
      });
    });

    test("fixes the runtime's maxLifetime into the release gate", () => {
      const content = runbook(template, 'ReleaseRunbook');
      expect(step(content, 'CheckReleaseGate')).toMatchObject({
        inputs: { InputPayload: { MaxLifetimeSeconds: 3600 } },
      });
      expect(JSON.stringify(content.description)).toContain('(1 hour)');
    });
  });

  describe('containment.enabled: false', () => {
    const tooManyPolicies = Array.from({ length: 25 }, (_, i) => ({
      policyArn: `arn:aws:iam::123456789012:policy/extra-${i}`,
    }));
    const disabled = () =>
      synth(
        { containment: { enabled: false }, policies: tooManyPolicies },
        { [MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY]: 'not-a-number' },
      );

    test('runs neither the headroom check nor the context validation', () => {
      // 26 managed policies and an invalid context value would each fail synth with containment enabled.
      expect(disabled).not.toThrow();
    });

    test('creates no containment resources', () => {
      const { template, construct } = disabled();
      expect(construct.containment).toBeUndefined();
      template.resourceCountIs('AWS::SSM::Document', 0);
      expect(resourcesOfType(template, 'AWS::IAM::ManagedPolicy').map(([id]) => id)).not.toEqual(
        expect.arrayContaining([expect.stringContaining('Containment')]),
      );
      expect(resourcesOfType(template, 'AWS::IAM::Role').map(([id]) => id)).not.toEqual(
        expect.arrayContaining([expect.stringContaining('Containment')]),
      );
    });

    test('publishes no containment SSM parameters', () => {
      const names = resourcesOfType(disabled().template, 'AWS::SSM::Parameter').map(([, p]) =>
        String(p.Properties.Name),
      );
      expect(names.filter(n => /runbook|automation-role|responder/.test(n))).toEqual([]);
    });
  });

  describe('Runtime with a referenced roleArn', () => {
    let template: Template;
    let testApp: MdaaTestApp;

    beforeAll(() => {
      ({ template, testApp } = synth({ roleArn: EXISTING_ROLE_ARN }));
    });

    test('targets the referenced role by ARN in both automation roles and both runbooks', () => {
      for (const [policy, sid] of [
        ['ContainmentContainAutomationPolicy', 'AttachContainmentPolicyOnly'],
        ['ContainmentReleaseAutomationPolicy', 'DetachContainmentPolicyOnly'],
      ]) {
        expect(statement(template, policy, sid).Resource).toBe(EXISTING_ROLE_ARN);
      }
      for (const id of ['ContainRunbook', 'ReleaseRunbook']) {
        expect(step(runbook(template, id), 'ResolveExecutionRole')).toMatchObject({
          inputs: { InputPayload: { RoleArn: EXISTING_ROLE_ARN } },
        });
      }
    });

    test('warns that the headroom check is skipped and containment reaches every user of the role', () => {
      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('headroom check is skipped.*every user of the role'),
      );
      expect(warnings).toHaveLength(1);
    });
  });

  describe('Runtime with a roleArn resolved from SSM at deploy', () => {
    const ssmRoleArn = '{{resolve:ssm:/shared/agentcore/execution-role-arn}}';
    let template: Template;

    beforeAll(() => {
      template = synth({ roleArn: ssmRoleArn }).template;
    });

    test('hands the unresolved ARN to the runbooks instead of deriving a role name at synth', () => {
      for (const id of ['ContainRunbook', 'ReleaseRunbook']) {
        const content = runbook(template, id);
        expect(step(content, 'ResolveExecutionRole')).toMatchObject({
          inputs: { InputPayload: { RoleArn: ssmRoleArn } },
        });
        expect(JSON.stringify(content.mainSteps)).not.toContain('"RoleName":"execution-role-arn}}"');
      }
      expect(step(runbook(template, 'ContainRunbook'), 'AttachContainmentPolicy')).toMatchObject({
        inputs: { RoleName: '{{ ResolveExecutionRole.RoleName }}' },
      });
    });

    test('scopes the automation roles to the dynamic reference itself', () => {
      expect(statement(template, 'ContainmentContainAutomationPolicy', 'AttachContainmentPolicyOnly').Resource).toBe(
        ssmRoleArn,
      );
    });
  });

  describe('Managed-policy headroom', () => {
    const policyArns = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ policyArn: `arn:aws:iam::123456789012:policy/extra-${i}` }));

    test('fails synth when the role is at the default quota, naming the quota and the context key', () => {
      // 19 configured policies plus the runtime policy leaves no room under 20.
      expect(() => synth({ policies: policyArns(19) })).toThrow(
        /carries 20 managed policies.*quota of 20.*@aws-mdaa\/managedPoliciesPerRoleQuota/,
      );
    });

    test('synthesizes when one slot is left under the default quota', () => {
      expect(() => synth({ policies: policyArns(18) })).not.toThrow();
    });

    test('uses a raised quota from context', () => {
      expect(() =>
        synth({ policies: policyArns(19) }, { [MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY]: '25' }),
      ).not.toThrow();
    });

    test.each(['10', '19', '20.5', 'twenty'])('rejects the context value %s', value => {
      expect(() => synth({}, { [MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY]: value })).toThrow(
        /must be an integer of at least 20/,
      );
    });

    test('skips the check for a referenced role', () => {
      expect(() => synth({ roleArn: EXISTING_ROLE_ARN, policies: policyArns(25) })).not.toThrow();
    });
  });

  describe('resolveManagedPoliciesPerRoleQuota', () => {
    test.each([
      [undefined, 20],
      [null, 20],
      [20, 20],
      [25, 25],
      ['25', 25],
      ['"22"', 22],
      [' 21 ', 21],
      [' "23" ', 23],
      ['" 24 "', 24],
    ])('resolves %p to %p', (value, expected) => {
      expect(resolveManagedPoliciesPerRoleQuota(value)).toBe(expected);
    });

    test.each([19, 20.5, '', '-25', 'abc', true, {}])('rejects %p', value => {
      expect(() => resolveManagedPoliciesPerRoleQuota(value)).toThrow(/must be an integer of at least 20/);
    });
  });

  describe('validateManagedPolicyHeadroom', () => {
    test('passes when the containment policy fits', () => {
      expect(() => validateManagedPolicyHeadroom({ runtimeName: 'r', attachedCount: 19, quota: 20 })).not.toThrow();
    });

    test('fails when the containment policy does not fit', () => {
      expect(() => validateManagedPolicyHeadroom({ runtimeName: 'r', attachedCount: 20, quota: 20 })).toThrow(
        /Runtime "r".*quota of 20/,
      );
    });
  });

  test.each([
    ['aws-org', 'aws'],
    ['amazon-retail', 'amazon'],
    ['amzn', 'amzn'],
  ])('rejects a runbook name with a reserved SSM document prefix (org %s)', (org, prefix) => {
    expect(() => synth({}, { org })).toThrow(new RegExp(`starts with "${prefix}", which AWS reserves`));
  });
});
