/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export function sanitizeReplicationInstanceIdentifier(replicationInstanceIdentifier: string): string {
  return replicationInstanceIdentifier.replace(/-+/g, '-');
}
