/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { aws_ssm as ssm, Stack } from 'aws-cdk-lib';
import { Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Containment runbooks for the runtime's execution role. Enabled by default: the module creates a
 * deny-all containment policy (unattached), `contain` and `release` Systems Manager Automation runbooks
 * that attach and detach it, an automation role for each runbook, and two responder policies (unattached)
 * that grant permission to start each runbook. Nothing changes for the agent until `contain` is run.
 *
 * Use cases: incident response on a compromised agent, automated containment from GuardDuty or DNS
 * Firewall findings, opting out where incident response runs centrally
 *
 * AWS: IAM managed policies + role, Systems Manager Automation documents
 *
 * Validation: Optional; omit for the default (enabled)
 */
export interface ContainmentProperty {
  /**
   * Whether to create the containment policy, runbooks, automation roles, responder policies and their
   * SSM parameters. Set `false` for a `roleArn` role whose owner contains it with their own tooling, or
   * where incident response runs centrally and roles with IAM write permissions are not allowed outside it.
   *
   * Use cases: central incident-response tooling, externally managed execution roles
   *
   * AWS: gates creation of the containment IAM resources and Automation documents
   *
   * Validation: Optional; Boolean
   * @default true
   **/
  readonly enabled?: boolean;
}

/** Tag the `contain` runbook writes on the execution role; the `release` runbook's gate is measured from it. */
export const CONTAINMENT_TAG_KEY = 'mdaa:agentcore:contained-at';

/** AgentCore's `lifecycleConfiguration.maxLifetime` when the runtime does not set one. */
export const AGENTCORE_DEFAULT_MAX_LIFETIME_SECONDS = 28800;

/** CDK context key for accounts whose managed-policies-per-role quota was raised through Service Quotas. */
export const MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY = '@aws-mdaa/managedPoliciesPerRoleQuota';

/** IAM's default managed-policies-per-role quota. */
export const DEFAULT_MANAGED_POLICIES_PER_ROLE_QUOTA = 20;

/** Log writes the containment policy leaves allowed on the runtime's own log groups. */
const LOG_WRITE_ACTIONS = ['logs:CreateLogStream', 'logs:PutLogEvents'];

const AUTOMATION_SCRIPT_RUNTIME = 'python3.12';
const EXECUTE_SCRIPT_ACTION = 'aws:executeScript';
const EXECUTE_AWS_API_ACTION = 'aws:executeAwsApi';

// Both runbooks resolve the role name from its ARN first; later steps read it from this output.
const RESOLVE_ROLE_STEP = 'ResolveExecutionRole';
const EXECUTION_ROLE_NAME = `{{ ${RESOLVE_ROLE_STEP}.RoleName }}`;

// AWS reserves these as SSM document name prefixes; CreateDocument rejects them at deploy.
const RESERVED_DOCUMENT_NAME_PREFIXES = ['aws', 'amazon', 'amzn'];

const SSM_SERVICE_AUTHORIZATION_URL =
  'https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html';

/**
 * Resolves the managed-policies-per-role quota from the `@aws-mdaa/managedPoliciesPerRoleQuota` context
 * value, defaulting to IAM's default quota. The value only raises the limit, so anything that is not an
 * integer of at least the default is rejected.
 *
 * @throws Error when the context value is set but is not an integer of at least 20
 */
export function resolveManagedPoliciesPerRoleQuota(contextValue: unknown): number {
  if (contextValue === undefined || contextValue === null) {
    return DEFAULT_MANAGED_POLICIES_PER_ROLE_QUOTA;
  }
  // Context set in mdaa.yaml arrives as a string, possibly still wrapped in quotes.
  const raw =
    typeof contextValue === 'string'
      ? contextValue
          .trim()
          .replace(/(^")|("$)/g, '')
          .trim()
      : contextValue;
  let quota = Number.NaN;
  if (typeof raw === 'number') {
    quota = raw;
  } else if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    quota = Number(raw);
  }
  if (!Number.isInteger(quota) || quota < DEFAULT_MANAGED_POLICIES_PER_ROLE_QUOTA) {
    throw new Error(
      `${MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY} must be an integer of at least ` +
        `${DEFAULT_MANAGED_POLICIES_PER_ROLE_QUOTA} (IAM's default managed-policies-per-role quota); ` +
        `received ${JSON.stringify(contextValue)}.`,
    );
  }
  return quota;
}

