/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import prompts = require('prompts');
import {
  getTemplatesDir,
  discoverStarterKits,
  copyDirRecursive,
  cleanRepoLinks,
  extractKitDescription,
} from './init-templates';
import { discoverPlaceholders, applyReplacementsToFile, applyReplacements } from './init-placeholders';
import { getSchemasDir, buildConfigVersionMap, injectSchemaDirectives, resolveModuleForConfig } from './init-schemas';
import {
  getDocsDir,
  copyRepoDirectDocs,
  generateGettingStartedContent,
  generateSteeringFiles,
  rewriteCanonicalReferences,
} from './init-steering';
import { CancelledError } from './exceptions';
import {
  resolveMdaaVersion,
  getCliVersion,
  pinMdaaVersion,
  upsertMdaaVersion,
  readMetadata,
  writeMetadata,
  pruneOldVersions,
  EXACT_VERSION_PATTERN,
  cliCommandForVersion,
} from './init-version';

export interface InitOptions {
  targetDir?: string;
  starterKit?: string;
  enhance: boolean;
  noPrompt: boolean;
  force: boolean;
}

/**
 * How writes treat a user-owned file that has been modified since MDAA generated it:
 * overwrite it (`force`), leave it (`noPrompt`), or ask. Carried as one value so it can be
 * threaded to the write path without growing every signature along the way.
 */
export interface WriteBehaviour {
  readonly force: boolean;
  readonly noPrompt: boolean;
}

/**
 * Add AI steering files, schemas, and documentation to an existing config directory.
 * Returns the version whose assets were written, for reporting.
 */
/**
 * Resolve which version's assets to write, and report the resolution. Returns the primary
 * version plus the per-config-file version map used for precise schema binding.
 */
function resolveAssetVersions(targetDir: string): { effectiveVersion: string; configVersionMap: Map<string, string> } {
  const mdaaVersion = resolveMdaaVersion(targetDir);
  const cliVersion = getCliVersion();
  const effectiveVersion = mdaaVersion || cliVersion;

  if (mdaaVersion) {
    console.log(`  Config pins mdaa_version: ${mdaaVersion}`);
  } else {
    console.log(`  Using local repo assets (CLI version: ${cliVersion})`);
  }
  console.log(`  Assets version: ${effectiveVersion}`);

  const configVersionMap = buildConfigVersionMap(targetDir);

  // An override is a config bound to something other than the primary version — comparing
  // against the *pin* instead reported overrides for a project with no pin at all, where
  // every module resolves to the CLI version.
  const versionModules = new Map<string, string[]>();
  for (const [file, version] of configVersionMap) {
    if (version === effectiveVersion) continue;
    const list = versionModules.get(version) || [];
    list.push(path.relative(targetDir, file));
    versionModules.set(version, list);
  }
  if (versionModules.size > 0) {
    console.log(`  Module version overrides detected:`);
    for (const [version, files] of versionModules) {
      console.log(`    ${version}: ${files.join(', ')}`);
    }
  }

  return { effectiveVersion, configVersionMap };
}

/** Copy the versioned schemas and docs, reporting what landed */
function copyVersionedAssets(targetDir: string, mdaaDir: string, configVersionMap: Map<string, string>): void {
  const effectiveVersion = path.basename(mdaaDir);

  // getSchemasDir throws when unresolvable, so reaching here means the schemas exist.
  const schemasDest = path.join(mdaaDir, 'schemas');
  copyDirRecursive(getSchemasDir(), schemasDest);
  console.log(`  Schemas: .mdaa/${effectiveVersion}/schemas/`);

  // Add or adjust schema directives in yaml files
  injectSchemaDirectives(targetDir, schemasDest, configVersionMap);

  const docsSource = getDocsDir();
  const docsDest = path.join(mdaaDir, 'docs');
  fs.mkdirSync(docsDest, { recursive: true });
  if (docsSource && fs.existsSync(docsSource)) {
    copyDirRecursive(docsSource, docsDest);
  } else {
    // Fallback: collect docs from repo directly into .mdaa/<version>/docs/
    copyRepoDirectDocs(docsDest);
  }
  // Docs are optional context rather than a hard requirement, but an empty docs/ would
  // otherwise be advertised in the summary and referenced by the generated steering.
  if (fs.readdirSync(docsDest).length === 0) {
    console.log(`  Note: no module docs available for ${effectiveVersion} — .mdaa/${effectiveVersion}/docs/ is empty.`);
  }
}

