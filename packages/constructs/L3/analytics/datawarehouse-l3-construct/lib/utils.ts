/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeType } from '@aws-cdk/aws-redshift-alpha';

export function sanitizeScheduledActionName(actionName: string): string {
  return actionName.replace(/-+/g, '-');
}

class InvalidNodeTypeException implements Error {
  readonly nodeType: string;

  constructor(nodeType: string) {
    this.nodeType = nodeType;
    this.message = `Invalid node type: ${nodeType}`;
    this.name = 'InvalidNodeTypeException';
  }

  message: string;
  name: string;
}

export function ensureNodeType(rawNodeType: string): NodeType {
  // Check if rawNodeType is a key of NodeType enum
  const nodeTypeFromKey = NodeType[rawNodeType as keyof typeof NodeType];
  if (nodeTypeFromKey !== undefined) {
    return nodeTypeFromKey;
  }

  // Check if rawNodeType is already a value of NodeType enum
  const nodeTypeValues = Object.values(NodeType);
  if (nodeTypeValues.includes(rawNodeType as NodeType)) {
    return rawNodeType as NodeType;
  }

  throw new InvalidNodeTypeException(rawNodeType);
}
