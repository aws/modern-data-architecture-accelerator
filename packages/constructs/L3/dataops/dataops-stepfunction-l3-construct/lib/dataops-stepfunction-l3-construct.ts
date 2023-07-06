/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefLogGroup } from '@aws-caef/cloudwatch-constructs';
import { DataOpsProjectUtils } from '@aws-caef/dataops-project-l3-construct';
import { EventBridgeHelper, EventBridgeProps } from '@aws-caef/eventbridge-helper';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { aws_events_targets, Duration } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnStateMachine, IStateMachine, LogLevel, StateMachine, StateMachineProps, StateMachineType, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface StepFunctionProps {
    /**
     * StepFunction defintion exported as JSON from Step Functions console
     */
    readonly stateMachineName: string
    /**
     * StepFunction type STANDARD or EXPRESS
     */
    readonly stateMachineType: string
    /**
     * StepFunction defintion exported as JSON from Step Functions console
     */
    readonly stateMachineExecutionRole: string
    /**
     * Optional. Number of days the Logs will be retained in Cloudwatch. 
     * For allowed values, refer https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html
     * Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653, and 0. 
     * If you specify 0, the events in the log group are always retained and never expire.
     * Default, if property not specified, is 731 days.
     */
    readonly logGroupRetentionDays?: number
    /**
     * Logs parameter values and other execution data used during step function execution
     */
    readonly logExecutionData: boolean
    /**
     * StepFunction defintion exported as JSON from Step Functions console
     */
    readonly rawStepFunctionDef: { [ key: string ]: any }
    /**
     * CDK Nag suppressions if policyDocument generates Nags.
     */
    readonly suppressions?: SuppressionProps[]
    /**
     * EventBridge props
     */
    readonly eventBridge?: EventBridgeProps
}

export interface SuppressionProps {
    readonly id: string
    readonly reason: string
}

export interface StepFunctionL3ConstructProps extends CaefL3ConstructProps {
    /**
     * Dataops project name.
     */
    readonly projectName: string
    /**
 * Dataops project KMS key ARN.
 */
    readonly projectKMSArn: string
    /**
     * The StepFunction Definition.
     */
    readonly stepfunctionDefinitions: StepFunctionProps[];
}


export class StepFunctionL3Construct extends CaefL3Construct {
    protected readonly props: StepFunctionL3ConstructProps


    private readonly projectKmsKey: IKey;

    constructor( scope: Construct, id: string, props: StepFunctionL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        this.projectKmsKey = Key.fromKeyArn( this, this.props.projectName, this.props.projectKMSArn )

        // Build our stepfunctions!
        this.props.stepfunctionDefinitions?.map( stepfunctionDefinition => {
            const stepfunctionName: string = stepfunctionDefinition.stateMachineName

            const logGroup = this.createLogGroup( stepfunctionDefinition )
            if ( stepfunctionDefinition.suppressions ) {
                NagSuppressions.addResourceSuppressions( logGroup, stepfunctionDefinition.suppressions )
            }

            const stepfunction = this.createStepFunctionFromDefinition( stepfunctionDefinition, logGroup )
            if ( stepfunction.stateMachineName ) {
                DataOpsProjectUtils.createProjectSSMParam( this.scope, this.props.naming, this.props.projectName, `stepfunction/name/${ stepfunctionName }`, stepfunction.stateMachineName )
            }

            return stepfunction
        } )
    }

    private createLogGroup ( stepfunctionProps: StepFunctionProps ): LogGroup {


        let logGroupRetentionDays: RetentionDays

        if ( stepfunctionProps.logGroupRetentionDays != undefined ) {
            if ( stepfunctionProps.logGroupRetentionDays != 0 ) {
                logGroupRetentionDays = stepfunctionProps.logGroupRetentionDays
            }
            else {
                logGroupRetentionDays = RetentionDays.INFINITE
            }
        }
        else {
            logGroupRetentionDays = RetentionDays.TWO_YEARS
        }

        const logGroup: LogGroup = new CaefLogGroup( this, `${ stepfunctionProps.stateMachineName }-loggroup`, {
            naming: this.props.naming,
            logGroupName: stepfunctionProps.stateMachineName,
            logGroupNamePathPrefix: `/aws/stepfunction/`,
            encryptionKey: this.projectKmsKey,
            retention: logGroupRetentionDays
        } )

        return logGroup
    }

    private createStepFunctionFromDefinition ( stepfunctionProps: StepFunctionProps, logGroup: LogGroup ): StateMachine {
        const stepfunctionName: string = stepfunctionProps.stateMachineName

        const role = Role.fromRoleArn( this.scope, `${ stepfunctionName }-role`, stepfunctionProps.stateMachineExecutionRole )
        const stepFunctionProps: StateMachineProps = {
            role: role,
            stateMachineType: <StateMachineType>stepfunctionProps.stateMachineType,
            stateMachineName: this.props.naming.resourceName( stepfunctionName ),
            tracingEnabled: true,
            logs: {
                destination: logGroup,
                includeExecutionData: stepfunctionProps.logExecutionData,
                level: LogLevel.ALL
            },
            //Initially create the state machine with a placeholder definition, which we will
            //replace with the definition string using a property override.
            definition: new Wait( this.scope, 'placeholder', { time: WaitTime.duration( Duration.seconds( 1 ) ) } )
        }
        const stepFunction = new StateMachine( this.scope, `stepfunction-${ stepfunctionName }`, stepFunctionProps )

        //L2 construct adds inline policies to role automatically, but these should be added elsewhere.
        role.node.tryRemoveChild( "Policy" )

        //Inject the definition string using a property override. This allows
        //the definition Json (from CLI/Console) to be directly pasted
        const cfnStateMachine = stepFunction.node.defaultChild as CfnStateMachine
        cfnStateMachine.addPropertyOverride( "DefinitionString", JSON.stringify( stepfunctionProps.rawStepFunctionDef ) )
        if ( stepfunctionProps.eventBridge ) {
            this.createStepFunctionEventBridgeRules( stepfunctionProps.eventBridge, stepfunctionName, stepFunction )
        }

        return stepFunction
    }

    private createStepFunctionEventBridgeRules ( eventBridgeProps: EventBridgeProps, functionName: string, stepFunction: IStateMachine ) {

        const dlq = EventBridgeHelper.createDlq( this.scope, this.props.naming, `${ functionName }-events`, this.projectKmsKey )

        const target = new aws_events_targets.SfnStateMachine( stepFunction, {
            deadLetterQueue: dlq,
            retryAttempts: eventBridgeProps.retryAttempts,
            maxEventAge: eventBridgeProps.maxEventAgeSeconds ? Duration.seconds( eventBridgeProps.maxEventAgeSeconds ) : undefined
        } )

        EventBridgeHelper.createEventBridgeRulesForTarget( this.scope, this.props.naming, functionName, target, eventBridgeProps )

        NagSuppressions.addResourceSuppressions(
            stepFunction,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is specific to invocation of this step function. Inline policy is appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Role is specific to invocation of this step function. Inline policy is appropriate.' },
            ],
            true
        );

    }
}
