/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';

/**
 * Directories every init walk skips.
 *
 * One shared list, because divergent per-caller lists produced real gaps: yaml discovery
 * excluded `schemas` (skipping a customer's own `schemas/` directory of configs) while
 * markdown discovery excluded `.mdaa` (so the yaml walk descended into the generated
 * `.mdaa/<version>/docs` tree it had just written). Nothing init does should look inside
 * generated output, dependency trees, or VCS metadata.
 */
export const DEFAULT_EXCLUDED_DIRS: readonly string[] = ['node_modules', '.mdaa', '.mdaa_working', '.git', 'cdk.out'];

/**
 * Recursively collect files under `dir` that satisfy `matches`, skipping any
 * directory whose name is in `excludeDirs`. The single shared file-walk used by
 * the init modules (yaml discovery, markdown link rewriting, ...) so the
 * traversal is defined once rather than reimplemented per extension filter.
 *
 * Symlinks are followed for both files and directories: `readdirSync` reports a symlink as
 * neither `isFile()` nor `isDirectory()` (the flags come from `lstat`), so testing those
 * alone silently skipped a symlinked config file and never descended a symlinked directory.
 */
export function findFiles(
  dir: string,
  matches: (fileName: string) => boolean,
  excludeDirs: readonly string[] = DEFAULT_EXCLUDED_DIRS,
): string[] {
  const results: string[] = [];
  const excluded = new Set(excludeDirs);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // A symlink needs a stat of the target to know which it is. A broken link resolves to
    // neither and is skipped rather than throwing mid-walk.
    const stats = entry.isSymbolicLink() ? statOrUndefined(fullPath) : undefined;
    const isDirectory = entry.isSymbolicLink() ? (stats?.isDirectory() ?? false) : entry.isDirectory();
    const isFile = entry.isSymbolicLink() ? (stats?.isFile() ?? false) : entry.isFile();

    if (isDirectory) {
      if (excluded.has(entry.name)) continue;
      results.push(...findFiles(fullPath, matches, excludeDirs));
    } else if (isFile && matches(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

/** `statSync` that yields undefined for a broken symlink instead of throwing */
function statOrUndefined(target: string): fs.Stats | undefined {
  try {
    return fs.statSync(target);
  } catch {
    return undefined;
  }
}
