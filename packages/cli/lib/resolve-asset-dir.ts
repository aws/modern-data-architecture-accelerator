/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';

export interface ResolveAssetDirOptions {
  /** npm package name to resolve (e.g. '@aws-mdaa/starter-kits') */
  readonly packageName: string;
  /** Relative path within the resolved package that must exist to consider it valid */
  readonly marker: string;
  /** Fallback directory relative to the repo root (e.g. 'starter_kits') */
  readonly repoFallback?: string;
}

/**
 * Resolve a bundled asset directory from an npm package, falling back to the
 * repo tree when running in development. Returns the package root directory,
 * or the repo fallback path, or an empty string if neither is available.
 *
 * Resolution order:
 * 1. `require.resolve('<packageName>/package.json')` → verify `marker` exists
 * 2. Repo root (`__dirname/../../../<repoFallback>`) → verify `marker` exists there too
 * 3. Return '' (caller decides whether to throw)
 */
export function resolveAssetDir(options: ResolveAssetDirOptions): string {
  const { packageName, marker, repoFallback } = options;

  try {
    const pkgDir = path.dirname(require.resolve(`${packageName}/package.json`));
    if (fs.existsSync(path.join(pkgDir, marker))) {
      return pkgDir;
    }
  } catch {
    // Package not resolvable — fall through to repo fallback
  }

  if (repoFallback) {
    const repoRoot = path.join(__dirname, '..', '..', '..');
    const fallback = path.join(repoRoot, repoFallback);
    // `marker` is checked here too, not just on the require.resolve branch. Three levels
    // up from a published install is `node_modules`, and `schemas` / `starter_kits` are
    // both valid unscoped npm names — so "does a directory with this name exist there" is
    // not evidence that it is the MDAA asset root whose contents we are about to copy
    // into a customer's project.
    if (fs.existsSync(path.join(fallback, marker))) return fallback;
  }

  return '';
}
