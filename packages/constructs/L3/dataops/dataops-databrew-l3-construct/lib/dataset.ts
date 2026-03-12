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
  /** Unique name for the DataBrew dataset. */
  readonly name: string;
  /** Input configuration defining data source location from S3 or Glue Data Catalog. */
  readonly input: CfnDataset.InputProperty | IResolvable;
  /** File format for S3-based datasets. */
  readonly format?: string;
  /** Format options for data interpretation including delimiters and headers. */
  readonly formatOptions?: CfnDataset.FormatOptionsProperty | IResolvable;
  /** Path options for S3 path structure interpretation. */
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
