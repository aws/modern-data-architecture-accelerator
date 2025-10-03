/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  DataSourceProps,
  DataSourceWithIdAndTypeProps,
  SharedFoldersProps,
} from '@aws-mdaa/quicksight-project-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface QuickSightProjectConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional nested map of data source types to data source configurations enabling data connectivity for QuickSight projects. Provides flexible data source setup with support for multiple data source types and configurations for business intelligence operations.
   *
   * Use cases: Data source connectivity; Multi-source data integration; Flexible data connection management
   *
   * AWS: Amazon QuickSight data sources for data connectivity and integration
   *
   * Validation: Must be nested object with string keys and valid DataSourceProps values if provided; enables data connectivity
   *   **/
  readonly dataSources?: { [key: string]: { [key: string]: DataSourceProps } };
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of principal names to principal identifiers enabling access control and permission management for QuickSight projects. Defines all principals who will have access to the project resources and capabilities for controlled business intelligence operations.
   *
   * Use cases: Access control; Principal management; Permission assignment for QuickSight project resources
   *
   * AWS: Amazon QuickSight principal configuration for project access control and permission management
   *
   * Validation: Must be object with string keys and valid principal identifier values; required; defines project access control
   *   **/
  readonly principals: { [key: string]: string };

  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of shared folder names to shared folder configurations enabling collaborative workspace management within QuickSight projects. Provides organized, shared workspace areas for collaborative business intelligence development and asset sharing.
   *
   * Use cases: Collaborative workspaces; Shared asset management; Organized project resource sharing
   *
   * AWS: Amazon QuickSight shared folders for collaborative workspace and asset management
   *
   * Validation: Must be object with string keys and valid SharedFoldersProps values if provided; enables collaborative workspaces
   *   **/
  readonly sharedFolders?: { [key: string]: SharedFoldersProps };
}

export class QuickSightProjectConfigParser extends MdaaAppConfigParser<QuickSightProjectConfigContents> {
  public readonly principals: { [key: string]: string };
  public readonly sharedFolders: { [key: string]: SharedFoldersProps };
  public readonly dataSources: DataSourceWithIdAndTypeProps[];
  constructor(scope: Stack, props: MdaaAppConfigParserProps) {
    super(scope, props, configSchema as Schema);
    const dataSourceArr: DataSourceWithIdAndTypeProps[] = [];
    Object.entries(this.configContents.dataSources || {}).forEach(dataSourceIdAndTypeProps => {
      return Object.entries(dataSourceIdAndTypeProps[1]).forEach(dataSourceIdProps => {
        dataSourceArr.push({
          type: dataSourceIdAndTypeProps[0],
          dataSourceId: dataSourceIdProps[0],
          ...dataSourceIdProps[1],
        });
      });
    });
    this.dataSources = dataSourceArr;
    this.principals = this.configContents.principals;
    this.sharedFolders = this.configContents.sharedFolders ? this.configContents.sharedFolders : {};
  }
}