/** Inputs for {@link validateManagedPolicyHeadroom}. */
export interface ManagedPolicyHeadroomProps {
  /** Runtime name, for the error message. */
  readonly runtimeName: string;
  /** Managed policies the execution role carries before containment. */
  readonly attachedCount: number;
  /** Effective managed-policies-per-role quota. */
  readonly quota: number;
}

/**
 * Fails synth when attaching the containment policy would exceed the role's managed-policy quota. The
 * check runs at synth because `contain` would otherwise fail with `LimitExceeded` mid-incident.
 *
 * @throws Error naming the quota and the context key when there is no headroom
 */
export function validateManagedPolicyHeadroom(props: ManagedPolicyHeadroomProps): void {
  if (props.attachedCount + 1 <= props.quota) {
    return;
  }
  throw new Error(
    `Runtime "${props.runtimeName}": the execution role carries ${props.attachedCount} managed policies, and ` +
      `containment attaches one more, which exceeds the managed-policies-per-role quota of ${props.quota}. ` +
      `Remove a policies[].policyArn entry, set containment.enabled: false, or, once a Service Quotas ` +
      `increase is approved for the account, set the ${MANAGED_POLICIES_PER_ROLE_QUOTA_CONTEXT_KEY} context ` +
      `value to the new quota.`,
  );
}

/** Inputs for {@link RuntimeContainment}, resolved by the runtime L3 construct. */
export interface RuntimeContainmentProps extends MdaaConstructProps {
  /** Runtime name from config; keys the resource names and SSM parameters. */
  readonly runtimeName: string;
  /** ID of the runtime; its service-created log groups are named `<runtime ID>-<endpoint>`. */
  readonly runtimeId: string;
  /** ARN of the runtime. */
  readonly runtimeArn: string;
  /** ARNs of every endpoint a session can run under: DEFAULT, plus the named endpoint when configured. */
  readonly runtimeEndpointArns: string[];
  /** Endpoint names `contain` accepts as its `Qualifier` input; the first is the default. */
  readonly qualifiers: string[];
  /**
   * ARN of the execution role containment acts on. May be a deploy-time value such as an SSM dynamic
   * reference; the runbooks derive the role name from it when they run.
   */
  readonly executionRoleArn: string;
  /** The runtime's maximum session lifetime, fixed into the `release` gate. */
  readonly maxLifetimeSeconds: number;
}

type Verb = 'contain' | 'release';

type StepOutput = { Name: string; Selector: string; Type: string };

/** Fields common to every runbook step built by {@link RuntimeContainment}. */
interface StepOptions {
  readonly name: string;
  readonly onFailure?: string;
  readonly isCritical?: boolean;
  readonly isEnd?: boolean;
  readonly outputs?: StepOutput[];
}

interface ScriptStepOptions extends StepOptions {
  /** File under `src/automation/containment/` whose `handler` the step runs. */
  readonly file: string;
  readonly payload: { [key: string]: unknown };
}

interface IamStepOptions extends StepOptions {
  readonly api: string;
  readonly inputs: { [key: string]: unknown };
}

function payloadOutput(name: string, type: string): StepOutput {
  return { Name: name, Selector: `$.Payload.${name}`, Type: type };
}

function capitalize(verb: Verb): string {
  return verb === 'contain' ? 'Contain' : 'Release';
}

