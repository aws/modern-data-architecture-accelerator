/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A reference to an IAM role. Roles can be referenced by name, arn, and/or id.
 */
export interface MdaaRoleRef {
  /**
   * A string which uniquely identifies the MdaaRoleRef within a scope.
   */
  readonly refId?: string;
  /**
   * Reference role by name
   */
  readonly name?: string;
  /**
   * Reference role by arn
   */
  readonly arn?: string;
  /**
   * Reference role by id
   */
  readonly id?: string;
  /**
   * Indicates whether the role should be considered immutable (defaults false)
   */
  readonly immutable?: boolean;
  /**
   * If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.
   */
  readonly sso?: boolean;
}
/**
 * A MdaaRoleRef which can be resolved within a scope.
 */
export interface MdaaResolvableRoleRef {
  /**
   * A string which uniquely identifies the MdaaRoleRef within a scope.
   */
  readonly refId: string;
  /**
   * Reference role by name
   */
  readonly name?: string;
  /**
   * Reference role by arn
   */
  readonly arn?: string;
  /**
   * Reference role by id
   */
  readonly id?: string;
  /**
   * Reference role by id
   */
  readonly immutable?: boolean;
  /**
   * If true, role name will be resolved to an SSO auto-generated role
   */
  readonly sso?: boolean;
}
