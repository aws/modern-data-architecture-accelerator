/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnProject, CfnProjectProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewProjectProps extends MdaaConstructProps {
  /** Unique name for the DataBrew project. */
  readonly name: string;
  readonly datasetName: string;
  readonly recipeName: string;
  /** IAM role ARN for DataBrew project execution permissions. */
  readonly roleArn: string;
  readonly sample?: CfnProject.SampleProperty | IResolvable;
}

/**
 * A construct which creates a compliant Databrew Project.
 */
export class MdaaDataBrewProject extends CfnProject {
  private static setProps(props: MdaaDataBrewProjectProps): CfnProjectProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaDataBrewProjectProps) {
    super(scope, id, MdaaDataBrewProject.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Project',
          resourceId: props.name,
          name: props.name,
          value: this.name,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Project',
          resourceId: props.datasetName,
          name: 'datasetName',
          value: this.datasetName,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Project',
          resourceId: props.recipeName,
          name: 'recipeName',
          value: this.recipeName,
        },
        ...props,
      },
      scope,
    );
  }
}
