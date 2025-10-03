/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnDataset, CfnDatasetProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a Mdaa Databrew Dataset
 */
export interface MdaaDataBrewDatasetProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the DataBrew dataset enabling dataset identification and management. Provides the dataset identifier for DataBrew operations and serves as the primary reference for data preparation and transformation workflows.
   *
   * Use cases: Dataset identification; Data preparation; Transformation workflows; Dataset management
   *
   * AWS: AWS Glue DataBrew dataset name for identification and data operations
   *
   * Validation: Must be unique dataset name string; required for dataset creation and identification
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required input configuration defining data source location and access parameters for DataBrew dataset operations. Specifies how DataBrew can locate and access the dataset from AWS Glue Data Catalog or Amazon S3 for data preparation workflows.
   *
   * Use cases: Data source configuration; S3 integration; Glue Catalog integration; Data access
   *
   * AWS: AWS Glue DataBrew dataset input configuration for data source access
   *
   * Validation: Must be valid CfnDataset.InputProperty or IResolvable; required for data source access
   *   **/
  readonly input: CfnDataset.InputProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional file format specification for DataBrew dataset interpretation enabling proper data parsing and processing. Defines the file format for datasets created from S3 files or folders affecting data interpretation and processing capabilities.
   *
   * Use cases: File format specification; Data parsing; Format interpretation; Processing optimization
   *
   * AWS: AWS Glue DataBrew dataset format for file interpretation and data processing
   *
   * Validation: Must be valid DataBrew format string if provided; affects data parsing and interpretation
   **/
  readonly format?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional format options defining how DataBrew interprets data structure and content within the dataset. Provides detailed configuration for data interpretation including delimiters, headers, and encoding settings for accurate data processing.
   *
   * Use cases: Data interpretation; Format configuration; Parsing options; Content structure definition
   *
   * AWS: AWS Glue DataBrew format options for data interpretation and parsing configuration
   *
   * Validation: Must be valid CfnDataset.FormatOptionsProperty if provided; configures data interpretation
   *   **/
  readonly formatOptions?: CfnDataset.FormatOptionsProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional path options defining how DataBrew interprets S3 path structure and file organization for dataset access. Specifies path interpretation settings for S3-based datasets including file patterns and directory structures.
   *
   * Use cases: S3 path interpretation; File organization; Directory structure; Path patterns
   *
   * AWS: AWS Glue DataBrew path options for S3 dataset path interpretation and file access
   *
   * Validation: Must be valid CfnDataset.PathOptionsProperty if provided; configures S3 path interpretation
   *   **/
  readonly pathOptions?: CfnDataset.PathOptionsProperty | IResolvable;
}

/**
 * A construct which creates a compliant Databrew Dataset.
 */
export class MdaaDataBrewDataset extends CfnDataset {
  private static setProps(props: MdaaDataBrewDatasetProps): CfnDatasetProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaDataBrewDatasetProps) {
    super(scope, id, MdaaDataBrewDataset.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Dataset',
          resourceId: props.name,
          name: props.name,
          value: this.name,
        },
        ...props,
      },
      scope,
    );
  }
}
