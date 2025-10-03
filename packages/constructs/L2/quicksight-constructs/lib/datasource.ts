/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { CfnDataSource, CfnDataSourceProps } from 'aws-cdk-lib/aws-quicksight';
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
export interface MdaaQuickSightDataSourceProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional alternate data source parameters for credential sharing and data source copying enabling flexible data source management and credential reuse. Provides alternate parameter sets for credential sharing when copying data sources with matching parameter structures.
   *
   * Use cases: Credential sharing; Data source copying; Parameter management; Flexible connectivity
   *
   * AWS: QuickSight alternate data source parameters for credential sharing and flexible data source management
   *
   * Validation: Must be array of valid DataSourceParametersProperty if provided; enables credential sharing and copying
   *   **/
  readonly alternateDataSourceParameters?:
    | Array<CfnDataSource.DataSourceParametersProperty | cdk.IResolvable>
    | cdk.IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional AWS account ID specification for cross-account data source access enabling multi-account analytics and centralized data source management. Defines the AWS account where the data source will be created for proper account-based access control.
   *
   * Use cases: Cross-account access; Multi-account analytics; Account-based access control; Centralized management
   *
   * AWS: AWS account ID for QuickSight data source account-based access control and multi-account analytics
   *
   * Validation: Must be valid AWS account ID if provided; enables cross-account data source access and management
   **/
  readonly awsAccountId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional credentials configuration for secure data source authentication enabling username/password-based connectivity with secure credential management. Provides authentication credentials for data source connectivity with secure credential storage and management.
   *
   * Use cases: Secure authentication; Credential management; Data source connectivity; Access control
   *
   * AWS: QuickSight data source credentials for secure authentication and data source connectivity
   *
   * Validation: Must be valid DataSourceCredentialsProperty if provided; enables secure data source authentication
   *   **/
  readonly credentials?: CfnDataSource.DataSourceCredentialsProperty | cdk.IResolvable;
  readonly dataSourceId?: string;
  readonly dataSourceParameters?: CfnDataSource.DataSourceParametersProperty | cdk.IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional error information for data source troubleshooting and monitoring enabling error tracking and operational visibility. Provides error details from data source creation or updates for troubleshooting and operational management.
   *
   * Use cases: Error tracking; Troubleshooting; Operational monitoring; Data source management
   *
   * AWS: QuickSight data source error information for troubleshooting and operational visibility
   *
   * Validation: Must be valid DataSourceErrorInfoProperty if provided; enables error tracking and troubleshooting
   *   **/
  readonly errorInfo?: CfnDataSource.DataSourceErrorInfoProperty | cdk.IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional display name for data source identification and user interface presentation enabling user-friendly data source naming and organization. Provides human-readable name for data source identification in QuickSight interface and management.
   *
   * Use cases: User-friendly naming; Interface presentation; Data source organization; User experience
   *
   * AWS: QuickSight data source display name for user interface presentation and data source organization
   *
   * Validation: Must be descriptive name string if provided; processed through MDAA naming conventions
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional resource permissions array for data source access control enabling fine-grained access management and sharing capabilities. Provides IAM-based access control for data source sharing and collaborative analytics with granular permission management.
   *
   * Use cases: Access control; Data source sharing; Collaborative analytics; Permission management
   *
   * AWS: QuickSight data source permissions for access control and collaborative analytics capabilities
   *
   * Validation: Must be array of valid ResourcePermissionProperty if provided; enables access control and sharing
   *   **/
  readonly permissions?: Array<CfnDataSource.ResourcePermissionProperty | cdk.IResolvable> | cdk.IResolvable;
  readonly tags?: cdk.CfnTag[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required data source type specification controlling connectivity protocols and data source capabilities for various data sources. Defines the specific type of data source for appropriate connectivity, optimization, and feature availability including databases, files, and cloud services.
   *
   * Use cases: Data source type specification; Connectivity protocols; Feature availability; Multi-source support
   *
   * AWS: QuickSight data source type for connectivity protocols and data source capability specification
   *
   * Validation: Must be valid data source type string; required; use AMAZON_ELASTICSEARCH for OpenSearch Service
   **/
  readonly type: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC connection properties for secure network connectivity enabling private network access and enhanced security for data source connections. Provides VPC-based connectivity for data sources requiring private network access and enhanced security controls.
   *
   * Use cases: Private network access; Enhanced security; VPC connectivity; Secure data source access
   *
   * AWS: VPC connection properties for QuickSight data source private network access and enhanced security
   *
   * Validation: Must be valid VpcConnectionPropertiesProperty if provided; enables VPC-based secure connectivity
   *   **/
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
      /**
       * Q-ENHANCED-PROPERTY
       * Required SSL configuration for QuickSight data source connection security ensuring encrypted data transmission. Defines SSL/TLS settings for secure database connections with SSL enabled by default for data protection and compliance requirements.
       *
       * Use cases: Data transmission security; SSL/TLS encryption; Database connection security; Compliance requirements; Data protection
       *
       * AWS: Amazon QuickSight data source SSL configuration for secure database connectivity and encrypted data transmission
       *
       * Validation: Must be valid SSL properties object; disableSsl set to false for security; required for secure data source connections
       */
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
