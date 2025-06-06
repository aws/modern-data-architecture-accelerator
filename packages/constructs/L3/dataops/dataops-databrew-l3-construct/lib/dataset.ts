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
  // The unique name of the dataset.
  readonly name: string;

  // IResolvable Information on how DataBrew can find the dataset, in either the AWS Glue Data Catalog or Amazon S3.
  readonly input: CfnDataset.InputProperty | IResolvable;

  // The file format of a dataset that is created from an Amazon S3 file or folder.
  readonly format?: string;

  // A set of options that define how DataBrew interprets the data in the dataset.
  readonly formatOptions?: CfnDataset.FormatOptionsProperty | IResolvable;

  // A set of options that defines how DataBrew interprets an Amazon S3 path of the dataset.
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
