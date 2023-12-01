/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAspect } from "aws-cdk-lib";

import { IConstruct } from "constructs";

export class SampleCustomAspect implements IAspect {

    constructor( _props: { [ key: string ]: any } ) {

    }

    public visit ( _construct: IConstruct ): void {
    }

}