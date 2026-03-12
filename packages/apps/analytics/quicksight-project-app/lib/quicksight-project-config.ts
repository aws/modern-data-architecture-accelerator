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
   * Nested map of data source type to data source configurations for QuickSight project data connectivity.
   * Outer key is the data source type (e.g., REDSHIFT, ATHENA), inner key is a unique data source ID.
   * Supports credential pairs, secret ARN references, VPC connections, and SSL configuration.
   *
   * Use cases: Redshift data source setup; Athena connectivity; Multi-source BI integration
   *
   * AWS: QuickSight data sources with credentials, VPC connections, and type-specific parameters
   *
   * Validation: Optional; nested map of type → ID → DataSourceProps
   */
  readonly dataSources?: { [key: string]: { [key: string]: DataSourceProps } };
  /**
   * Named QuickSight principals (users or groups) referenced in folder and data source permissions.
   * Each key is a logical name, value is the QuickSight principal ARN.
   *
   * Use cases: Principal-based access control; Group permission assignment; User management
   *
   * AWS: QuickSight user/group ARNs for permission assignment
   *
   * Validation: Required; map of string keys to QuickSight principal ARNs
   */
  readonly principals: { [key: string]: string };

  /**
   * Named shared folder configurations for collaborative QuickSight workspace management.
   * Each folder supports hierarchical sub-folders and principal-based permissions
   * (READER_FOLDER or AUTHOR_FOLDER actions).
   *
   * Use cases: Team-based BI workspaces; Dev/test/prod folder separation; Asset organization
   *
   * AWS: QuickSight shared folders with hierarchical structure and permission management
   *
   * Validation: Optional; map of string keys to SharedFoldersProps
   */
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
