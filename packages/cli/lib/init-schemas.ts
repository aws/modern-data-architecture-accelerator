/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { MdaaCliConfig } from './mdaa-cli-config-parser';
import { computeEffectiveMdaaVersion } from './config-resolver';
import { findYamlFiles } from './init-placeholders';
import { resolveAssetDir } from './resolve-asset-dir';
import { ShellCommand } from './shell-command';
import { executeCommandWithCapture } from './command-utils';
import { cliCommandForVersion, EXACT_VERSION_PATTERN } from './init-version';

export function getSchemasDir(): string {
  const dir = resolveAssetDir({
    packageName: '@aws-mdaa/schemas',
    marker: '@aws-mdaa',
    repoFallback: 'schemas',
  });
  if (!dir) {
    // Schema validation is the main thing init exists to set up, so an unresolvable
    // schemas package is a failure rather than something to skip quietly — the same
    // stance getTemplatesDir already takes.
    throw new Error('Schemas not found. Install @aws-mdaa/schemas or run from the MDAA repo root.');
  }
  return dir;
}

/** Extract version constraint from module_path if it contains @version suffix */
export function extractVersionFromModulePath(modulePath?: string): string | undefined {
  if (!modulePath) return undefined;
  // Match @aws-mdaa/module-name@version or @aws-mdaa/module-name@>=version
  const atIdx = modulePath.lastIndexOf('@');
  // Skip the @ in the scoped package name (@aws-mdaa/)
  if (atIdx <= 0 || modulePath.charAt(atIdx - 1) === '/') return undefined;
  return modulePath.slice(atIdx + 1);
}

/** Cache for resolved version constraints to avoid repeated npm calls */
const versionResolutionCache = new Map<string, string>();

/**
 * An offline or blackholed registry would otherwise hold `init` for npm's whole retry
 * budget while printing nothing, so the lookup is bounded and reported instead.
 */
const NPM_VIEW_TIMEOUT_MS = 30_000;

/**
 * Extract one concrete version from `npm view <pkg>@<range> version` output.
 *
 * A single matching version prints bare (`1.7.0`); a range matching several prints one
 * `<pkg>@<version> '<version>'` line per match, ascending. So the last line is the highest
 * match either way. The result must still look like a version before it is trusted: it
 * becomes a `.mdaa/<version>/` path segment, and npm interleaves warnings into its output.
 */
export function parseNpmViewVersion(stdout: string): string | undefined {
  const lines = stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const last = lines.at(-1);
  if (!last) return undefined;

  const quoted = /'([^']+)'$/.exec(last);
  const candidate = quoted ? quoted[1] : last;
  return EXACT_VERSION_PATTERN.test(candidate) ? candidate : undefined;
}

/**
 * Resolve a version constraint to an exact version.
 * Exact versions pass through. Ranges are resolved via npm view.
 */
export function resolveVersionConstraint(constraint: string): string | undefined {
  // Exact version — no resolution needed. Same pattern parseNpmViewVersion uses, so a
  // prerelease pin counts as exact; a narrower check sent it to the range charset below,
  // which rejects the suffix's letters, silently falling back to the primary schemas.
  if (EXACT_VERSION_PATTERN.test(constraint)) return constraint;

  // Validate constraint contains only safe characters (semver range syntax)
  if (!/^[~^>=<\s\d.x*|-]+$/.test(constraint)) return undefined;

  // Check cache
  const cached = versionResolutionCache.get(constraint);
  if (cached) return cached;

  // Resolve via npm. The constraint is shell-quoted by ShellCommand.arg() (and
  // pre-filtered by the regex above), then executed through the shared,
  // already-vetted command sink rather than a second raw child_process call.
  try {
    const cmd = ShellCommand.for('npm').flags('view').arg(`@aws-mdaa/cli@${constraint}`).flags('version').build();
    const { stdout, exitCode } = executeCommandWithCapture(cmd, { timeoutMs: NPM_VIEW_TIMEOUT_MS });
    const resolved = exitCode === 0 ? parseNpmViewVersion(stdout) : undefined;
    if (resolved) {
      versionResolutionCache.set(constraint, resolved);
      return resolved;
    }
  } catch {
    // npm view failed — fall through to the report below
  }

  console.log(`  Note: could not resolve mdaa_version '${constraint}' via npm; using the primary schemas.`);
  return undefined;
}

