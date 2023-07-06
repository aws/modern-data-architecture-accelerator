/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps } from "@aws-caef/construct";
import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";


/**
 * Interface for CAEF-specific L3 construct baseprops.
 */
export interface CaefL3ConstructProps extends CaefConstructProps {
    readonly roleHelper: CaefRoleHelper
    readonly crossAccountStacks?: { [ account: string ]: Stack }
}

/**
 * Base class for CAEF CDK L3 Constructs
 */
export abstract class CaefL3Construct extends Construct {

    protected readonly scope: Construct
    protected readonly baseprops: CaefL3ConstructProps

    constructor( scope: Construct, id: string, baseprops: CaefL3ConstructProps ) {
        super( scope, id )
        this.scope = scope
        this.baseprops = baseprops
    }

    protected getCrossAccountStack ( account: string ): Stack {
        if ( !this.baseprops.crossAccountStacks || !this.baseprops.crossAccountStacks[ account ] ) {
            throw new Error( `Cross account stack not available. Ensure module is configured with 'additional_accounts' containing '${ account }'` )
        }
        return this.baseprops.crossAccountStacks[ account ]
    }

    protected get partition (): string {
        return Stack.of( this ).partition
    }

    protected get account (): string {
        return Stack.of( this ).account
    }

    protected get region (): string {
        return Stack.of( this ).region
    }
}


