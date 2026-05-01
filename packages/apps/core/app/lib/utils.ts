/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Schema } from 'yaml/types';
import { CST } from 'yaml/parse-cst';
import { Node } from 'constructs/lib/construct';
import { ErrorObject } from 'ajv';
import { ConfigurationElement } from '@aws-mdaa/config/lib/config';
// nosemgrep
// eslint-disable-next-line @typescript-eslint/no-require-imports
import get = require('lodash/get');
// nosemgrep
// eslint-disable-next-line @typescript-eslint/no-require-imports
import set = require('lodash/set');

/**
 * cleans up context string values. This is especially useful for values created from addOptionalCdkContextStringParam
 * @param value
 */
export function cleanContextStringValue(value: string): string {
  return value.replace(/^"/, '').replace(/"$/, '');
}

export function readYamlFile(fileName: string): unknown {
  return readYamlFileWithIncludes(fileName);
}

export function readYamlFileWithIncludes(fileName: string): unknown {
  const baseDir = path.dirname(path.resolve(fileName));

  const includeTag: Schema.CustomTag = {
    identify: () => false,
    tag: '!include',
    resolve: (_doc, cstNode: CST.Node) => {
      const scalar = cstNode as CST.PlainValue | CST.QuoteValue;
      const strValue = scalar.strValue;
      const filePath = typeof strValue === 'string' ? strValue : strValue?.str || '';
      const includePath = path.resolve(baseDir, filePath);
      return fs.readFileSync(includePath, 'utf8');
    },
  };

  // Wrap process.emitWarning to handle YAMLWarning instances that aren't
  // valid string|Error arguments in newer Node versions
  const origEmitWarning = process.emitWarning;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.emitWarning = ((warning: any, ...args: any[]) => {
    if (typeof warning === 'object' && warning?.constructor?.name === 'YAMLWarning') {
      return origEmitWarning.call(process, String(warning.message ?? warning));
    }
    return origEmitWarning.call(process, warning, ...args);
  }) as typeof process.emitWarning;

  try {
    return yaml.parse(fs.readFileSync(fileName, 'utf8'), { customTags: [includeTag] });
  } finally {
    process.emitWarning = origEmitWarning;
  }
}

export function filterConfigurationElement<T extends ConfigurationElement, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key as K))) as Pick<T, K>;
}

export function getNodeValue<T>(node: Node, name: string, defaultValue: T): T {
  const value = node.tryGetContext(name);
  return value ? JSON.parse(value) : defaultValue;
}

/**
 * Attempts to coerce values in a config object to match the expected types from Ajv validation errors.
 * This is a best-effort function that handles common type mismatches from template substitution.
 *
 * @param config The configuration object to modify in-place
 * @param errors Array of Ajv validation errors
 * @returns true if any coercions were attempted, false otherwise
 */
export function coerceConfigTypes(config: ConfigurationElement, errors: ErrorObject[]): void {
  for (const error of errors) {
    // Only handle type errors
    if (error.keyword !== 'type' || !error.instancePath || !error.params?.type) {
      continue;
    }

    try {
      const currentValue = getValueAtPath(config, error.instancePath);
      if (typeof currentValue !== 'string') {
        console.warn(`Cannot coerce value at ${error.instancePath} because the value isn't a string`);
        continue;
      }
      const expectedType = error.params.type as string;
      const coercedValue = coerceValue(currentValue, expectedType);

      if (coercedValue !== undefined) {
        setValueAtPath(config, error.instancePath, coercedValue);
      }
    } catch (err) {
      // Ignore errors and continue with other fields
      console.warn(`Failed to coerce field ${error.instancePath}: ${err}`);
    }
  }
}

/**
 * Converts a JSON Pointer path (RFC 6901) to a lodash path
 * @param jsonPointer JSON Pointer path (e.g., "/numberOfNodes" or "/items/0/name")
 * @returns Lodash path (e.g., "numberOfNodes" or "items.0.name")
 */
function jsonPointerToLodashPath(jsonPointer: string): string {
  return jsonPointer.slice(1).replace(/\//g, '.');
}

/**
 * Gets a value from an object using a JSON Pointer path (RFC 6901)
 * @param obj The object to navigate
 * @param path The JSON Pointer path (e.g., "/numberOfNodes" or "/cluster/nodeType")
 * @returns The value at the path
 */
function getValueAtPath(obj: ConfigurationElement, path: string) {
  if (path === '' || path === '/') {
    return obj;
  }
  return get(obj, jsonPointerToLodashPath(path));
}

/**
 * Sets a value in an object using a JSON Pointer path (RFC 6901)
 * @param obj The object to modify
 * @param path The JSON Pointer path
 * @param value The value to set
 */
function setValueAtPath(obj: ConfigurationElement, path: string, value: boolean | number | unknown[]): void {
  if (path === '' || path === '/') {
    throw new Error('Cannot set root object');
  }

  set(obj, jsonPointerToLodashPath(path), value);
}

/**
 * Attempts to coerce a value to the expected type
 * @param value The current value
 * @param expectedType The expected type from the schema
 * @returns The coerced value, or undefined if coercion is not possible
 */
function coerceValue(value: string, expectedType: string): boolean | number | unknown[] | undefined {
  switch (expectedType) {
    case 'number': {
      const num = Number(value);
      return Number.isNaN(num) ? undefined : num;
    }

    case 'boolean':
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;

    case 'integer': {
      const num = Number(value);
      if (Number.isNaN(num) || !Number.isInteger(num)) return undefined;
      return num;
    }

    case 'array': {
      // Support JSON-encoded arrays passed as strings (e.g., from env var substitution).
      // Example: '["subnet-xxx","subnet-yyy"]' → ["subnet-xxx","subnet-yyy"]
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }

    default:
      return undefined;
  }
}
