/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Duration } from 'aws-cdk-lib';
import { IManagedPolicy, IPrincipal, IRole, PolicyDocument, Role, RoleProps } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface MdaaRoleProps extends MdaaConstructProps {
  readonly assumedBy: IPrincipal;
  readonly externalIds?: string[];
  readonly managedPolicies?: IManagedPolicy[];
  readonly inlinePolicies?: {
    /** @jsii ignore */
    [name: string]: PolicyDocument;
  };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM path for the role providing hierarchical organization and namespace management. Enables structured role organization within IAM for better management and policy targeting in large-scale deployments.
   *
   * Use cases: Hierarchical role organization; Namespace management; Policy targeting by path
   *
   * AWS: AWS IAM role path for organizational structure and policy targeting
   *
   * Validation: Must be valid IAM path format if provided (starts and ends with /); defaults to / if not specified
   **/
  readonly path?: string;
  readonly permissionsBoundary?: IManagedPolicy;
  readonly roleName?: string;
  readonly maxSessionDuration?: Duration;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the IAM role explaining its purpose and intended usage. Provides documentation for role management and helps administrators understand role capabilities and intended use cases for operational clarity.
   *
   * Use cases: Role documentation; Administrative clarity; Operational understanding; Compliance documentation
   *
   * AWS: AWS IAM role description for management and operational documentation
   *
   * Validation: Must be 1000 characters or less if provided; descriptive text for role purpose and usage
   **/
  readonly description?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to use the exact role name as specified without MDAA naming convention processing. When enabled, bypasses standard naming conventions for services that require specific role names while maintaining other MDAA compliance features.
   *
   * Use cases: Service-specific role name requirements; External system integration; Legacy system compatibility
   *
   * AWS: AWS IAM role name used exactly as specified without naming convention processing
   *
   * Validation: Boolean value; when true, uses roleName exactly as provided; requires careful name management
   **/
  readonly verbatimRoleName?: boolean;
}

/**
 * Interface representing a compliant Role
 */
export type IMdaaRole = IRole;

/**
 * Construct for creating compliant IAM Roles
 */
export class MdaaRole extends Role {
  private static setProps(props: MdaaRoleProps): RoleProps {
    const overrideProps = {
      roleName: props.verbatimRoleName ? props.roleName : props.naming.resourceName(props.roleName, 64),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaRoleProps) {
    super(scope, id, MdaaRole.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'role',
          resourceId: props.roleName,
          name: 'arn',
          value: this.roleArn,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'role',
          resourceId: props.roleName,
          name: 'id',
          value: this.roleId,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'role',
          resourceId: props.roleName,
          name: 'name',
          value: this.roleName,
        },
        ...props,
      },
      scope,
    );
  }
}
