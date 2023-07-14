/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICaefResourceNaming } from "@aws-caef/naming";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class DataOpsProjectUtils {
    public static createProjectSSMParam ( scope: Construct, naming: ICaefResourceNaming, projectName: string, key: string, value: string ) {
        const ssmPath = naming.ssmPath( `${ projectName }/${ key }`, false, false )
        console.log( `Creating Project SSM Param: ${ ssmPath }` )
        new StringParameter( scope, `${ projectName }/${ key }`, {
            parameterName: ssmPath,
            stringValue: value
        } )
    }
}