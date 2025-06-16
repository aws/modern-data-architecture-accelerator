/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MdaaResolvableRoleRef } from '.';
import { MdaaRoleHelper } from './rolehelper';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';

/**
 * A role for which Role ID, Arn, or Name can be resolved using a custom resource. If one of these
 * properties is requested of the object and is not already populated, then a custom Cfn resource
 * will be created to facilitate the lookup.
 */
export class MdaaResolvableRole {
  private readonly scope: Construct;
  private readonly roleHelper: MdaaRoleHelper;
  private readonly roleRef: MdaaResolvableRoleRef;
  private roleCr?: CustomResource;

  /**
   *
   * @param scope The scope in which custom resources for role resolution will be created (if required)
   * @param naming The MDAA naming implementation which will be used to name custom resources
   * @param roleHelper The MDAA role helper which will be used as a custom resource Provider
   * @param roleRef The role reference which will be used to resolve a role. The role ref must contain at least
   * one 'anchor' property (one of id, arn, or name) on which the remaining properties can be resolved.
   */
  constructor(scope: Construct, roleHelper: MdaaRoleHelper, roleRef: MdaaResolvableRoleRef) {
    this.scope = scope;
    this.roleHelper = roleHelper;
    this.roleRef = roleRef;
  }

  /**
   *
   * @returns The unique reference id for the role ref
   */
  public refId(): string {
    return this.roleRef.refId;
  }

  /**
   *
   * @returns The immutability flag of the ref (defaults false)
   */
  public immutable(): boolean {
    return (this.roleRef.immutable != undefined && this.roleRef.immutable) || this.sso();
  }

  /**
   * @returns The sso flag of the ref( defaults false )
   */
  public sso(): boolean {
    return this.roleRef.sso != undefined && this.roleRef.sso;
  }

  /**
   *
   * @returns Either directly the role ref id (if already populated) or a CR attribute token which will contain the id at deployment time.
   */
  public id(): string {
    const id = this.roleRef.id ? this.roleRef.id : this.getCr().getAttString('id');
    return id;
  }

  /**
   *
   * @returns Either directly the role ref arn (if already populated) or a CR attribute token which will contain the arn at deployment time.
   */
  public arn(): string {
    const arn = this.roleRef.arn ? this.roleRef.arn : this.getCr().getAttString('arn');
    return arn;
  }

  /**
   *
   * @returns Either directly the role ref name (if already populated) or a CR attribute token which will contain the name at deployment time.
   */
  public name(): string {
    const name = this.roleRef.name ? this.roleRef.name : this.getCr().getAttString('name');
    return name;
  }

  public role(id: string): IRole {
    return Role.fromRoleArn(this.scope, id, this.arn());
  }

  private getCr(): CustomResource {
    if (this.roleCr) {
      return this.roleCr;
    }
    console.log('Role resolution required by config. Creating CR.');
    const getRoleResource = new CustomResource(this.scope, `Role-Res-${this.roleRef.refId}`, {
      serviceToken: this.roleHelper.createProviderServiceToken(),
      properties: {
        roleRef: this.roleRef,
      },
    });
    this.roleCr = getRoleResource;
    return getRoleResource;
  }
}
