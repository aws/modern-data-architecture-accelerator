/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAspect } from "aws-cdk-lib";
import { CfnRole, Role } from "aws-cdk-lib/aws-iam";
import { CfnApplication } from "aws-cdk-lib/aws-sam";
import { IConstruct } from "constructs";

export class RolePermissionsBoundaryAspect implements IAspect {
    private readonly permissionsBoundaryArn: string;

    constructor( props: { [ key: string ]: any } ) {
        this.permissionsBoundaryArn = props.permissionsBoundaryArn;
    }

    public visit ( construct: IConstruct ): void {
        const node = construct as any
        if ( node.cfnResourceType == "AWS::IAM::Role" ) {
            const resource = node as CfnRole;
            console.log( `Applying PermissionsBoundary ${ this.permissionsBoundaryArn } to role ${ resource.roleName }` )
            resource.addPropertyOverride( 'PermissionsBoundary', this.permissionsBoundaryArn );
        }

    }
}