/** Resolve a single module's config files to their effective version and add to the map */
export function resolveModuleVersionEntries(
  mod: { module_path?: string; mdaa_version?: string; module_configs?: string[] },
  envEffective: { effectiveMdaaVersion: string | undefined },
  into: { targetDir: string; map: Map<string, string> },
): void {
  const { targetDir, map } = into;
  const modulePathVersion = extractVersionFromModulePath(mod.module_path);
  const cascadedVersion = computeEffectiveMdaaVersion(envEffective, mod.mdaa_version);
  const effectiveConstraint = modulePathVersion || cascadedVersion;
  if (!effectiveConstraint) return;

  const resolvedVersion = resolveVersionConstraint(effectiveConstraint);
  if (!resolvedVersion) return;

  for (const configFile of mod.module_configs || []) {
    map.set(path.resolve(targetDir, configFile), resolvedVersion);
  }
}

/**
 * Build a map of config file path → effective MDAA version by walking the
 * mdaa.yaml hierarchy using the shared cascade logic from config-resolver.
 * Also extracts version constraints from module_path (e.g., @aws-mdaa/datalake@1.6.0).
 */
export function buildConfigVersionMap(targetDir: string): Map<string, string> {
  const map = new Map<string, string>();
  const mdaaYamlPath = path.join(targetDir, 'mdaa.yaml');
  if (!fs.existsSync(mdaaYamlPath)) return map;

  try {
    const config = new MdaaCliConfig({ filename: mdaaYamlPath });
    const contents = config.contents;
    const globalEffective = { effectiveMdaaVersion: contents.mdaa_version };

    for (const [, domain] of Object.entries(contents.domains || {})) {
      const domainEffective = {
        effectiveMdaaVersion: computeEffectiveMdaaVersion(globalEffective, domain.mdaa_version),
      };
      for (const [, env] of Object.entries(domain.environments || {})) {
        const envEffective = {
          effectiveMdaaVersion: computeEffectiveMdaaVersion(domainEffective, env.mdaa_version),
        };
        for (const [, mod] of Object.entries(env.modules || {})) {
          resolveModuleVersionEntries(mod, envEffective, { targetDir, map });
        }
      }
    }
  } catch (err) {
    // A config that doesn't parse yet — unfilled `<YOUR_...>` placeholders being the
    // common case right after scaffolding — can't be walked for per-module versions,
    // so every config binds to the primary schemas. Report it instead of silently
    // returning an empty map, which looks identical to "no overrides configured".
    console.log(`  Note: could not read per-module versions from mdaa.yaml — ${(err as Error).message}`);
    console.log('        All configs will validate against the primary schemas.');
  }

  return map;
}

/**
 * Build a map of config file path → module name (e.g., 'datalake') by walking
 * the mdaa.yaml hierarchy via the structured MdaaCliConfig parser. Extracts the
 * module name from the `module_path` field (e.g., `@aws-mdaa/datalake` → `datalake`).
 */
export function buildConfigModuleMap(targetDir: string): Map<string, string> {
  const map = new Map<string, string>();
  const mdaaYamlPath = path.join(targetDir, 'mdaa.yaml');
  if (!fs.existsSync(mdaaYamlPath)) return map;

  try {
    const config = new MdaaCliConfig({ filename: mdaaYamlPath });
    const contents = config.contents;

    for (const [, domain] of Object.entries(contents.domains || {})) {
      for (const [, env] of Object.entries(domain.environments || {})) {
        collectModuleEntries(env.modules, targetDir, map);
      }
    }
  } catch {
    // If parsing fails, return empty map — fallback to no schema injection
  }

  return map;
}

/** Map each module's config files to its module name */
function collectModuleEntries(
  modules: Record<string, { module_path?: string; module_configs?: string[] }> | undefined,
  targetDir: string,
  map: Map<string, string>,
): void {
  for (const [, mod] of Object.entries(modules || {})) {
    const moduleName = extractModuleNameFromPath(mod.module_path);
    if (!moduleName) continue;
    for (const configFile of mod.module_configs || []) {
      map.set(path.resolve(targetDir, configFile), moduleName);
    }
  }
}

