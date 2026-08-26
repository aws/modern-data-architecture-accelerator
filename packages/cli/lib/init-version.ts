/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { MDAA_VERSION_PATTERN } from './config-field-policy';
import { GeneratedFileManifest } from './init-types';

/**
 * `mdaa_version` is untrusted input — mdaa.yaml is committed to customer repos and
 * distributed in starter kits — and init uses it two ways: as an npm specifier (as
 * deploy does) and as the `.mdaa/<version>/` directory name. This reader does not go
 * through `MdaaCliConfig`, so it applies that class's charset itself, which excludes
 * `/` and `\`. The charset still admits `.` and `..` on their own, which as a path
 * segment would land the asset tree outside `.mdaa/`, hence the single-segment check.
 *
 * Throws rather than returning undefined: undefined would silently fall back to the
 * CLI version, generating assets for a version the config does not pin.
 */
function assertUsableAsPathSegment(version: string, sourcePath: string): void {
  const isSingleSegment = version === path.basename(version) && version !== '.' && version !== '..';
  if (!MDAA_VERSION_PATTERN.test(version) || !isSingleSegment) {
    throw new Error(
      `Invalid mdaa_version ${JSON.stringify(version)} in ${sourcePath}. Must match ` +
        `${MDAA_VERSION_PATTERN} and be a single path segment — the value names the ` +
        `.mdaa/<version>/ asset directory and is used as an npm version specifier.`,
    );
  }
}

/** Read the global mdaa_version from mdaa.yaml if present */
export function resolveMdaaVersion(targetDir: string): string | undefined {
  const mdaaYamlPath = path.join(targetDir, 'mdaa.yaml');
  if (!fs.existsSync(mdaaYamlPath)) return undefined;

  const content = fs.readFileSync(mdaaYamlPath, 'utf-8');
  // `[ \t]*` rather than `\s*`: `\s` matches newlines, so a valueless
  // `mdaa_version:` line would capture the *next* line's content.
  const versionRegex = /^mdaa_version:[ \t]*['"]?([^'"#\n]+)['"]?/m;
  const match = versionRegex.exec(content);
  if (!match) return undefined;

  const version = match[1].trim();
  assertUsableAsPathSegment(version, mdaaYamlPath);
  return version;
}

/**
 * An exact, single published version — no ranges, no dist-tags. `MDAA_VERSION_PATTERN`
 * deliberately admits node-semver ranges because deploy passes the value to npm, but
 * `mdaa upgrade` *writes* the value, and a pin has to name one resolvable version.
 */
export const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * The `npx` invocation to hand a user of a scaffolded project. A config project has no
 * package.json for npx to find a local `mdaa` bin in, and the unscoped `mdaa` name is not
 * on the registry, so the scoped name is the only form that resolves. Pinned to the
 * project's version where there is one, so the CLI matches the schemas it was given.
 */
export function cliCommandForVersion(version?: string): string {
  return version ? `npx @aws-mdaa/cli@${version}` : 'npx @aws-mdaa/cli';
}

/** Get the CLI package version */
export function getCliVersion(): string {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

const SCHEMA_DIRECTIVE = '# yaml-language-server:';

/**
 * Return `content` with `mdaa_version` set to `version`. If a `mdaa_version:`
 * line already exists it is replaced in place; otherwise the line is inserted
 * immediately after the `# yaml-language-server:` directive, or prepended if
 * there is no such directive. The single source of truth for where the pin
 * lives — used by both {@link pinMdaaVersion} (init) and the upgrade flow.
 */
export function upsertMdaaVersion(content: string, version: string): string {
  if (/^mdaa_version:/m.test(content)) {
    // Same `[ \t]*` reasoning as resolveMdaaVersion, plus `*` on the value so a
    // valueless `mdaa_version:` line is filled in rather than left untouched.
    // A replacer function keeps `$&`/`$'` in `version` literal rather than letting
    // String.replace reinterpret them as substitution patterns.
    return content.replace(/^mdaa_version:[ \t]*['"]?[^'"#\n]*['"]?/m, () => `mdaa_version: "${version}"`);
  }

  const line = `mdaa_version: "${version}"\n`;
  const idx = content.indexOf(SCHEMA_DIRECTIVE);
  if (idx === -1) {
    return line + content;
  }
  const insertPos = content.indexOf('\n', idx) + 1;
  return content.slice(0, insertPos) + line + content.slice(insertPos);
}

/**
 * Pin mdaa_version in the project's mdaa.yaml so deploy uses the same version
 * that init used for schemas and docs. No-op if the file is missing or a pin
 * already exists.
 */
export function pinMdaaVersion(targetDir: string): void {
  const mdaaYamlPath = path.join(targetDir, 'mdaa.yaml');
  if (!fs.existsSync(mdaaYamlPath)) return;

  const content = fs.readFileSync(mdaaYamlPath, 'utf-8');
  // Don't overwrite an existing pin
  if (/^mdaa_version:/m.test(content)) return;

  const version = getCliVersion();
  if (version === 'unknown') return;

  fs.writeFileSync(mdaaYamlPath, upsertMdaaVersion(content, version));
}

/**
 * Project-level bookkeeping persisted at `.mdaa/metadata.json`, deliberately
 * NOT under the versioned `.mdaa/<version>/` directory since it isn't tied to
 * a schema version and must survive {@link pruneOldVersions}.
 */
export interface MdaaMetadata {
  kitName?: string;
  /** Content hash per generated file, used to detect user edits since generation */
  generatedFiles?: GeneratedFileManifest;
}

function metadataPath(targetDir: string): string {
  return path.join(targetDir, '.mdaa', 'metadata.json');
}

/** Read `.mdaa/metadata.json`, or an empty object if absent/unparseable */
export function readMetadata(targetDir: string): MdaaMetadata {
  const filePath = metadataPath(targetDir);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

/** Persist `.mdaa/metadata.json` (kit name + generated-file hashes) */
export function writeMetadata(targetDir: string, metadata: MdaaMetadata): void {
  const filePath = metadataPath(targetDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2) + '\n');
}

/**
 * Remove superseded `.mdaa/<version>/` asset directories.
 *
 * Deletes a directory only when it is both absent from `keepVersions` (the primary
 * version plus every version any config file binds to) and shaped like an exact
 * version. `.mdaa/` is inside the customer's project, so anything else living there —
 * `notes/`, a hand-made directory, a range-shaped pin — is left alone: leaving a stale
 * asset directory behind is recoverable, deleting a user's directory is not.
 */
export function pruneOldVersions(targetDir: string, keepVersions: Set<string>): void {
  const mdaaDir = path.join(targetDir, '.mdaa');
  if (!fs.existsSync(mdaaDir)) return;

  const entries = fs.readdirSync(mdaaDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (keepVersions.has(entry.name)) continue;
    if (!EXACT_VERSION_PATTERN.test(entry.name)) continue;
    const oldDir = path.join(mdaaDir, entry.name);
    fs.rmSync(oldDir, { recursive: true, force: true });
    console.log(`  Pruned old assets: .mdaa/${entry.name}/`);
  }
}
