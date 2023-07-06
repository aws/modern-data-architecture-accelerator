/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefEventBus, CaefEventBusProps } from '@aws-caef/eventbridge-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
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

export interface EventBridgeL3ConstructProps extends CaefL3ConstructProps {
    readonly eventBuses?: NamedEventBusProps
}

export class EventBridgeL3Construct extends CaefL3Construct {
    protected readonly props: EventBridgeL3ConstructProps


    constructor( scope: Construct, id: string, props: EventBridgeL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        Object.entries( this.props.eventBuses || {} ).forEach( entry => {
            const eventBusName = entry[ 0 ]
            const eventBusProps = entry[ 1 ]

            const principals = eventBusProps.principals?.map( x => this.createPrincipalFromProps( x ) )

            const eventBusL2Props: CaefEventBusProps = {
                eventBusName: eventBusName,
                naming: this.props.naming,
                archiveRetention: eventBusProps.archiveRetention,
                principals: principals
            }
            new CaefEventBus( this, `${ eventBusName }-bus`, eventBusL2Props )
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
