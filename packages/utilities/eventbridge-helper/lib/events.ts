/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICaefResourceNaming } from "@aws-caef/naming";
import { CaefSqsDeadLetterQueue } from "@aws-caef/sqs-constructs";
import { EventBus, EventPattern, IRuleTarget, Rule } from "aws-cdk-lib/aws-events";
import { Effect, IRole, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface NamedS3EventBridgeRuleProps {
    /**
     * Named S3 event rules
     */
    readonly [ name: string ]: S3EventBridgeRuleProps
}

export interface S3EventBridgeRuleProps {
    /**
     * Name of the buckets on which to match
     */
    readonly buckets: string[],
    /**
     * Object key prefixes on which to match
     */
    readonly prefixes?: string[]
    /**
     * If specified, rule will be created against this event bus.
     * If not specified, default event bus will be used.
     */
    readonly eventBusArn?: string
}

export interface NamedEventBridgeRuleProps {
    /**
     * Named event rules
     */
    readonly [ name: string ]: EventBridgeRuleProps
}

export interface EventBridgeRuleProps {
    /**
     * Description of the rule
     */
    readonly description?: string
    /**
     * The Event Pattern to be passed to the rule
     */
    readonly eventPattern?: EventPattern
    /**
     * If specified, rule will be created against this event bus.
     * If not specified, default event bus will be used.
     */
    readonly eventBusArn?: string

}

export interface EventBridgeProps extends EventBridgeRetryProps {
    /**
     * List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications
     */
    readonly s3EventBridgeRules?: NamedS3EventBridgeRuleProps
    /**
     * List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications
     */
    readonly eventBridgeRules?: NamedEventBridgeRuleProps
}

export interface EventBridgeRetryProps {
    /**
     * The maximum age of a request that EventBridge sends to target
     *
     * Minimum value of 60.
     * Maximum value of 86400.
     *
     * @default 86400 (24 hours)
     */
    readonly maxEventAgeSeconds?: number;
    /**
     * The maximum number of times to retry when the target returns an error.
     *
     * Minimum value of 0.
     * Maximum value of 185.
     *
     * @default 185
     */
    readonly retryAttempts?: number;
}

export interface EventRoleAndPolicy { readonly role: IRole, readonly policy: ManagedPolicy }

export class EventBridgeHelper {

    public static createGlueMonitoringEventRule ( scope: Construct, naming: ICaefResourceNaming, ruleName: string, description: string, detail: { [ key: string ]: any } ): Rule {
        const eventPattern = {
            source: [ "aws.glue" ],
            detail: detail
        }
        const eventRule = this.createEventRule( scope, naming, ruleName, { description, eventPattern } )
        return eventRule
    }

    public static createEventRulePropsFromS3EventRuleProps ( targetName: string, s3EventRuleProps: S3EventBridgeRuleProps ): EventBridgeRuleProps {

        const detail: { [ key: string ]: any } = {
            "bucket": {
                "name": s3EventRuleProps.buckets
            }
        }

        if ( s3EventRuleProps.prefixes ) {
            detail[ 'object' ] = {
                key: s3EventRuleProps.prefixes.map( rawPrefix => {
                    const prefix = rawPrefix.startsWith( '/' ) ? rawPrefix.substring( 1 ) : rawPrefix;
                    return { prefix: prefix }
                } )
            }
        }

        const eventPattern = {
            source: [ "aws.s3" ],
            detail: detail,
            "detail-type": [ "Object Created" ]
        }

        return {
            description: `Event Rule for triggering ${ targetName } with S3 events`,
            eventPattern: eventPattern,
            eventBusArn: s3EventRuleProps.eventBusArn
        }
    }

    public static createEventBridgeRulesForTarget (
        scope: Construct,
        naming: ICaefResourceNaming,
        targetName: string,
        target: IRuleTarget,
        eventBridgeProps: EventBridgeProps ) {

        const s3EventBridgeRuleProps: NamedEventBridgeRuleProps = Object.fromEntries( Object.entries( eventBridgeProps.s3EventBridgeRules || {} ).map( entry => {
            const eventRuleName = entry[ 0 ]
            const eventBridgeProps = EventBridgeHelper.createEventRulePropsFromS3EventRuleProps( `${ targetName }-${ eventRuleName }`, entry[ 1 ] )
            return [ eventRuleName, eventBridgeProps ]
        } ) )

        const namedEventBridgeRuleProps = {
            ...eventBridgeProps.eventBridgeRules,
            ...s3EventBridgeRuleProps
        }

        return Object.entries( namedEventBridgeRuleProps ).map( entry => {
            const eventRuleName = entry[ 0 ]
            const eventRuleProps = entry[ 1 ]
            const eventRule = EventBridgeHelper.createEventRule( scope, naming, eventRuleName, eventRuleProps )
            eventRule.addTarget( target );
            return eventRule
        } )
    }



    public static createEventRule ( scope: Construct, naming: ICaefResourceNaming, ruleName: string, ruleProps: EventBridgeRuleProps ): Rule {

        const eventRule = new Rule( scope, `event-rule-${ ruleName }`, {
            enabled: true,
            description: ruleProps.description,
            ruleName: naming.resourceName( ruleName, 64 ),
            eventPattern: ruleProps.eventPattern,
            eventBus: ruleProps.eventBusArn ? EventBus.fromEventBusArn( scope, `event-rule-${ ruleName }-bus`, ruleProps.eventBusArn ) : undefined
        } );
        return eventRule
    }

    public static createDlq ( scope: Construct, naming: ICaefResourceNaming, name: string, kmsKey: IKey, role?: IRole ): IQueue {

        const dlq = new CaefSqsDeadLetterQueue( scope, `dlq-${ name }`, {
            queueName: `${ name }-dlq`,
            encryptionMasterKey: kmsKey,
            naming: naming
        } )
        if ( role ) {
            const sqsSendMessageStatement = new PolicyStatement( {
                sid: "SendMessage",
                effect: Effect.ALLOW,
                actions: [ "sqs:SendMessage" ],
                resources: [ "*" ]
            } )
            sqsSendMessageStatement.addPrincipals( role )
            dlq.addToResourcePolicy( sqsSendMessageStatement )
        }
        return dlq
    }
}