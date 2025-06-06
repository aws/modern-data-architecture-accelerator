/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { ClusterParameterGroup, ClusterParameterGroupProps } from '@aws-cdk/aws-redshift-alpha';
import { Construct } from 'constructs';

/** Props for the creation of a compliant Redshift Cluster Paramater group */
export interface MdaaRedshiftClusterParameterGroupProps extends MdaaConstructProps {
  /**
   * Description for this parameter group
   *
   * @default a CDK generated description
   */
  readonly description?: string;
  /**
   * The parameters in this parameter group
   */
  readonly parameters: {
    [name: string]: string;
  };
}

/**
 * A construct for the creation of a compliance Redshift Cluster Parameter Group.
 * Specifically, the following parameters are enforced:
 * * require_SSL is forced to true
 * * use_fips_ssl is forced to true
 * * enable_user_activity_logging is forced to true
 *
 * All other parameters will be passed through.
 */
export class MdaaRedshiftClusterParameterGroup extends ClusterParameterGroup {
  private static setProps(props: MdaaRedshiftClusterParameterGroupProps): ClusterParameterGroupProps {
    const overrideProps = {
      description: props.naming.resourceName(props.description),
      parameters: {
        ...props.parameters,
        ...{
          require_SSL: 'true',
          use_fips_ssl: 'true',
          enable_user_activity_logging: 'true',
        },
      },
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaRedshiftClusterParameterGroupProps) {
    super(scope, id, MdaaRedshiftClusterParameterGroup.setProps(props));
  }
}
