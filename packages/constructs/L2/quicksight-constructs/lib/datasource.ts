/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { CfnDataSource, CfnDataSourceProps } from 'aws-cdk-lib/aws-quicksight';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
export interface MdaaQuickSightDataSourceProps extends MdaaConstructProps {
  /** Alternate data source parameters for credential sharing and data source copying enabling */
  readonly alternateDataSourceParameters?:
    | Array<CfnDataSource.DataSourceParametersProperty | cdk.IResolvable>
    | cdk.IResolvable;
  /** AWS account ID specification for cross-account data source access enabling multi-account */
  readonly awsAccountId?: string;
  /** Credentials configuration for secure data source authentication enabling */
  readonly credentials?: CfnDataSource.DataSourceCredentialsProperty | cdk.IResolvable;
  readonly dataSourceId?: string;
  readonly dataSourceParameters?: CfnDataSource.DataSourceParametersProperty | cdk.IResolvable;
  /** Error information for data source troubleshooting and monitoring enabling error tracking */
  readonly errorInfo?: CfnDataSource.DataSourceErrorInfoProperty | cdk.IResolvable;
  /** Display name for data source identification and user interface presentation enabling */
  readonly name?: string;
  /** Resource permissions array for data source access control enabling fine-grained access */
  readonly permissions?: Array<CfnDataSource.ResourcePermissionProperty | cdk.IResolvable> | cdk.IResolvable;
  readonly tags?: cdk.CfnTag[];
  /** Data source type specification controlling connectivity protocols and data source */
  readonly type: string;
  /** VPC connection properties for secure network connectivity enabling private network access */
  readonly vpcConnectionProperties?: CfnDataSource.VpcConnectionPropertiesProperty | cdk.IResolvable;
}

/**
 * A construct for the creation of a compliance QuickSight DataSource.
 * Specifically, the following parameters are enforced:
 * * sslProperties ; disableSsl is forced to be false
 * All other parameters will be passed through.
 */
export class MdaaQuickSightDataSource extends CfnDataSource {
  private static setProps(props: MdaaQuickSightDataSourceProps): CfnDataSourceProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
      /** SSL configuration for secure data source connections */
      sslProperties: {
        disableSsl: false,
      },
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaQuickSightDataSourceProps) {
    super(scope, id, MdaaQuickSightDataSource.setProps(props));
  }
}
