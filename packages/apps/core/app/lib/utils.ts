/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as yaml from 'yaml';
import { Node } from 'constructs/lib/construct';

/**
 * cleans up context string values. This is especially useful for values created from addOptionalCdkContextStringParam
 * @param value
 */
export function cleanContextStringValue(value: string): string {
  return value.replace(/^"/, '').replace(/"$/, '');
}

export function readYamlFile(fileName: string): unknown {
  return yaml.parse(fs.readFileSync(fileName, 'utf8'));
}

export function getNodeValue<T>(node: Node, name: string, defaultValue: T): T {
  const value = node.tryGetContext(name);
  return value ? JSON.parse(value) : defaultValue;
}