function formatHours(seconds: number): string {
  const hours = Math.round((seconds / 3600) * 10) / 10;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/**
 * Deploys the containment mechanism for one AgentCore runtime: an unattached deny-all policy for the
 * execution role, `contain` and `release` Automation runbooks, and a separate automation role for each
 * runbook. Both roles trust only Systems Manager Automation executions in this account. The contain role can only
 * attach the containment policy, write the containment tag and stop sessions; the release role can only
 * detach it, remove the tag and read the role. Unattached responder policies grant starting each runbook
 * with its own role, so holding the contain grant never confers the ability to release.
 *
 * Every AWS call made with the execution role is denied except log writes to the runtime's own log groups,
 * so the contained agent's activity is still recorded. Running sessions are cut off at their next AWS call,
 * and the Deny also applies to credentials copied out of a session.
 */
export class RuntimeContainment extends Construct {
  public readonly containmentPolicy: MdaaManagedPolicy;
  public readonly containAutomationRole: MdaaRole;
  public readonly releaseAutomationRole: MdaaRole;
  public readonly containRunbook: ssm.CfnDocument;
  public readonly releaseRunbook: ssm.CfnDocument;
  public readonly containResponderPolicy: MdaaManagedPolicy;
  public readonly releaseResponderPolicy: MdaaManagedPolicy;
  private readonly props: RuntimeContainmentProps;

  constructor(scope: Construct, id: string, props: RuntimeContainmentProps) {
    super(scope, id);
    this.props = props;

    this.containmentPolicy = this.createContainmentPolicy();
    this.containAutomationRole = this.createAutomationRole('contain');
    this.releaseAutomationRole = this.createAutomationRole('release');

    const containRunbookName = this.runbookName('contain');
    const releaseRunbookName = this.runbookName('release');
    this.containRunbook = this.createRunbook('ContainRunbook', containRunbookName, this.containRunbookContent());
    this.releaseRunbook = this.createRunbook('ReleaseRunbook', releaseRunbookName, this.releaseRunbookContent());

    const containParam = this.publish('contain-runbook-name', this.containRunbook.ref);
    const releaseParam = this.publish('release-runbook-name', this.releaseRunbook.ref);
    this.publish('contain-automation-role-arn', this.containAutomationRole.roleArn);
    this.publish('release-automation-role-arn', this.releaseAutomationRole.roleArn);

    this.containResponderPolicy = this.createResponderPolicy('contain', containRunbookName, containParam);
    this.releaseResponderPolicy = this.createResponderPolicy('release', releaseRunbookName, releaseParam);
    this.publish('contain-responder-policy-arn', this.containResponderPolicy.managedPolicyArn);
    this.publish('release-responder-policy-arn', this.releaseResponderPolicy.managedPolicyArn);
  }

  private createContainmentPolicy(): MdaaManagedPolicy {
    const stack = Stack.of(this);
    // `*` in an IAM ARN matches across `:`, so this one pattern covers the log groups and their
    // `:log-stream:*` ARNs. The runtime ID is unique to this runtime, so no other runtime's log groups match.
    // The policy is never attached by CloudFormation, so referencing the runtime creates no dependency cycle.
    const ownLogGroups = `arn:${stack.partition}:logs:${stack.region}:${stack.account}:log-group:/aws/bedrock-agentcore/runtimes/${this.props.runtimeId}-*`;
    return new MdaaManagedPolicy(this, 'ContainmentPolicy', {
      naming: this.props.naming,
      managedPolicyName: `agentcore-containment-${this.props.runtimeName}`,
      description: `Containment for Bedrock AgentCore Runtime ${this.props.runtimeName}: attached by its contain runbook`,
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: 'DenyAllExceptLogWrites',
            effect: Effect.DENY,
            notActions: LOG_WRITE_ACTIONS,
            resources: ['*'],
          }),
          new PolicyStatement({
            sid: 'DenyLogWritesOutsideOwnLogGroups',
            effect: Effect.DENY,
            actions: LOG_WRITE_ACTIONS,
            notResources: [ownLogGroups],
          }),
        ],
      }),
    });
  }

  /**
   * One role per runbook: a principal who may pass the contain role to any Automation document can still
   * only attach, tag and stop sessions with it, never detach.
   */
  private createAutomationRole(verb: Verb): MdaaRole {
    const policy = new MdaaManagedPolicy(this, `${capitalize(verb)}AutomationPolicy`, {
      naming: this.props.naming,
      managedPolicyName: `agentcore-${verb}-automation-${this.props.runtimeName}`,
      description: `Permissions for the ${verb} runbook of Bedrock AgentCore Runtime ${this.props.runtimeName}`,
      document: new PolicyDocument({
        statements: verb === 'contain' ? this.containAutomationStatements() : this.releaseAutomationStatements(),
      }),
    });
    return new MdaaRole(this, `${capitalize(verb)}AutomationRole`, {
      naming: this.props.naming,
      roleName: `agentcore-${verb}-${this.props.runtimeName}`,
      assumedBy: this.automationPrincipal(),
      description: `Runs the ${verb} runbook of Bedrock AgentCore Runtime ${this.props.runtimeName}`,
      managedPolicies: [policy],
    });
  }

  /** Systems Manager, only for Automation executions in this account and region. */
  private automationPrincipal(): ServicePrincipal {
    const stack = Stack.of(this);
    return new ServicePrincipal('ssm.amazonaws.com', {
      conditions: {
        StringEquals: { 'aws:SourceAccount': stack.account },
        ArnLike: {
          'aws:SourceArn': `arn:${stack.partition}:ssm:${stack.region}:${stack.account}:automation-execution/*`,
        },
      },
    });
  }

  private containAutomationStatements(): PolicyStatement[] {
    return [
      this.containmentPolicyStatement('AttachContainmentPolicyOnly', 'iam:AttachRolePolicy'),
      this.containmentTagStatement('TagContainmentTimeOnly', 'iam:TagRole'),
      // StopRuntimeSession authorizes against both the runtime and the endpoint the session runs under.
      new PolicyStatement({
        sid: 'StopRuntimeSessions',
        effect: Effect.ALLOW,
        actions: ['bedrock-agentcore:StopRuntimeSession'],
        resources: [this.props.runtimeArn, ...this.props.runtimeEndpointArns],
      }),
    ];
  }

  private releaseAutomationStatements(): PolicyStatement[] {
    return [
      this.containmentPolicyStatement('DetachContainmentPolicyOnly', 'iam:DetachRolePolicy'),
      this.containmentTagStatement('UntagContainmentTimeOnly', 'iam:UntagRole'),
      new PolicyStatement({
        sid: 'ReadRoleForReleaseGate',
        effect: Effect.ALLOW,
        actions: ['iam:GetRole'],
        resources: [this.props.executionRoleArn],
      }),
    ];
  }

  /**
   * Allows attaching or detaching the containment policy, and no other, on the execution role.
   * iam:PolicyARN pins it to the one fixed policy, which is why containment uses a managed policy:
   * iam:PutRolePolicy has no condition on the policy document it writes.
   */
  private containmentPolicyStatement(sid: string, action: string): PolicyStatement {
    return new PolicyStatement({
      sid,
      effect: Effect.ALLOW,
      actions: [action],
      resources: [this.props.executionRoleArn],
      conditions: { ArnEquals: { 'iam:PolicyARN': this.containmentPolicy.managedPolicyArn } },
    });
  }

  /** Allows writing or removing the containment tag, and no other tag, on the execution role. */
  private containmentTagStatement(sid: string, action: string): PolicyStatement {
    return new PolicyStatement({
      sid,
      effect: Effect.ALLOW,
      actions: [action],
      resources: [this.props.executionRoleArn],
      conditions: { 'ForAllValues:StringEquals': { 'aws:TagKeys': [CONTAINMENT_TAG_KEY] } },
    });
  }

  private automationRole(verb: Verb): MdaaRole {
    return verb === 'contain' ? this.containAutomationRole : this.releaseAutomationRole;
  }

  private runbookName(verb: Verb): string {
    const name = this.props.naming
      .withResourceType(MdaaResourceType.SSM_DOCUMENT)
      .resourceName(`agentcore-${verb}-${this.props.runtimeName}`, 128);
    const reserved = RESERVED_DOCUMENT_NAME_PREFIXES.find(prefix => name.toLowerCase().startsWith(prefix));
    if (reserved) {
      throw new Error(
        `The ${verb} runbook name "${name}" starts with "${reserved}", which AWS reserves as an SSM document name ` +
          `prefix. Change the naming org, or set containment.enabled: false.`,
      );
    }
    return name;
  }

  private createRunbook(id: string, name: string, content: object): ssm.CfnDocument {
    return new ssm.CfnDocument(this, id, {
      name,
      documentType: 'Automation',
      documentFormat: 'JSON',
      // A named document cannot be replaced in place; NewVersion updates it and makes the new version default.
      updateMethod: 'NewVersion',
      content,
    });
  }

  private publish(name: string, value: string): MdaaParamAndOutput {
    return new MdaaParamAndOutput(this, {
      resourceType: 'agentRuntime',
      resourceId: this.props.runtimeName,
      name,
      value,
      naming: this.props.naming,
      createParams: this.props.createParams,
      createOutputs: this.props.createOutputs,
    });
  }

  private scriptStep(options: ScriptStepOptions): { [key: string]: unknown } {
    const { file, payload, ...step } = options;
    return {
      ...step,
      action: EXECUTE_SCRIPT_ACTION,
      inputs: {
        Runtime: AUTOMATION_SCRIPT_RUNTIME,
        Handler: 'handler',
        Script: readFileSync(join(__dirname, '..', 'src', 'automation', 'containment', file), 'utf-8'),
        InputPayload: payload,
      },
    };
  }

  private iamStep(options: IamStepOptions): { [key: string]: unknown } {
    const { api, inputs, ...step } = options;
    return { ...step, action: EXECUTE_AWS_API_ACTION, inputs: { Service: 'iam', Api: api, ...inputs } };
  }

  private resolveRoleStep(): { [key: string]: unknown } {
    return this.scriptStep({
      name: RESOLVE_ROLE_STEP,
      onFailure: 'Abort',
      file: 'resolve_role_name.py',
      payload: { RoleArn: this.props.executionRoleArn },
      outputs: [payloadOutput('RoleName', 'String')],
    });
  }

  private assumeRoleParameter(verb: Verb): { [key: string]: unknown } {
    return {
      type: 'AWS::IAM::Role::Arn',
      description: `Role the automation runs as. Defaults to the module-created ${verb} automation role.`,
      default: this.automationRole(verb).roleArn,
    };
  }

  private runbookDescription(title: string, summary: string): string {
    return [
      `# ${title}`,
      '',
      summary,
      '',
      `* Runtime: ${this.props.runtimeArn}`,
      `* Execution role: ${this.props.executionRoleArn}`,
      `* Containment policy: ${this.containmentPolicy.managedPolicyArn}`,
    ].join('\n');
  }

  private containRunbookContent(): object {
    return {
      schemaVersion: '0.3',
      description: this.runbookDescription(
        'Contain a Bedrock AgentCore runtime',
        'Attaches the containment policy to the execution role. Every AWS call made with the role is then denied, ' +
          "except log writes to the runtime's own log groups. Running sessions fail at their next AWS call, as do " +
          'new sessions, and credentials copied out of a session are denied too. It stops neither callers nor ' +
          'session billing.',
      ),
      assumeRole: '{{ AutomationAssumeRole }}',
      parameters: this.containParameters(),
      mainSteps: this.containSteps(),
      outputs: ['RecordContainmentTime.ContainedAt'],
    };
  }

  private containParameters(): { [key: string]: unknown } {
    const [defaultQualifier] = this.props.qualifiers;
    return {
      AutomationAssumeRole: this.assumeRoleParameter('contain'),
      SessionIds: {
        type: 'StringList',
        description: '(Optional) IDs of running sessions to stop once the policy is attached.',
        default: [],
      },
      Qualifier: {
        type: 'String',
        description: 'Endpoint the SessionIds run under.',
        default: defaultQualifier,
        allowedValues: this.props.qualifiers,
      },
      Approvers: {
        type: 'StringList',
        description:
          '(Optional) IAM principal ARNs, any one of whom must approve before the policy is attached. ' +
          'Leave empty to contain immediately.',
        default: [],
      },
    };
  }

  private containSteps(): { [key: string]: unknown }[] {
    return [
      this.resolveRoleStep(),
      this.scriptStep({
        name: 'CheckApprovers',
        file: 'has_approvers.py',
        payload: { Approvers: '{{ Approvers }}' },
        outputs: [payloadOutput('HasApprovers', 'Boolean')],
      }),
      {
        name: 'BranchOnApprovers',
        action: 'aws:branch',
        inputs: {
          Choices: [
            { NextStep: 'WaitForApproval', Variable: '{{ CheckApprovers.HasApprovers }}', BooleanEquals: true },
          ],
          Default: 'AttachContainmentPolicy',
        },
      },
      {
        name: 'WaitForApproval',
        action: 'aws:approve',
        onFailure: 'Abort',
        inputs: {
          Approvers: '{{ Approvers }}',
          MinRequiredApprovals: 1,
          Message: `Approve containment of Bedrock AgentCore runtime ${this.props.runtimeArn}. Every AWS call made with its execution role will be denied until release.`,
        },
      },
      this.iamStep({
        name: 'AttachContainmentPolicy',
        onFailure: 'Abort',
        api: 'AttachRolePolicy',
        inputs: { RoleName: EXECUTION_ROLE_NAME, PolicyArn: this.containmentPolicy.managedPolicyArn },
      }),
      // The role is already contained at this point, so a tagging failure still stops sessions
      // before the execution reports Failed. Without the tag, release requires Force.
      this.scriptStep({
        name: 'RecordContainmentTime',
        onFailure: 'step:StopSessions',
        file: 'record_containment.py',
        payload: { RoleName: EXECUTION_ROLE_NAME, TagKey: CONTAINMENT_TAG_KEY },
        outputs: [payloadOutput('ContainedAt', 'String')],
      }),
      // Not critical: the role is contained whether or not every session stopped. The step's
      // failure message names the sessions it could not stop.
      this.scriptStep({
        name: 'StopSessions',
        isCritical: false,
        onFailure: 'Continue',
        isEnd: true,
        file: 'stop_sessions.py',
        payload: { SessionIds: '{{ SessionIds }}', RuntimeArn: this.props.runtimeArn, Qualifier: '{{ Qualifier }}' },
      }),
    ];
  }

  private releaseRunbookContent(): object {
    return {
      schemaVersion: '0.3',
      description: this.runbookDescription(
        'Release a contained Bedrock AgentCore runtime',
        'Detaches the containment policy from the execution role and removes the containment tag. Refuses ' +
          `until the release gate has passed: the containment time, plus the runtime's maxLifetime ` +
          `(${formatHours(this.props.maxLifetimeSeconds)}), plus the role's MaxSessionDuration. Until then, a ` +
          'session that was running at containment may still hold credentials that would work again on release. ' +
          'Sessions started or resumed while contained are not covered, so block new invocations before relying ' +
          'on the gate.',
      ),
      assumeRole: '{{ AutomationAssumeRole }}',
      parameters: {
        AutomationAssumeRole: this.assumeRoleParameter('release'),
        Force: {
          type: 'Boolean',
          description:
            "Skips the release gate. Use only after stopping the live sessions by ID and revoking the role's " +
            'active sessions.',
          default: false,
        },
      },
      mainSteps: [
        this.resolveRoleStep(),
        this.scriptStep({
          name: 'CheckReleaseGate',
          onFailure: 'Abort',
          file: 'release_gate.py',
          payload: {
            RoleName: EXECUTION_ROLE_NAME,
            TagKey: CONTAINMENT_TAG_KEY,
            MaxLifetimeSeconds: this.props.maxLifetimeSeconds,
            Force: '{{ Force }}',
          },
          outputs: [payloadOutput('GateStatus', 'String')],
        }),
        this.iamStep({
          name: 'DetachContainmentPolicy',
          onFailure: 'Abort',
          api: 'DetachRolePolicy',
          inputs: { RoleName: EXECUTION_ROLE_NAME, PolicyArn: this.containmentPolicy.managedPolicyArn },
        }),
        this.iamStep({
          name: 'RemoveContainmentTag',
          isEnd: true,
          api: 'UntagRole',
          inputs: { RoleName: EXECUTION_ROLE_NAME, TagKeys: [CONTAINMENT_TAG_KEY] },
        }),
      ],
      outputs: ['CheckReleaseGate.GateStatus'],
    };
  }

  /**
   * Creates the unattached policy a customer attaches to the principals allowed to start one runbook. It
   * passes only that runbook's automation role, so the contain grant cannot be used to release.
   */
  private createResponderPolicy(verb: Verb, runbookName: string, runbookParam: MdaaParamAndOutput): MdaaManagedPolicy {
    const policy = new MdaaManagedPolicy(this, `${capitalize(verb)}ResponderPolicy`, {
      naming: this.props.naming,
      managedPolicyName: `agentcore-${verb}-responder-${this.props.runtimeName}`,
      description: `Grants starting the ${verb} runbook of Bedrock AgentCore Runtime ${this.props.runtimeName}`,
      document: new PolicyDocument({ statements: this.responderStatements(verb, runbookName, runbookParam) }),
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(policy, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'ssm:StartAutomationExecution, ssm:GetAutomationExecution and ssm:DescribeAutomationStepExecutions require ' +
          'the automation-execution resource, ' +
          'whose ID is generated when the execution starts, so it cannot be named in advance; the runbook itself is ' +
          'pinned by its document and automation-definition ARNs, with :* covering its versions. ' +
          `See ${SSM_SERVICE_AUTHORIZATION_URL}`,
        appliesTo: [
          { regex: String.raw`/^Resource::arn:.+:ssm:.+:automation-execution\/\*$/` },
          { regex: String.raw`/^Resource::arn:.+:ssm:.+:automation-definition\/.+:\*$/` },
        ],
      },
    ]);
    return policy;
  }

  private responderStatements(verb: Verb, runbookName: string, runbookParam: MdaaParamAndOutput): PolicyStatement[] {
    const stack = Stack.of(this);
    const ssmArnPrefix = `arn:${stack.partition}:ssm:${stack.region}:${stack.account}`;
    const automationExecutions = `${ssmArnPrefix}:automation-execution/*`;
    return [
      new PolicyStatement({
        sid: 'StartRunbook',
        effect: Effect.ALLOW,
        actions: ['ssm:StartAutomationExecution'],
        resources: [
          `${ssmArnPrefix}:automation-definition/${runbookName}:*`,
          `${ssmArnPrefix}:document/${runbookName}`,
          automationExecutions,
        ],
      }),
      new PolicyStatement({
        sid: 'PassAutomationRole',
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.automationRole(verb).roleArn],
        conditions: { StringEquals: { 'iam:PassedToService': 'ssm.amazonaws.com' } },
      }),
      new PolicyStatement({
        sid: 'LookUpRunbook',
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [`${ssmArnPrefix}:parameter${runbookParam.paramName}`],
      }),
      // The console reads the document before it can start it; DescribeDocumentParameters is console-only.
      new PolicyStatement({
        sid: 'ReadRunbook',
        effect: Effect.ALLOW,
        actions: ['ssm:DescribeDocument', 'ssm:GetDocument', 'ssm:DescribeDocumentParameters'],
        resources: [`${ssmArnPrefix}:document/${runbookName}`],
      }),
      new PolicyStatement({
        sid: 'ConfirmExecution',
        effect: Effect.ALLOW,
        actions: ['ssm:GetAutomationExecution', 'ssm:DescribeAutomationStepExecutions'],
        resources: [automationExecutions],
      }),
      new PolicyStatement({
        sid: 'ConfirmContainment',
        effect: Effect.ALLOW,
        actions: ['iam:ListAttachedRolePolicies'],
        resources: [this.props.executionRoleArn],
      }),
    ];
  }
}
