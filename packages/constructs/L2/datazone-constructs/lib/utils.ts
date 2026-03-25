/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { PolicyPrincipal } from './authorization';

export function validatePrincipal(principal: PolicyPrincipal) {
  if (Object.keys(principal).length != 1) {
    throw new Error(
      `Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName`,
    );
  }
}

export function resolveCrossAccountProvisioningRole(
  provisioningRole: MdaaRoleRef,
  account: string,
  partition: string,
): string {
  if (provisioningRole.arn) {
    return provisioningRole.arn;
  } else if (provisioningRole.name) {
    return `arn:${partition}:iam::${account}:role/${provisioningRole.name}`;
  }
  throw new Error('Associated account provisioningRole must have either arn or name defined');
}
