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
  /** IAM path for the role providing hierarchical organization and namespace management */
  readonly path?: string;
  readonly permissionsBoundary?: IManagedPolicy;
  readonly roleName?: string;
  readonly maxSessionDuration?: Duration;
  /** Human-readable description of the IAM role explaining its purpose and intended usage */
  readonly description?: string;

  /** Flag to use the exact role name as specified without MDAA naming convention processing */
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
