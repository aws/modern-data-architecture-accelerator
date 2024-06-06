/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from "@aws-mdaa/iam-role-helper";
import { IMdaaResourceNaming } from "@aws-mdaa/naming";
import { CfnParameter, Stack, StackProps } from "aws-cdk-lib";
import { ProductStack } from "aws-cdk-lib/aws-servicecatalog";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";


export interface MdaaStackProps extends StackProps {
    naming: IMdaaResourceNaming,
    useBootstrap: boolean
}

export interface MdaaProductStackProps extends MdaaStackProps {
    moduleName: string
}

export class MdaaStack extends Stack {
    public props: MdaaStackProps
    public readonly roleHelper: MdaaRoleHelper
    constructor( scope: Construct, id: string, props: MdaaStackProps ) {
        super( scope, id, props )
        this.props = props
        const iamHelperProviderServiceToken = this.props.useBootstrap ? StringParameter.valueForStringParameter( this, this.props.naming.ssmPath( `caef-bootstrap/role-helper-service-token`, false, false ) ) : undefined
        this.roleHelper = new MdaaRoleHelper( this, this.props.naming, iamHelperProviderServiceToken )
    }
}

export class MdaaProductStack extends ProductStack {
    public props: MdaaStackProps
    public readonly roleHelper: MdaaRoleHelper
    constructor( scope: Construct, id: string, props: MdaaProductStackProps ) {
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
        this.roleHelper = new MdaaRoleHelper( this, this.props.naming, iamHelperProviderServiceToken )
    }
}
