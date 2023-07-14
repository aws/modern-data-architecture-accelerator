/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefCdkApp } from '@aws-caef/app';
import { CaefRoleHelper } from '@aws-caef/iam-role-helper';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { ICaefResourceNaming } from '@aws-caef/naming';
import { AppProps, Stack } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';


export class CaefBootstrapCDKApp extends CaefCdkApp {
    constructor( props?: AppProps ) {
        super( "bootstrap", { ...props, ...{ useBootstrap: false } } )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps ) {
        this.createRoleHelperResources( stack, l3ConstructProps.naming )
    }

    private createRoleHelperResources ( stack: Stack, naming: ICaefResourceNaming ) {
        const roleHelper = new CaefRoleHelper( stack, naming )
        const serviceToken = roleHelper.createProviderServiceToken()
        new StringParameter( stack, `role-helper-service-token-param`, {
            parameterName: naming.ssmPath( `role-helper-service-token`, true, false ),
            stringValue: serviceToken
        } )
    }
}
