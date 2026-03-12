/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';
import { EventBridgeHelper, EventBridgeProps } from '@aws-mdaa/eventbridge-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { aws_events_targets, Duration } from 'aws-cdk-lib';
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { Role } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  CfnStateMachine,
  IStateMachine,
  LogLevel,
  StateMachine,
  StateMachineProps,
  StateMachineType,
  Wait,
  WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * Configuration for a Step Functions state machine including execution role, logging, and EventBridge integration.
 *
 * Use cases: Workflow orchestration, state machine configuration, DataOps automation, process coordination
 *
 * AWS: AWS Step Functions state machine configuration for workflow orchestration
 *
 * Validation: stateMachineName, stateMachineType, stateMachineExecutionRole, logExecutionData, and rawStepFunctionDef are required
 */
export interface StepFunctionProps {
  /**
   * Name for the Step Functions state machine.
   *
   * Use cases: State machine identification, workflow naming
   *
   * AWS: Step Functions state machine name
   *
   * Validation: Must be a valid state machine name; required
   **/
  readonly stateMachineName: string;
  /**
   * State machine type: STANDARD for long-running or EXPRESS for high-volume short-duration workflows.
   *
   * Use cases: Execution model selection, performance optimization, cost management
   *
   * AWS: Step Functions state machine type
   *
   * Validation: Must be STANDARD or EXPRESS; required
   **/
  readonly stateMachineType: string;
  /**
   * IAM role ARN the state machine assumes for executing workflow steps.
   *
   * Use cases: Workflow permissions, service integration, secure execution
   *
   * AWS: IAM role ARN for Step Functions execution
   *
   * Validation: Must be a valid IAM role ARN; required
   **/
  readonly stateMachineExecutionRole: string;
  /**
   * CloudWatch log group retention in days (0 for infinite, defaults to 731).
   *
   * Use cases: Log retention management, compliance requirements, storage cost optimization
   *
   * AWS: CloudWatch log group retention for Step Functions execution logs
   *
   * Validation: Must be 1,3,5,7,14,30,60,90,120,150,180,365,400,545,731,1827,3653, or 0 if provided
   **/
  readonly logGroupRetentionDays?: number;
  /**
   * Whether to log parameter values and execution data during state machine execution.
   *
   * Use cases: Execution monitoring, debugging, operational visibility
   *
   * AWS: Step Functions execution data logging
   *
   * Validation: Must be boolean; required
   **/
  readonly logExecutionData: boolean;
  /**
   * State machine definition as a JSON object (as exported from Step Functions console).
   *
   * Use cases: Workflow definition, state transitions, business logic specification
   *
   * AWS: Step Functions state machine definition
   *
   * Validation: Must be a valid JSON object with state machine definition; required
   **/
  readonly rawStepFunctionDef: { [key: string]: unknown };
  /**
   * CDK Nag suppressions for controlled security rule exceptions with justification.
   *
   * Use cases: Compliance management, security rule exceptions, audit documentation
   *
   * AWS: CDK Nag suppressions for Step Functions compliance
   *
   * Validation: Must be array of valid SuppressionProps if provided
   **/
  readonly suppressions?: SuppressionProps[];
  /**
   * EventBridge configuration for event-driven state machine triggering.
   *
   * Use cases: Event-driven workflows, external integration, automated triggering
   *
   * AWS: Amazon EventBridge integration for Step Functions triggers
   *
   * Validation: Must be valid EventBridgeProps if provided
   **/
  readonly eventBridge?: EventBridgeProps;
}

/**
 * CDK Nag suppression entry with rule ID and justification reason.
 *
 * Use cases: Compliance rule exceptions, security suppressions, audit documentation
 *
 * AWS: CDK Nag suppression configuration for compliance rule exception management
 *
 * Validation: id and reason are both required
 */
export interface SuppressionProps {
  /**
   * CDK Nag rule ID to suppress (e.g. 'AwsSolutions-IAM5').
   *
   * Use cases: Rule identification, specific suppressions
   *
   * AWS: CDK Nag rule ID
   *
   * Validation: Must be a valid CDK Nag rule ID; required
   **/
  readonly id: string;
  /**
   * Business or technical justification for the suppression.
   *
   * Use cases: Exception justification, compliance documentation, audit trail
   *
   * AWS: Suppression reason for CDK Nag compliance documentation
   *
   * Validation: Must be descriptive justification text; required
   **/
  readonly reason: string;
}

export interface StepFunctionL3ConstructProps extends MdaaL3ConstructProps {
  // DataOps project name for Step Functions resource coordination and SSM parameters
  readonly projectName?: string;
  readonly kmsArn?: string;
  // Array of Step Functions state machine definitions to deploy
  readonly stepfunctionDefinitions: StepFunctionProps[];
}

export class StepFunctionL3Construct extends MdaaL3Construct {
  protected readonly props: StepFunctionL3ConstructProps;

  private readonly kmsKey: IKey;

