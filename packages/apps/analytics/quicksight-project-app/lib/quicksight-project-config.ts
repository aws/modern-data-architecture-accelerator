/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { DataSourceProps, DataSourceWithIdAndTypeProps, SharedFoldersProps } from '@aws-mdaa/quicksight-project-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface QuickSightProjectConfigContents extends MdaaBaseConfigContents {
    /**
     *(Optional) Details about the Data Sources to be created
    */
    dataSources?: { [ key: string ]: { [ key: string ]: DataSourceProps } };
    /**
     * (Required) QS API Actions
     */
    principals: { [ key: string ]: string }

    /**
     * (Optional) QS Shared Folders
     */
    sharedFolders?: { [ key: string ]: SharedFoldersProps }
}

export class QuickSightProjectConfigParser extends MdaaAppConfigParser<QuickSightProjectConfigContents> {
    public readonly principals: { [ key: string ]: string }
    public readonly sharedFolders: { [ key: string ]: SharedFoldersProps }
    public readonly dataSources: DataSourceWithIdAndTypeProps[]
    constructor( scope: Stack, props: MdaaAppConfigParserProps ) {
        super( scope, props, configSchema as Schema )
        const dataSourceArr: DataSourceWithIdAndTypeProps[] = []
        Object.entries( this.configContents.dataSources || {} ).forEach( dataSourceIdAndTypeProps => {
            return Object.entries( dataSourceIdAndTypeProps[ 1 ] ).forEach( dataSourceIdProps => {
                dataSourceArr.push( { type: dataSourceIdAndTypeProps[ 0 ], dataSourceId: dataSourceIdProps[ 0 ], ...dataSourceIdProps[ 1 ] } )
            } )
        } )
        this.dataSources = dataSourceArr
        this.principals = this.configContents.principals
        this.sharedFolders = this.configContents.sharedFolders ? this.configContents.sharedFolders : {}
    }
}