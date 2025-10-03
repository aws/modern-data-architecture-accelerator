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
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the parameter group explaining its purpose and configuration. Provides documentation for parameter group management and helps identify configuration intent for operational clarity.
   *
   * Use cases: Configuration documentation; Management clarity; Operational understanding; Parameter group identification
   *
   * AWS: Amazon Redshift parameter group description for management and identification
   *
   * Validation: Must be descriptive text if provided; defaults to CDK-generated description; recommended for clarity
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of Redshift configuration parameter names to values enabling cluster customization. Defines specific Redshift database parameters for performance tuning, security configuration, and operational behavior optimization.
   *
   * Use cases: Performance tuning; Security configuration; Memory management; Query optimization; Connection settings
   *
   * AWS: Amazon Redshift cluster parameter configuration for database behavior and performance optimization
   *
   * Validation: Must be object with valid Redshift parameter names as keys and valid parameter values; required for configuration
   *   **/
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
