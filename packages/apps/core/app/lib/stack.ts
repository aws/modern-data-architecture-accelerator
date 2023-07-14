/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRoleHelper } from "@aws-caef/iam-role-helper";
import { ICaefResourceNaming } from "@aws-caef/naming";
import { CfnParameter, Stack, StackProps } from "aws-cdk-lib";
import { ProductStack } from "aws-cdk-lib/aws-servicecatalog";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";


export interface CaefStackProps extends StackProps {
    naming: ICaefResourceNaming,
    useBootstrap: boolean
}

export interface CaefProductStackProps extends CaefStackProps {
    moduleName: string
}

export class CaefStack extends Stack {
    public props: CaefStackProps
    public readonly roleHelper: CaefRoleHelper
    constructor( scope: Construct, id: string, props: CaefStackProps ) {
        super( scope, id, props )
        this.props = props
        const iamHelperProviderServiceToken = this.props.useBootstrap ? StringParameter.valueForStringParameter( this, this.props.naming.ssmPath( `caef-bootstrap/role-helper-service-token`, false, false ) ) : undefined
        this.roleHelper = new CaefRoleHelper( this, this.props.naming, iamHelperProviderServiceToken )
    }
}

export class CaefProductStack extends ProductStack {
    public props: CaefStackProps
    public readonly roleHelper: CaefRoleHelper
    constructor( scope: Construct, id: string, props: CaefProductStackProps ) {
        super( scope, id )
        new CfnParameter( this, "PROVISIONEDID", {
            description: "A unique id for the deployed product instance.",
            allowedPattern: "\\w+",
            constraintDescription: "Should contain only alpha-numeric characters.",
            minLength: 2,
            maxLength: 64,
        } )
        this.props = {
            useBootstrap: props.useBootstrap,
            naming: props.naming.withModuleName( `${ props.moduleName }-__PROVISIONED_ID__` )
        }
        const iamHelperProviderServiceToken = this.props.useBootstrap ? StringParameter.valueForStringParameter( this, this.props.naming.ssmPath( `caef-bootstrap/role-helper-service-token`, false, false ) ) : undefined
        this.roleHelper = new CaefRoleHelper( this, this.props.naming, iamHelperProviderServiceToken )
    }
}
