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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Step Functions state machine properties providing workflow orchestration and execution management capabilities. Defines state machine configuration including execution roles, logging, monitoring, and EventBridge integration for DataOps workflow automation and orchestration.
 *
 * Use cases: Workflow orchestration; State machine configuration; DataOps automation; Process coordination
 *
 * AWS: Step Functions state machine configuration for workflow orchestration and process automation
 *
 * Validation: stateMachineName, stateMachineType, stateMachineExecutionRole, logExecutionData, and rawStepFunctionDef are required
 */
export interface StepFunctionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required state machine name for Step Functions identification and workflow management enabling unique state machine identification and operational management. Provides the name for the Step Functions state machine for workflow identification and management within the DataOps environment.
   *
   * Use cases: State machine identification; Workflow naming; Operational management; Resource identification
   *
   * AWS: Step Functions state machine name for workflow identification and management
   *
   * Validation: Must be valid state machine name; required for state machine creation and identification
   **/
  readonly stateMachineName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required state machine type specification controlling execution model and performance characteristics for workflow optimization. Defines whether to use STANDARD for long-running workflows or EXPRESS for high-volume, short-duration executions with different pricing and feature sets.
   *
   * Use cases: Execution model selection; Performance optimization; Cost management; Workflow characteristics
   *
   * AWS: Step Functions state machine type for execution model and performance optimization
   *
   * Validation: Must be STANDARD or EXPRESS; required for state machine type and execution model selection
   **/
  readonly stateMachineType: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required execution role ARN for Step Functions state machine permissions enabling secure workflow execution and AWS service integration. Provides the IAM role that the state machine will assume for executing workflow steps and accessing AWS services during workflow execution.
   *
   * Use cases: Workflow permissions; Service integration; Secure execution; IAM role management
   *
   * AWS: IAM role ARN for Step Functions state machine execution permissions and service access
   *
   * Validation: Must be valid IAM role ARN; required for state machine execution permissions and service access
   **/
  readonly stateMachineExecutionRole: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch log group retention period in days for execution log management and compliance requirements. Defines how long execution logs are retained in CloudWatch with specific allowed values for log retention and compliance management.
   *
   * Use cases: Log retention management; Compliance requirements; Storage cost optimization; Audit trail management
   *
   * AWS: CloudWatch log group retention for Step Functions execution logs and audit trail management
   *
   * Validation: Must be 1,3,5,7,14,30,60,90,120,150,180,365,400,545,731,1827,3653, or 0 if provided; defaults to 731 days
   **/
  readonly logGroupRetentionDays?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required flag controlling execution data logging for Step Functions monitoring and debugging enabling detailed execution tracking and troubleshooting. When enabled, logs parameter values and execution data during state machine execution for monitoring and debugging capabilities.
   *
   * Use cases: Execution monitoring; Debugging support; Operational visibility; Troubleshooting assistance
   *
   * AWS: Step Functions execution data logging for monitoring and debugging capabilities
   *
   * Validation: Must be boolean value; required for execution data logging configuration and monitoring
   **/
  readonly logExecutionData: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required state machine definition as JSON object exported from Step Functions console enabling workflow logic specification and state transitions. Provides the complete state machine definition including states, transitions, and workflow logic for Step Functions execution.
   *
   * Use cases: Workflow definition; State transitions; Business logic; Process specification
   *
   * AWS: Step Functions state machine definition for workflow logic and state transitions
   *
   * Validation: Must be valid JSON object with state machine definition; required for workflow logic and execution
   *   **/
  readonly rawStepFunctionDef: { [key: string]: unknown };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CDK Nag suppressions array for compliance rule management enabling controlled security rule exceptions and compliance documentation. Provides structured approach to managing security rule suppressions with proper justification for compliance auditing and security review.
   *
   * Use cases: Compliance management; Security rule exceptions; Audit documentation; Controlled suppressions
   *
   * AWS: CDK Nag suppressions for Step Functions compliance rule management and security exception documentation
   *
   * Validation: Must be array of valid SuppressionProps if provided; enables structured compliance rule management
   **/
  readonly suppressions?: SuppressionProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EventBridge configuration for Step Functions integration enabling event-driven workflow triggering and external system integration. Provides EventBridge setup for triggering state machines based on events and integrating with external systems and services.
   *
   * Use cases: Event-driven workflows; External integration; Automated triggering; Event processing
   *
   * AWS: EventBridge integration for Step Functions event-driven workflow triggering and external integration
   *
   * Validation: Must be valid EventBridgeProps if provided; enables event-driven workflow triggering and integration
   **/
  readonly eventBridge?: EventBridgeProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CDK Nag suppression properties with structured compliance rule exception management. Defines suppression configuration for managing security rule exceptions with proper identification and justification for compliance auditing and security review processes.
 *
 * Use cases: Compliance rule exceptions; Security suppressions; Audit documentation; Structured exception management
 *
 * AWS: CDK Nag suppression configuration for compliance rule exception management and audit documentation
 *
 * Validation: id and reason are required for proper suppression identification and justification
 */
export interface SuppressionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required suppression rule ID for CDK Nag rule identification enabling specific security rule exception management. Provides the specific CDK Nag rule identifier that will be suppressed for targeted compliance rule exception handling.
   *
   * Use cases: Rule identification; Specific suppressions; Compliance management; Security rule exceptions
   *
   * AWS: CDK Nag rule ID for specific security rule suppression and compliance exception management
   *
   * Validation: Must be valid CDK Nag rule ID; required for specific rule suppression and compliance management
   **/
  readonly id: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required suppression justification reason for compliance documentation and audit trail enabling proper exception documentation and security review. Provides the business or technical justification for suppressing the security rule for compliance auditing and security review processes.
   *
   * Use cases: Exception justification; Compliance documentation; Audit trail; Security review support
   *
   * AWS: Suppression reason for CDK Nag rule exception justification and compliance documentation
   *
   * Validation: Must be descriptive justification text; required for proper exception documentation and audit trail
   **/
  readonly reason: string;
}

export interface StepFunctionL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for Step Functions integration and resource coordination enabling project-based resource organization and management. Provides the project identifier that coordinates Step Functions resources with other DataOps infrastructure and workflows.
   *
   * Use cases: Project coordination; Resource organization; DataOps integration; Project management
   *
   * AWS: DataOps project name for Step Functions resource coordination and project-based organization
   *
   * Validation: Must be valid project name; required for project coordination and resource organization
   **/
  readonly projectName?: string;
  readonly kmsArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Step Functions definitions for workflow orchestration deployment enabling state machine configuration and management. Provides state machine specifications including definitions, roles, logging, and EventBridge integration for DataOps workflow automation.
   *
   * Use cases: Workflow configuration; State machine deployment; Orchestration setup; Automation definition
   *
   * AWS: Step Functions definitions for workflow orchestration deployment and automation configuration
   *
   * Validation: Must be array of valid StepFunctionProps; required for Step Functions deployment and workflow configuration
   *   **/
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