function enhanceDirectory(targetDir: string, kitName: string | undefined, behaviour: WriteBehaviour): string {
  const { effectiveVersion, configVersionMap } = resolveAssetVersions(targetDir);

  // Determine the .mdaa/<version>/ directory for the primary version
  const mdaaDir = path.join(targetDir, '.mdaa', effectiveVersion);
  fs.mkdirSync(mdaaDir, { recursive: true });

  copyVersionedAssets(targetDir, mdaaDir, configVersionMap);

  // Generate AI steering files (these stay at tool-expected locations).
  // Resolve kit name from metadata if not provided (enhance/upgrade path), and
  // load the generated-file manifest so writes can detect user modifications.
  const metadata = readMetadata(targetDir);
  const resolvedKitName = kitName || metadata.kitName;
  const generatedFiles = metadata.generatedFiles ?? {};
  generateSteeringFiles(targetDir, {
    kitName: resolvedKitName,
    version: effectiveVersion,
    manifest: generatedFiles,
    ...behaviour,
  });

  // Persist kit name and updated file hashes for future enhance/upgrade runs
  writeMetadata(targetDir, { kitName: resolvedKitName, generatedFiles });

  // Prune superseded .mdaa/<version>/ directories, keeping the primary version and
  // every version a config file binds to (those are live schema targets, not stale)
  pruneOldVersions(targetDir, new Set([effectiveVersion, ...configVersionMap.values()]));

  return effectiveVersion;
}

/**
 * Refuse to open an interactive prompt when there is no terminal to answer it.
 *
 * With stdin at EOF — CI, `< /dev/null`, a pipe — `prompts` renders the question and then
 * never settles: Node runs out of work and exits 0, so the run reports success while
 * having created nothing. There is no rejection to catch, so this has to be checked first.
 */
function requireTerminal(purpose: string, alternative: string): void {
  if (process.stdin.isTTY) return;
  console.error(`Error: ${purpose} requires an interactive terminal.`);
  console.error(alternative);
  process.exit(1);
}

/** Resolve which starter kit to use — from flag or interactive prompt */
async function resolveStarterKit(
  starterKit: string | undefined,
  availableKits: Array<{ name: string; description: string }>,
): Promise<string> {
  if (starterKit) {
    const valid = availableKits.find(k => k.name === starterKit);
    if (!valid) {
      console.error(`Error: Unknown starter kit "${starterKit}".\n`);
      console.log('Available kits:');
      availableKits.forEach(k => console.log(`  ${k.name}`));
      process.exit(1);
    }
    return starterKit;
  }

  requireTerminal('Selecting a starter kit', 'For non-interactive use, pass --starter-kit <name> --no-prompt.');

  console.log('\n🚀 Create MDAA Configuration\n');
  const docsBaseUrl = 'https://aws.github.io/modern-data-architecture-accelerator/starter_kits';
  const response = await prompts({
    type: 'select',
    name: 'kit',
    message: 'Select a starter kit:',
    choices: availableKits.map(k => ({
      title: k.name,
      description: `${k.description} (${docsBaseUrl}/${k.name}/)`,
      value: k.name,
    })),
  });

  if (!response.kit) {
    throw new CancelledError();
  }
  return response.kit;
}

/** Prompt for placeholder values and collect replacements */
async function promptForPlaceholders(tempDir: string): Promise<Record<string, string>> {
  const replacements: Record<string, string> = {};
  const placeholders = discoverPlaceholders(tempDir);
  if (placeholders.length === 0) return replacements;

  requireTerminal(
    'Filling in configuration placeholders',
    'For non-interactive use, pass --no-prompt and edit the TODOs afterwards.',
  );

  console.log(`\nFound ${placeholders.length} placeholder(s) to configure:\n`);

  for (const { placeholder, description } of placeholders) {
    if (description) {
      console.log(`  ${description}`);
    }
    const response = await prompts({
      type: 'text',
      name: 'value',
      message: `${placeholder}:`,
      initial: '',
    });

    // Cleanup is the caller's `finally`, so no manual rmSync here
    if (response.value === undefined) {
      throw new CancelledError();
    }

    if (response.value) {
      replacements[placeholder] = response.value;
    } else {
      console.log(`    Skipped — ${placeholder} will remain as a TODO in the config.`);
    }
  }
  return replacements;
}

