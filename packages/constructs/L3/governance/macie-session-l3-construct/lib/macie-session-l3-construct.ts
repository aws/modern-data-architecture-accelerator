/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnSession } from "aws-cdk-lib/aws-macie";
import { Construct } from 'constructs';

export interface MacieSessionProps {
    readonly findingPublishingFrequency: SessionFindingPublishingFrequencyEnum,
    readonly status?: SessionStatusEnum
}

export interface MacieSessionL3ConstructProps extends MdaaL3ConstructProps {
    readonly session: MacieSessionProps
}

export enum SessionStatusEnum {
    ENABLED = "ENABLED",
    PAUSED = "PAUSED"
}

export enum SessionFindingPublishingFrequencyEnum {
    FIFTEEN_MINUTES = "FIFTEEN_MINUTES",
    ONE_HOUR = "ONE_HOUR",
    SIX_HOURS = "SIX_HOURS"
}

export class MacieSessionL3Construct extends MdaaL3Construct {
    protected readonly props: MacieSessionL3ConstructProps

    constructor( scope: Construct, id: string, props: MacieSessionL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        this.createSession("macie-session", this.props.session)
    }

    private createSession(resourceName: string, sessionProps: MacieSessionProps): CfnSession {
        console.log(`Creating Macie Session`)
        const session = new CfnSession(this, resourceName, {
            findingPublishingFrequency: sessionProps.findingPublishingFrequency,
            status: (sessionProps.status == undefined)? SessionStatusEnum.ENABLED: sessionProps.status
        })

        return session
    }
}