  constructor(scope: Construct, id: string, props: StepFunctionL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    if (!this.props.kmsArn) {
      throw new Error('Project KMS ARN is required for Step Function L3 Construct');
    }
    this.kmsKey = Key.fromKeyArn(this, this.props.projectName ?? 'kms-key', this.props.kmsArn);

    // Build our stepfunctions!
    this.props.stepfunctionDefinitions?.map(stepfunctionDefinition => {
      const stepfunctionName: string = stepfunctionDefinition.stateMachineName;

      const logGroup = this.createLogGroup(stepfunctionDefinition);
      if (stepfunctionDefinition.suppressions) {
        MdaaNagSuppressions.addConfigResourceSuppressions(logGroup, stepfunctionDefinition.suppressions);
      }

      const stepfunction = this.createStepFunctionFromDefinition(stepfunctionDefinition, logGroup);
      if (stepfunction.stateMachineName && this.props.projectName) {
        DataOpsProjectUtils.createProjectSSMParam(
          this.scope,
          this.props.naming,
          this.props.projectName,
          `stepfunction/name/${stepfunctionName}`,
          stepfunction.stateMachineName,
        );
      }

      return stepfunction;
    });
  }

  private createLogGroup(stepfunctionProps: StepFunctionProps): LogGroup {
    let logGroupRetentionDays: RetentionDays;

    if (stepfunctionProps.logGroupRetentionDays != undefined) {
      if (stepfunctionProps.logGroupRetentionDays != 0) {
        logGroupRetentionDays = stepfunctionProps.logGroupRetentionDays;
      } else {
        logGroupRetentionDays = RetentionDays.INFINITE;
      }
    } else {
      logGroupRetentionDays = RetentionDays.TWO_YEARS;
    }

    return new MdaaLogGroup(this, `${stepfunctionProps.stateMachineName}-loggroup`, {
      naming: this.props.naming,
      logGroupName: stepfunctionProps.stateMachineName,
      logGroupNamePathPrefix: `/aws/stepfunction/`,
      encryptionKey: this.kmsKey,
      retention: logGroupRetentionDays,
    });
  }

  private createStepFunctionFromDefinition(stepfunctionProps: StepFunctionProps, logGroup: LogGroup): StateMachine {
    const stepfunctionName: string = stepfunctionProps.stateMachineName;

    const role = Role.fromRoleArn(this.scope, `${stepfunctionName}-role`, stepfunctionProps.stateMachineExecutionRole);
    const stepFunctionProps: StateMachineProps = {
      role: role,
      stateMachineType: <StateMachineType>stepfunctionProps.stateMachineType,
      stateMachineName: this.props.naming.resourceName(stepfunctionName, 80),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        includeExecutionData: stepfunctionProps.logExecutionData,
        level: LogLevel.ALL,
      },
      //Initially create the state machine with a placeholder definition, which we will
      //replace with the definition string using a property override.
      definition: new Wait(this.scope, this.props.naming.resourceName(`placeholder-${stepfunctionName}`, 80), {
        time: WaitTime.duration(Duration.seconds(1)),
      }),
    };
    const stepFunction = new StateMachine(this.scope, `stepfunction-${stepfunctionName}`, stepFunctionProps);

    //L2 construct adds inline policies to role automatically, but these should be added elsewhere.
    role.node.tryRemoveChild('Policy');

    //Inject the definition string using a property override. This allows
    //the definition Json (from CLI/Console) to be directly pasted
    const cfnStateMachine = stepFunction.node.defaultChild as CfnStateMachine;
    cfnStateMachine.addPropertyOverride('DefinitionString', JSON.stringify(stepfunctionProps.rawStepFunctionDef));
    if (stepfunctionProps.eventBridge) {
      this.createStepFunctionEventBridgeRules(stepfunctionProps.eventBridge, stepfunctionName, stepFunction);
    }

    return stepFunction;
  }

  private createStepFunctionEventBridgeRules(
    eventBridgeProps: EventBridgeProps,
    functionName: string,
    stepFunction: IStateMachine,
  ) {
    const dlq = EventBridgeHelper.createDlq(this.scope, this.props.naming, `${functionName}-events`, this.kmsKey);

    const eventBridgeRuleProps = EventBridgeHelper.createNamedEventBridgeRuleProps(eventBridgeProps, functionName);

    Object.entries(eventBridgeRuleProps).forEach(propsEntry => {
      const ruleName = propsEntry[0];
      const ruleProps = propsEntry[1];
      const target = new aws_events_targets.SfnStateMachine(stepFunction, {
        deadLetterQueue: dlq,
        retryAttempts: eventBridgeProps.retryAttempts,
        maxEventAge: eventBridgeProps.maxEventAgeSeconds
          ? Duration.seconds(eventBridgeProps.maxEventAgeSeconds)
          : undefined,
        input: RuleTargetInput.fromObject(ruleProps.input),
      });
      EventBridgeHelper.createEventBridgeRuleForTarget(this.scope, this.props.naming, target, ruleName, ruleProps);
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      stepFunction,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is specific to invocation of this step function. Inline policy is appropriate.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is specific to invocation of this step function. Inline policy is appropriate.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is specific to invocation of this step function. Inline policy is appropriate.',
        },
      ],
      true,
    );
  }
}
