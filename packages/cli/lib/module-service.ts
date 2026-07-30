/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModuleEffectiveConfig } from './config-types';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function getMdaaConfig<T>(
  moduleDeployConfig: ModuleEffectiveConfig,
  property: string,
  typeGuard: (value: unknown) => value is T,
): T | undefined {
  const packageJsonPath = path.join(moduleDeployConfig.modulePath, 'package.json');
  let packageJson;
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    packageJson = JSON.parse(content);
  } catch {
    return undefined;
  }
  const mdaaConfig = packageJson?.mdaa;
  if (!mdaaConfig || typeof mdaaConfig !== 'object') {
    return undefined;
  }
  return getPropertyOfType(mdaaConfig as Record<string, unknown>, property, typeGuard);
}

function getPropertyOfType<TExpectedType>(
  object: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is TExpectedType,
): TExpectedType | undefined {
  const value = object[key];
  if (value === undefined) return undefined;

  if (!guard(value)) {
    throw new Error(`Property ${key} is of the wrong type`);
  }

  return value;
}
