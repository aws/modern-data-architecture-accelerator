/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from "@aws-caef/app";
import { CaefConfigTransformer, ICaefConfigTransformer, ICaefConfigValueTransformer } from "@aws-caef/config";
import { ICaefResourceNaming } from "@aws-caef/naming";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";


export interface CaefDataOpsConfigContents extends CaefBaseConfigContents {
    readonly securityConfigurationName: string
    readonly projectName: string
    readonly projectBucket: string
    readonly projectTopicArn: string
    readonly deploymentRole: string
    readonly kmsArn: string
}

export class CaefDataOpsConfigParser<T extends CaefDataOpsConfigContents> extends CaefAppConfigParser<T> {
    public readonly securityConfigurationName: string
    public readonly projectName: string
    public readonly projectBucket: string
    public readonly projectTopicArn: string
    public readonly deploymentRole: string
    public readonly kmsArn: string

    constructor( stack: Stack, props: CaefAppConfigParserProps, configSchema: Schema ) {
        super( stack, props, configSchema, [ new ProjectConfigTransformer( props.naming ) ] )
        this.securityConfigurationName = this.configContents.securityConfigurationName
        this.projectName = this.configContents.projectName
        this.projectBucket = this.configContents.projectBucket
        this.projectTopicArn = this.configContents.projectTopicArn
        this.deploymentRole = this.configContents.deploymentRole
        this.kmsArn = this.configContents.kmsArn
    }

}

class ProjectConfigTransformer implements ICaefConfigTransformer {
    private readonly naming: ICaefResourceNaming;
    constructor( naming: ICaefResourceNaming ) {
        this.naming = naming
    }
    public transformConfig ( config: { [ key: string ]: any; } ): { [ key: string ]: any; } {
        const projectName = config[ 'projectName' ]
        const moddedConfig = config
        moddedConfig[ "securityConfigurationName" ] = moddedConfig[ "securityConfigurationName" ] ? moddedConfig[ "securityConfigurationName" ] : "project:securityConfiguration/default"
        moddedConfig[ "projectBucket" ] = moddedConfig[ "projectBucket" ] ? moddedConfig[ "projectBucket" ] : "project:projectBucket/default"
        moddedConfig[ "projectTopicArn" ] = moddedConfig[ "projectTopicArn" ] ? moddedConfig[ "projectTopicArn" ] : "project:projectTopicArn/default"
        moddedConfig[ "deploymentRole" ] = moddedConfig[ "deploymentRole" ] ? moddedConfig[ "deploymentRole" ] : "project:deploymentRole/default"
        moddedConfig[ "kmsArn" ] = moddedConfig[ "kmsArn" ] ? moddedConfig[ "kmsArn" ] : "project:kmsArn/default"

        const projectConfigValTransformer = new ProjectConfigValueTransformer( projectName, this.naming )
        return new CaefConfigTransformer( projectConfigValTransformer ).transformConfig( moddedConfig )
    }
}

class ProjectConfigValueTransformer implements ICaefConfigValueTransformer {
    private readonly projectName: string;
    private readonly naming: ICaefResourceNaming;
    constructor( projectName: string, naming: ICaefResourceNaming ) {
        this.projectName = projectName
        this.naming = naming
    }
    public transformValue ( value: string ): string {
        if ( value.startsWith( "project:" ) ) {
            return "ssm:" + this.naming.ssmPath( `${ this.projectName }/${ value.split( ":" )[ 1 ] }`, false, false )
        } else {
            return value
        }
    }
}

