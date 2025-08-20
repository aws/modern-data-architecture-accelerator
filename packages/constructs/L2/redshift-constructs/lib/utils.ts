/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function sanitizeClusterName(actionName: string): string {
  return actionName.replace(/-+/g, '-');
}
