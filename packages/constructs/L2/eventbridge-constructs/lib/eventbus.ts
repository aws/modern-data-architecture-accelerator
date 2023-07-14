/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from "@aws-caef/construct";
import { Duration, Stack } from "aws-cdk-lib";
import { EventBus, EventBusProps, IEventBus } from "aws-cdk-lib/aws-events";
import { Effect, PolicyStatement, PrincipalBase } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface CaefEventBusProps extends CaefConstructProps {
    /**
    * Unique name that defines the event bus
    */
    readonly eventBusName: string;
    /**
    * The retention of events
    */
    readonly archiveRetention?: number;
    /**
     * Principals which will be granted PutEvent access via the Event Bus resource policy
     */
    readonly principals?: PrincipalBase[]
}

/**
 * Interface for ICaefEventBus.
 */
export interface ICaefEventBus extends IEventBus {

}

/**
 * Construct for a compliant CloudWatch Log Group
 */
export class CaefEventBus extends EventBus implements ICaefEventBus {

    private static setProps ( props: CaefEventBusProps ): EventBusProps {

        const overrideProps = {
            eventBusName: props.naming.resourceName( props.eventBusName, 48 )
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: CaefEventBusProps ) {
        super( scope, id, CaefEventBus.setProps( props ) );

        if ( props.archiveRetention ) {
            this.archive( `archive`, {
                archiveName: props.naming.resourceName( `${ props.eventBusName }-archive`, 48 ),
                description: `Archive for ${ this.eventBusName }`,
                eventPattern: {
                    account: [ Stack.of( this ).account ],
                },
                retention: Duration.days( props.archiveRetention ),
            } );
        }

        if ( props.principals && props.principals.length > 0 ) {
            const policyStatement = new PolicyStatement( {
                sid: 'allow_put_events',
                principals: props.principals,
                actions: [ 'events:PutEvents' ],
                effect: Effect.ALLOW,
                resources: [ this.eventBusArn ],
            } );

            this.addToResourcePolicy( policyStatement );
        }
        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "eventbus",
                resourceId: props.eventBusName,
                name: "name",
                value: this.eventBusName
            }, ...props
        } )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "eventbus",
                resourceId: props.eventBusName,
                name: "arn",
                value: this.eventBusArn
            }, ...props
        } )

    }
}
