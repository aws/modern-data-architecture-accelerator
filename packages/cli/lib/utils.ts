/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EffectiveConfig } from './config-types';
import { ShellCommand } from './shell-command';
import { SafeCommand } from './safe-command';

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function findDuplicates(keyCounts: Record<string, Record<string, number>>): Array<[string, string]> {
  return Object.entries(keyCounts).flatMap(([accountName, moduleMap]) =>
    Object.entries(moduleMap)
      .filter(([, count]) => count > 1)
      .map(([moduleName]) => [accountName, moduleName] as [string, string]),
  );
}

function encodeContextValue(contextValue: unknown): string {
  if (Array.isArray(contextValue)) {
    return `"list:${JSON.stringify(contextValue)}"`;
  }
  if (typeof contextValue === 'object' && contextValue !== null) {
    return `"obj:${JSON.stringify(contextValue)}"`;
  }
  if (typeof contextValue === 'string') {
    return contextValue;
  }
  if (typeof contextValue === 'number') {
    return contextValue.toString();
  }
  if (typeof contextValue === 'boolean') {
    return contextValue ? 'true' : 'false';
  }
  throw new Error(`Don't know how to handle type ${typeof contextValue}: ${String(contextValue)}`);
}

export function generateContextCdkParams(moduleEffectiveConfig: EffectiveConfig): SafeCommand[] {
  return Object.entries(moduleEffectiveConfig.effectiveContext).map(contextEntry => {
    const contextKey = contextEntry[0];
    const contextValue = contextEntry[1];
    const encodedContextValue = encodeContextValue(contextValue);
    // Arriving token: `<key>=<encoded>` (the CDK context param the receiver must
    // see after the shell strips quoting). Quoting the whole `key=encoded` token
    // preserves the previous `-c '<key>=<encoded>'` bytes for quote-free values
    // and neutralizes shell metacharacters in either the key or the value. The
    // `obj:`/`list:` literal double quotes are inert inside the single quotes,
    // matching the gate the config ref-value-transformer keys off.
    return ShellCommand.args().option('-c', `${contextKey}=${encodedContextValue}`).build();
  });
}
