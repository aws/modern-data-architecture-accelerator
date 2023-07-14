/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { AgentProps, AgentWithNameProps, LocationNfsProps, LocationObjectStorageProps, LocationS3Props, LocationsByTypeWithNameProps, LocationSmbProps, TaskProps, TaskWithNameProps, VpcProps } from '@aws-caef/datasync-l3-construct';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';


import * as configSchema from './config-schema.json';

export interface LocationsByTypeConfig {
    readonly s3?: { [ name: string ]: LocationS3Props }
    readonly smb?: { [ name: string ]: LocationSmbProps }
    readonly nfs?: { [ name: string ]: LocationNfsProps }
    readonly objectStorage?: { [ name: string ]: LocationObjectStorageProps }
}

export interface DataSyncConfigContents extends CaefBaseConfigContents {
    readonly vpc?: VpcProps
    readonly agents?: { [ name: string ]: AgentProps }
    readonly locations?: LocationsByTypeConfig
    readonly tasks?: { [ name: string ]: TaskProps }
}

export class DataSyncConfigParser extends CaefAppConfigParser<DataSyncConfigContents> {
    public readonly vpc?: VpcProps
    public readonly agents?: AgentWithNameProps[]
    public readonly locations?: LocationsByTypeWithNameProps
    public readonly tasks?: TaskWithNameProps[]

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.vpc = this.configContents.vpc
        this.agents = Object.entries( this.configContents.agents || {} ).map( x => {
            return {
                agentName: x[ 0 ],
                ...x[ 1 ]
            }
        } )

        this.locations = {
            s3: Object.entries( this.configContents.locations?.s3 || {} ).map( x => { return { locationName: x[ 0 ], ...x[ 1 ] } } ),
            smb: Object.entries( this.configContents.locations?.smb || {} ).map( x => { return { locationName: x[ 0 ], ...x[ 1 ] } } ),
            nfs: Object.entries( this.configContents.locations?.nfs || {} ).map( x => { return { locationName: x[ 0 ], ...x[ 1 ] } } ),
            objectStorage: Object.entries( this.configContents.locations?.objectStorage || {} ).map( x => { return { locationName: x[ 0 ], ...x[ 1 ] } } )
        }

        this.tasks = Object.entries( this.configContents.tasks || {} ).map( x => {
            return {
                name: x[ 0 ],
                ...x[ 1 ]
            }
        } )
    }
}