function printNextSteps(userPath: string, projectDir: string, kitName?: string): void {
  console.log('\n✅ Done!\n');
  console.log('Next steps:\n');
  console.log(`  cd ${userPath}`);
  console.log('  1. Address any outstanding TODOs in config files');
  console.log(`  2. ${cliCommandForVersion(resolveMdaaVersion(projectDir))} deploy`);
  console.log('');
  console.log(`  Tip: Open ${userPath} in Kiro, VS Code with Copilot, or Claude Code.`);
  console.log('        The included AI steering files will guide you through filling');
  console.log('        TODOs, understanding Nag suppressions, and adding new modules.');
  console.log('');
  if (kitName) {
    console.log(`  Kit docs: https://aws.github.io/modern-data-architecture-accelerator/starter_kits/${kitName}/`);
  }
  console.log('  Docs: https://aws.github.io/modern-data-architecture-accelerator/');
  console.log('  Repo: https://github.com/aws/modern-data-architecture-accelerator');
  console.log('');
}

/** Add MDAA assets to an existing config project in place */
async function enhanceExistingProject(userPath: string, resolvedDir: string, options: InitOptions): Promise<void> {
  // Enhancing regenerates MDAA-owned files and prunes stale asset directories, so it
  // has to be aimed at an MDAA project. Without this, a mistyped path (`--enhance ~`)
  // overwrites whatever CLAUDE.md and .mdaa/ it finds there.
  if (!fs.existsSync(path.join(resolvedDir, 'mdaa.yaml'))) {
    console.error(`Error: ${resolvedDir} is not an MDAA config project (no mdaa.yaml).`);
    console.error('To scaffold a new project, run: mdaa init <new-directory>');
    process.exit(1);
  }

  if (!options.enhance && !options.noPrompt) {
    requireTerminal(
      'Confirming changes to an existing directory',
      'For non-interactive use, pass --enhance to skip the confirmation.',
    );
    const response = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `${userPath} already exists. Add AI steering, schemas, and docs to it?`,
      initial: true,
    });

    if (!response.confirm) {
      throw new CancelledError();
    }
  }

  console.log(`\nEnhancing ${userPath} with AI steering, schemas, and documentation...`);
  const version = enhanceDirectory(resolvedDir, options.starterKit, {
    force: options.force,
    noPrompt: options.noPrompt,
  });
  console.log('\n✅ Done!\n');
  printInventory(resolvedDir, version);
}

/**
 * Report what is actually on disk rather than a fixed list. The previous hardcoded
 * inventory claimed every category unconditionally, so a skipped or failed step still
 * printed as though it had landed.
 */
function printInventory(targetDir: string, version: string): void {
  const entries: Array<[string, string]> = [
    [path.join('.mdaa', version), `.mdaa/${version}/      Versioned schemas + module docs`],
    ['agent_rules', 'agent_rules/          Config-authoring rules'],
    [path.join('.kiro', 'steering'), '.kiro/steering/       Kiro AI steering files'],
    ['CLAUDE.md', '.claude/rules/, CLAUDE.md   Claude Code rules'],
    [path.join('.github', 'copilot-instructions.md'), '.github/              Copilot instructions'],
  ];
  const present = entries.filter(([relPath]) => fs.existsSync(path.join(targetDir, relPath)));
  if (present.length === 0) return;

  console.log('Added:');
  for (const [, label] of present) {
    console.log(`  - ${label}`);
  }
  console.log('');
}

/**
 * Whether a directory holds anything that scaffolding would overwrite.
 *
 * `git init proj && mdaa init proj --starter-kit minimal` is the commonest way to start, so
 * a bare repository must not read as occupied — nor must a stray `.DS_Store`. Scaffolding
 * writes none of these, so their presence is not a conflict.
 */
function isOccupied(dir: string): boolean {
  const ignored = new Set(['.git', '.gitignore', '.DS_Store']);
  return fs.existsSync(dir) && fs.readdirSync(dir).some(entry => !ignored.has(entry));
}

