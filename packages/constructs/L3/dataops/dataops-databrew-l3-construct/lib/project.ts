/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnProject, CfnProjectProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewProjectProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the DataBrew project enabling project identification and management. Provides the project identifier for DataBrew operations and serves as the primary reference for data preparation workflows and recipe development.
   *
   * Use cases: Project identification; Workflow management; Recipe development; Data preparation organization
   *
   * AWS: AWS Glue DataBrew project name for project identification and management
   *
   * Validation: Must be unique project name string; required for project creation and identification
   **/
  readonly name: string;
  readonly datasetName: string;
  readonly recipeName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN that will be assumed for project operations enabling secure access to data sources and destinations. Provides the execution role for DataBrew project operations including data access, profiling, and recipe development with appropriate permissions.
   *
   * Use cases: Secure data access; Project execution permissions; Role-based access control; Service integration
   *
   * AWS: AWS IAM role ARN for DataBrew project execution and secure data access
   *
   * Validation: Must be valid IAM role ARN; required for project execution and data access permissions
   **/
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