/** Extract the bare module name from a module_path (e.g., '@aws-mdaa/datalake@1.4.0' → 'datalake') */
function extractModuleNameFromPath(modulePath?: string): string | undefined {
  if (!modulePath) return undefined;
  // Strip any @version suffix first
  const atIdx = modulePath.lastIndexOf('@');
  const base = atIdx > 0 && modulePath.charAt(atIdx - 1) !== '/' ? modulePath.slice(0, atIdx) : modulePath;
  // Extract the unscoped package name after the last /
  const slashIdx = base.lastIndexOf('/');
  return slashIdx >= 0 ? base.slice(slashIdx + 1) : base;
}

/**
 * Resolve the module name for a config file using the structured config parser.
 * Returns the module name (e.g., 'datalake') or undefined if not found.
 */
export function resolveModuleForConfig(configFile: string, targetDir: string): string | undefined {
  const map = buildConfigModuleMap(targetDir);
  return map.get(path.resolve(configFile));
}

/** Determine the schema name for a yaml file based on filename or module mapping */
export function determineSchemaName(
  fileName: string,
  file: string,
  configModuleMap: Map<string, string>,
): string | undefined {
  if (fileName === 'mdaa.yaml') return 'cli';
  if (fileName === 'tags.yaml') return undefined;
  return configModuleMap.get(path.resolve(file));
}

/**
 * The `.mdaa/<version>/schemas` directory for a config file's bound version, or
 * undefined when the file has no version binding or that version's assets aren't
 * present in this project.
 */
function findVersionedSchemaDir(targetDir: string, fileVersion: string | undefined): string | undefined {
  if (!fileVersion) return undefined;
  const versionedSchemaDir = path.join(targetDir, '.mdaa', fileVersion, 'schemas');
  return fs.existsSync(versionedSchemaDir) ? versionedSchemaDir : undefined;
}

/** Report config versions whose schemas this CLI can't produce, and how to get them */
function reportUnavailableVersions(unavailableVersions: Set<string>, primaryVersion: string): void {
  for (const version of unavailableVersions) {
    console.log(
      `  Note: no .mdaa/${version}/schemas — configs pinned to ${version} validate against the ${primaryVersion} schemas.`,
    );
    console.log(`        To generate them, run: ${cliCommandForVersion(version)} init --enhance .`);
  }
}

/** Add yaml-language-server schema directives to config files that don't have them */
export function injectSchemaDirectives(
  targetDir: string,
  schemasDest: string,
  configVersionMap: Map<string, string>,
): void {
  const yamlFiles = findYamlFiles(targetDir);
  const configModuleMap = buildConfigModuleMap(targetDir);
  // Versions a config binds to that have no local asset directory. Those configs fall
  // back to the primary schemas, which is a version mismatch worth reporting rather
  // than resolving silently — only this CLI's own schemas can be generated locally.
  const unavailableVersions = new Set<string>();

  for (const file of yamlFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    const fileDir = path.dirname(file);

    // Determine schema location — use version-specific assets if this project has them
    const fileVersion = configVersionMap.get(file);
    const versionedSchemaDir = findVersionedSchemaDir(targetDir, fileVersion);
    if (fileVersion && !versionedSchemaDir) unavailableVersions.add(fileVersion);
    const effectiveSchemaDir = versionedSchemaDir ?? schemasDest;
    const relToSchemas = path.relative(fileDir, effectiveSchemaDir);

    if (content.includes('yaml-language-server')) {
      // Already has a directive — just adjust the path
      content = content.replace(
        /# yaml-language-server: \$schema=.*\/@aws-mdaa\/(.+\.json)/,
        `# yaml-language-server: $schema=${relToSchemas}/@aws-mdaa/$1`,
      );
      fs.writeFileSync(file, content);
      continue;
    }

    // No directive — determine which schema to use
    const schemaName = determineSchemaName(path.basename(file), file, configModuleMap);
    if (!schemaName) continue;

    const schemaPath = path.join(effectiveSchemaDir, '@aws-mdaa', `${schemaName}.json`);
    if (!fs.existsSync(schemaPath)) continue;

    const relSchemaPath = `${relToSchemas}/@aws-mdaa/${schemaName}.json`;
    content = `# yaml-language-server: $schema=${relSchemaPath}\n${content}`;
    fs.writeFileSync(file, content);
  }

  // `schemasDest` is `.mdaa/<primary>/schemas`, so its parent names the primary version
  reportUnavailableVersions(unavailableVersions, path.basename(path.dirname(schemasDest)));
}