export async function runInit(options: InitOptions): Promise<void> {
  const { targetDir, starterKit, enhance, noPrompt } = options;

  if (!targetDir) {
    console.error('Error: Directory argument is required.\n');
    console.log('Usage: mdaa init [--starter-kit <name>] [--enhance] [--no-prompt] <directory>');
    process.exit(1);
  }

  const resolvedDir = path.resolve(targetDir);
  const dirExists = isOccupied(resolvedDir);

  // --enhance on non-existing dir is an error
  if (enhance && !dirExists) {
    console.error(`Error: Directory ${resolvedDir} does not exist or is empty. Nothing to enhance.`);
    process.exit(1);
  }

  // Scaffolding into a non-empty directory is refused, but with --enhance the kit name is
  // not a scaffolding request: it labels a project that has no .mdaa/metadata.json yet, so
  // its getting-started can name the kit instead of falling back to the generic text.
  if (starterKit && dirExists && !enhance) {
    console.error(`Error: Directory ${resolvedDir} already exists and is not empty.`);
    console.error('Cannot scaffold a starter kit into a non-empty directory.');
    console.error('To label an existing project with its kit, add --enhance.');
    process.exit(1);
  }

  // --no-prompt without --starter-kit on new dir is an error (would hang or silently cancel)
  if (noPrompt && !starterKit && !dirExists) {
    console.error('Error: --no-prompt requires --starter-kit when creating a new directory.\n');
    console.log('Available kits:');
    discoverStarterKits(getTemplatesDir()).forEach(k => console.log(`  ${k.name}`));
    process.exit(1);
  }

  // Existing directory → enhance
  if (dirExists) {
    await enhanceExistingProject(targetDir, resolvedDir, options);
    return;
  }

  // New directory → scaffold
  await scaffoldNewConfig(targetDir, resolvedDir, options);
}

