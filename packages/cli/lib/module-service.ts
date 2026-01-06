/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModuleEffectiveConfig } from './config-types';

export function getMdaaConfig<T>(
  moduleDeployConfig: ModuleEffectiveConfig,
  property: string,
  typeGuard: (value: unknown) => value is T,
): T | undefined {
  const moduleMdaaDeployConfigFile = `${moduleDeployConfig.modulePath}/mdaa.config.json`;
  let moduleMdaaDeployConfig;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    moduleMdaaDeployConfig = require(moduleMdaaDeployConfigFile);
  } catch {
    return undefined;
  }
  return getPropertyOfType(moduleMdaaDeployConfig, property, typeGuard);
}

function getPropertyOfType<TKey extends string, TExpectedType>(
  object: Record<string, unknown>,
  key: TKey,
  guard: (value: unknown) => value is TExpectedType,
): TExpectedType | undefined {
  const value = object[key];
  if (value === undefined) return undefined;

  if (!guard(value)) {
    throw new Error(`Property ${key} is of the wrong type`);
  }

  return value;
}
