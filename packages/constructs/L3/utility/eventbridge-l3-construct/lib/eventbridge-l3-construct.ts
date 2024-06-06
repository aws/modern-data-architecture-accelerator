/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaEventBus, MdaaEventBusProps } from '@aws-mdaa/eventbridge-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { ArnPrincipal, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface EventBusPrincipalProps {
    readonly arn?: string,
    readonly service?: string
}

export interface EventBusProps {
    readonly principals?: EventBusPrincipalProps[]
    readonly archiveRetention?: number
}

export interface NamedEventBusProps {
    /** @jsii ignore */
    readonly [ name: string ]: EventBusProps
}

export interface EventBridgeL3ConstructProps extends MdaaL3ConstructProps {
    readonly eventBuses?: NamedEventBusProps
}

export class EventBridgeL3Construct extends MdaaL3Construct {
    protected readonly props: EventBridgeL3ConstructProps


    constructor( scope: Construct, id: string, props: EventBridgeL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        Object.entries( this.props.eventBuses || {} ).forEach( entry => {
            const eventBusName = entry[ 0 ]
            const eventBusProps = entry[ 1 ]

            const principals = eventBusProps.principals?.map( x => this.createPrincipalFromProps( x ) )

            const eventBusL2Props: MdaaEventBusProps = {
                eventBusName: eventBusName,
                naming: this.props.naming,
                archiveRetention: eventBusProps.archiveRetention,
                principals: principals
            }
            new MdaaEventBus( this, `${ eventBusName }-bus`, eventBusL2Props )
        } )
    }
    private createPrincipalFromProps ( principalProps: EventBusPrincipalProps ): any {
        if ( principalProps.arn && !principalProps.service ) {
            return new ArnPrincipal( principalProps.arn )
        } else if ( principalProps.service && !principalProps.arn ) {
            return new ServicePrincipal( principalProps.service )
        } else {
            throw new Error( "Principal must have exactly one of arn or service defined." )
        }
    }


}