async function scaffoldNewConfig(userPath: string, resolvedOutputDir: string, options: InitOptions): Promise<void> {
  const { starterKit, noPrompt } = options;
  const templatesDir = getTemplatesDir();
  const availableKits = discoverStarterKits(templatesDir);
  const selectedKit = await resolveStarterKit(starterKit, availableKits);

  const templateDir = path.join(templatesDir, selectedKit);
  if (!fs.existsSync(templateDir)) {
    console.error(`Error: Template not found at ${templateDir}`);
    process.exit(1);
  }

  // Copy template to temp location to discover placeholders before committing
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-'));
  // Every step that writes into the output directory runs inside the try: a failure part
  // way through (ENOSPC, EACCES, a throw in injectSchemaDirectives) would otherwise leave
  // a half-written directory behind, and the next attempt refuses to scaffold into a
  // non-empty directory — so the user would have to delete it by hand to retry.
  let outputCreated = false;
  try {
    copyDirRecursive(templateDir, tempDir);

    // Prompt for placeholder values (unless --no-prompt)
    const replacements = noPrompt ? {} : await promptForPlaceholders(tempDir);

    // All prompts complete — create the output directory
    console.log(`\nCreating ${selectedKit} in ${resolvedOutputDir}...`);
    outputCreated = true;
    copyDirRecursive(tempDir, resolvedOutputDir);

    // Apply placeholder replacements and clean comment prefixes
    applyReplacements(resolvedOutputDir, replacements);

    // Pin mdaa_version in the generated mdaa.yaml
    pinMdaaVersion(resolvedOutputDir);

    // Enhance the output directory (schemas, docs, steering)
    // Nothing in a directory this run just created can be user-modified, so force is safe
    enhanceDirectory(resolvedOutputDir, selectedKit, { force: true, noPrompt });

    // Clean up repo-relative links in the kit README
    cleanRepoLinks(resolvedOutputDir);
  } catch (err) {
    if (outputCreated) {
      fs.rmSync(resolvedOutputDir, { recursive: true, force: true });
      console.error(`  Removed the partially created ${userPath}.`);
    }
    throw err;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  printNextSteps(userPath, resolvedOutputDir, selectedKit);
}

/**
 * The version `upgrade` may write, or exit non-zero explaining why it may not.
 *
 * The value is written into mdaa.yaml and names the `.mdaa/<version>/` directory, and the
 * assets themselves come from the *installed* CLI — so it must be an exact version, and it
 * must be this CLI's version. Anything else would pin a version whose assets were never
 * generated.
 */
function validatedUpgradeTarget(targetVersion?: string): string {
  const cliVersion = getCliVersion();
  const newVersion = targetVersion || cliVersion;

  if (newVersion === 'unknown') {
    console.error('Error: Could not determine target version. Specify one explicitly: mdaa upgrade 1.8.0');
    process.exit(1);
  }

  if (!EXACT_VERSION_PATTERN.test(newVersion)) {
    console.error(`Error: Invalid target version ${JSON.stringify(newVersion)}.`);
    console.error('Specify an exact version, e.g. mdaa upgrade 1.8.0.');
    console.error('Note: upgrade takes a version, not a directory — run it from the project root.');
    process.exit(1);
  }

  if (newVersion !== cliVersion) {
    console.error(`Error: Cannot generate ${newVersion} assets from CLI ${cliVersion}.`);
    console.error(`Schemas and docs come from the installed CLI, so pinning ${newVersion} here would`);
    console.error(`write ${cliVersion} assets into .mdaa/${newVersion}/.`);
    console.error(`Run: ${cliCommandForVersion(newVersion)} upgrade`);
    process.exit(1);
  }

  return newVersion;
}

/**
 * Upgrade the project's mdaa_version and refresh all .mdaa/ assets.
 * If no version is specified, uses the currently installed CLI version.
 *
 * `force` carries the same meaning as on init: MDAA-owned files are always
 * regenerated, while user-owned files (CLAUDE.md, copilot-instructions.md) that
 * have been modified since generation prompt before being overwritten. Upgrade is
 * the routine version-maintenance command, so it must not be the one path that
 * bypasses that protection.
 */
export async function runUpgrade(targetVersion?: string, force = false, noPrompt = false): Promise<void> {
  const behaviour: WriteBehaviour = { force, noPrompt };
  const cwd = process.cwd();
  const mdaaYamlPath = path.join(cwd, 'mdaa.yaml');

  if (!fs.existsSync(mdaaYamlPath)) {
    console.error('Error: No mdaa.yaml found in the current directory.');
    console.error('Run this command from an MDAA config project root.');
    process.exit(1);
  }

  const newVersion = validatedUpgradeTarget(targetVersion);

  const currentVersion = resolveMdaaVersion(cwd);
  if (currentVersion === newVersion) {
    // Not a no-op: the pin can already be current while .mdaa/ is missing or partial
    // (deleted by hand, or an interrupted earlier run), and upgrade is the command
    // users reach for to repair it. Refreshing is idempotent.
    console.log(`Already at version ${newVersion}. Refreshing assets...`);
    enhanceDirectory(cwd, undefined, behaviour);
    console.log(`\n✅ Assets refreshed for ${newVersion}.`);
    return;
  }

  const fromClause = currentVersion ? ` from ${currentVersion}` : '';
  console.log(`Upgrading${fromClause} to ${newVersion}...`);

  // Update mdaa_version in mdaa.yaml (shared placement logic with pinMdaaVersion).
  // The pin has to be written first because enhanceDirectory reads it back to decide
  // which .mdaa/<version>/ to populate — so if the refresh fails, roll it back rather
  // than leaving the project pinned to a version whose assets were never generated.
  const originalYaml = fs.readFileSync(mdaaYamlPath, 'utf-8');
  fs.writeFileSync(mdaaYamlPath, upsertMdaaVersion(originalYaml, newVersion));
  console.log(`  Updated mdaa_version to "${newVersion}" in mdaa.yaml`);

  // Re-enhance to refresh schemas, docs, steering, and prune old versions
  console.log('  Refreshing assets...');
  try {
    enhanceDirectory(cwd, undefined, behaviour);
  } catch (err) {
    fs.writeFileSync(mdaaYamlPath, originalYaml);
    console.error(`  Asset refresh failed — restored mdaa_version to ${currentVersion ?? 'unset'}.`);
    throw err;
  }

  console.log(`\n✅ Upgraded to ${newVersion}.`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review any schema validation warnings in config files');
  console.log('  2. Check CHANGELOG for breaking changes');
  console.log(`  3. ${cliCommandForVersion(newVersion)} deploy`);
  console.log('');
}

/** @internal Exported for unit testing only */
export const _testing = {
  applyReplacementsToFile,
  injectSchemaDirectives,
  resolveModuleForConfig,
  generateGettingStartedContent,
  buildConfigVersionMap,
  cleanRepoLinks,
  extractKitDescription,
  getTemplatesDir,
  rewriteCanonicalReferences,
};
