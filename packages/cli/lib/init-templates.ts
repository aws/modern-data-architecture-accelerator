/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { resolveAssetDir } from './resolve-asset-dir';
import { findFiles } from './init-fs';

export function getTemplatesDir(): string {
  const dir = resolveAssetDir({
    packageName: '@aws-mdaa/starter-kits',
    marker: 'minimal',
    repoFallback: 'starter_kits',
  });
  if (!dir) {
    throw new Error('Templates not found. Install @aws-mdaa/starter-kits or run from the MDAA repo root.');
  }
  return dir;
}

/** Extract the first descriptive line from a kit's README.md */
export function extractKitDescription(kitDir: string): string {
  const readme = path.join(kitDir, 'README.md');
  if (!fs.existsSync(readme)) return '';
  const lines = fs.readFileSync(readme, 'utf-8').split('\n');
  let pastTitle = false;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      pastTitle = true;
      continue;
    }
    if (pastTitle && line.trim() && !line.startsWith('>') && !line.startsWith('!')) {
      return line.trim();
    }
  }
  return '';
}

/** Discover available starter kits, with 'minimal' first then alphabetical */
export function discoverStarterKits(templatesDir: string): Array<{ name: string; description: string }> {
  const entries = fs.readdirSync(templatesDir, { withFileTypes: true });
  const kits: Array<{ name: string; description: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const kitDir = path.join(templatesDir, entry.name);
    const mdaaYaml = path.join(kitDir, 'mdaa.yaml');
    if (!fs.existsSync(mdaaYaml)) continue;

    const description = extractKitDescription(kitDir);
    kits.push({ name: entry.name, description });
  }

  return kits.sort((a, b) => {
    if (a.name === 'minimal') return -1;
    if (b.name === 'minimal') return 1;
    return a.name.localeCompare(b.name);
  });
}

export function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    const isDirectory = resolveEntryKind(entry, srcPath);
    if (isDirectory === undefined) continue; // broken symlink

    if (isDirectory) {
      if (entry.name === 'node_modules') continue;
      copyDirRecursive(srcPath, destPath);
    } else {
      if (entry.name === 'package-lock.json') continue;
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Whether a directory entry should be copied as a directory (true) or a file (false), or
 * skipped entirely (undefined).
 *
 * `readdirSync` reports a symlink as neither file nor directory — the flags come from
 * `lstat` — so a link to a directory used to fall through to `copyFileSync` and fail with a
 * bare EISDIR part way through the copy. Links are resolved to what they point at, and a
 * broken one is skipped rather than aborting the whole scaffold.
 */
function resolveEntryKind(entry: fs.Dirent, fullPath: string): boolean | undefined {
  if (!entry.isSymbolicLink()) return entry.isDirectory();
  try {
    return fs.statSync(fullPath).isDirectory();
  } catch {
    console.log(`  Skipped broken symlink: ${entry.name}`);
    return undefined;
  }
}

const DOCS_URL = 'https://aws.github.io/modern-data-architecture-accelerator';

/**
 * Convert a repo-relative doc path to the path the published site serves.
 *
 * `mkdocs.yml` sets `use_directory_urls: false`, so the site publishes `page.html`, not
 * `page.md` and not a `page/` directory — keeping the `.md` extension produced a 404 for
 * every rewritten link.
 *
 * `README.md` is special: mkdocs treats it as the directory index, so it publishes as
 * `index.html`. A blanket `.md` -> `.html` swap would emit `README.html`, which the site
 * never serves.
 */
function toPublishedPath(target: string): string {
  const README = 'README.md';
  if (target === README || target.endsWith(`/${README}`)) {
    return `${target.slice(0, -README.length)}index.html`;
  }
  return target.endsWith('.md') ? `${target.slice(0, -'.md'.length)}.html` : target;
}

export function cleanRepoLinks(outputDir: string): void {
  const mdFiles = findMarkdownFiles(outputDir);
  for (const file of mdFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    const original = content;

    // Rewrite links that escape the project root (../../ at top level or deeper)
    // to point at published docs. Only rewrite links whose resolved path would
    // leave the scaffolded project — intra-kit ../subdir/ links stay intact.
    const relativeToOutput = path.relative(outputDir, path.dirname(file));
    const depth = relativeToOutput ? relativeToOutput.split(path.sep).length : 0;

    // Sibling-kit references like [text](../basic_datalake/) — other starter kits, which
    // don't exist in a standalone project. This runs BEFORE the generic escape rule: that
    // rule's `([^)#\s]+)` also matches `basic_datalake/`, so running it first consumed
    // these links and emitted `<DOCS_URL>/basic_datalake/`, dropping the `starter_kits/`
    // path segment and leaving this rule unreachable.
    // Quantifiers are bounded: unbounded `[^\]]+` rescans to end-of-input at every `[`, so a
    // file with many unclosed brackets costs O(n^2) (typescript:S8786). Bounds keep it linear.
    content = content.replace(/\[([^\]]{1,200})\]\(\.\.\/([a-z0-9_]{1,100})\/\)/g, (_match, text, siblingKit) => {
      // Only rewrite if we're at the project root (depth 0) — a ../sibling/
      // at depth 0 escapes the project
      if (depth === 0) {
        return `[${text}](${DOCS_URL}/starter_kits/${siblingKit}/)`;
      }
      return _match;
    });

    // Links like [text](../../PREDEPLOYMENT.md) or [text](../../README.md#section)
    // that traverse above the project root
    content = content.replace(
      // Bounded as above, and `(?:\.\.\/){1,20}` additionally caps the backtracking between it
      // and `[^)#\s]`, which overlap on `.` and `/` — the more expensive of the two blowups.
      /\[([^\]]{1,200})\]\(((?:\.\.\/){1,20})([^)#\s]{1,300})(#[^)]{0,200})?\)/g,
      (_match, text, dots, target, anchor) => {
        const upCount = dots.split('../').length - 1;
        if (upCount > depth) {
          // This link escapes the project — rewrite to published docs
          return `[${text}](${DOCS_URL}/${toPublishedPath(target)}${anchor || ''})`;
        }
        return _match;
      },
    );

    if (content !== original) {
      fs.writeFileSync(file, content);
    }
  }
}

/** Find all .md files recursively, skipping node_modules and the generated .mdaa/ tree */
function findMarkdownFiles(dir: string): string[] {
  return findFiles(dir, name => name.endsWith('.md'));
}
