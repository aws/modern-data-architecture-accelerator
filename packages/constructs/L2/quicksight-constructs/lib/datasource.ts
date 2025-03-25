/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CfnDataSource, CfnDataSourceProps } from 'aws-cdk-lib/aws-quicksight';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
/** Props for the creation of a compliant Quicksight DataSource */
export interface MdaaQuickSightDataSourceProps extends MdaaConstructProps {
  /**
   * A set of alternate data source parameters that you want to share for the credentials stored with this data source. The credentials are applied in tandem with the data source parameters when you copy a data source by using a create or update request. The API operation compares the `DataSourceParameters` structure that's in the request with the structures in the `AlternateDataSourceParameters` allow list. If the structures are an exact match, the request is allowed to use the credentials from this existing data source. If the `AlternateDataSourceParameters` list is null, the `Credentials` originally used with this `DataSourceParameters` are automatically allowed.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-alternatedatasourceparameters
   */
  readonly alternateDataSourceParameters?:
    | Array<CfnDataSource.DataSourceParametersProperty | cdk.IResolvable>
    | cdk.IResolvable;
  /**
   * The AWS account ID.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-awsaccountid
   */
  readonly awsAccountId?: string;
  /**
   * The credentials Amazon QuickSight that uses to connect to your underlying source. Currently, only credentials based on user name and password are supported.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-credentials
   */
  readonly credentials?: CfnDataSource.DataSourceCredentialsProperty | cdk.IResolvable;
  /**
   * An ID for the data source. This ID is unique per AWS Region for each AWS account.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-datasourceid
   */
  readonly dataSourceId?: string;
  /**
   * The parameters that Amazon QuickSight uses to connect to your underlying source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-datasourceparameters
   */
  readonly dataSourceParameters?: CfnDataSource.DataSourceParametersProperty | cdk.IResolvable;
  /**
   * Error information from the last update or the creation of the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-errorinfo
   */
  readonly errorInfo?: CfnDataSource.DataSourceErrorInfoProperty | cdk.IResolvable;
  /**
   * A display name for the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-name
   */
  readonly name?: string;
  /**
   * A list of resource permissions on the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-permissions
   */
  readonly permissions?: Array<CfnDataSource.ResourcePermissionProperty | cdk.IResolvable> | cdk.IResolvable;
  /**
   * Contains a map of the key-value pairs for the resource tag or tags assigned to the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-tags
   */
  readonly tags?: cdk.CfnTag[];
  /**
   * The type of the data source. To return a list of all data sources, use `ListDataSources` .
   *
   * Use `AMAZON_ELASTICSEARCH` for Amazon OpenSearch Service.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-type
   */
  readonly type: string;
  /**
   * Use this parameter only when you want Amazon QuickSight to use a VPC connection when connecting to your underlying source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-vpcconnectionproperties
   */
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
