/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from './mdaa-deploy';
import { runInit, runUpgrade } from './mdaa-init';
import {
  BASE_OPTION_DEFINITIONS,
  DEPLOY_ACTIONS,
  INIT_OPTION_DEFINITIONS,
  flagLikeTokens,
  parseCliOptions,
} from './cli-options';
import { CancelledError } from './exceptions';
// nosemgrep
import * as pjson from '../package.json';

const options = parseCliOptions();

// Normalize hyphenated options to underscore format for backward compatibility
if (options['role-arn'] && !options['role_arn']) {
  options['role_arn'] = options['role-arn'];
}
if (options['working-dir'] && !options['working_dir']) {
  options['working_dir'] = options['working-dir'];
}
if (options['mdaa-version'] && !options['mdaa_version']) {
  options['mdaa_version'] = options['mdaa-version'];
}
if (options['npm-debug'] && !options['npm_debug']) {
  options['npm_debug'] = options['npm-debug'];
}
if (options['local-mode'] && !options['local_mode']) {
  options['local_mode'] = options['local-mode'];
}
if (options['cdk-verbose'] && !options['cdk_verbose']) {
  options['cdk_verbose'] = options['cdk-verbose'];
}

console.log(`MDAA Version: ${pjson.version}`);
if (options['version']) {
  process.exit(0);
}

// Route based on action
const action: string = options['action'] || '';

// `mdaa help` lands here too: `help` is captured as the positional action, and a user
// typing it wants usage, not an unknown-action error.
if (options['help'] || action === 'help') {
  if (action === 'init') {
    console.log('Usage: mdaa init [--starter-kit <name>] [--enhance] [--no-prompt] [--overwrite] <directory>\n');
    console.log('Options:');
    console.log('  --starter-kit <name>   Use a specific starter kit (skip selection prompt)');
    console.log('  --enhance              Add AI steering/schemas to an existing config directory');
    console.log('  --no-prompt            Skip interactive prompts (requires --starter-kit for new dirs)');
    console.log('  --overwrite            Overwrite modified user-owned files without prompting');
    console.log('');
  } else if (action === 'upgrade') {
    console.log('Usage: mdaa upgrade [--overwrite] [--no-prompt] [version]\n');
    console.log('Upgrades mdaa_version in mdaa.yaml and refreshes .mdaa/ assets (schemas, docs, steering).');
    console.log('If no version is specified, upgrades to the currently installed CLI version.');
    console.log('Schemas and docs come from the installed CLI, so [version] must match it —');
    console.log('to move to another version, run: npx @aws-mdaa/cli@<version> upgrade\n');
    console.log('Options:');
    console.log('  --overwrite            Overwrite modified user-owned files without prompting');
    console.log('  --no-prompt            Leave modified user-owned files untouched instead of prompting');
    console.log('');
  } else {
    // Two tables rather than one: only init and upgrade accept the second set, and every other
    // action forwards those spellings to cdk instead of acting on them.
    console.log('Options for all actions:');
    console.table(BASE_OPTION_DEFINITIONS, ['name', 'alias', 'description']);
    console.log('Additional options for init and upgrade:');
    console.table(INIT_OPTION_DEFINITIONS, ['name', 'alias', 'description']);
  }
  process.exit(0);
}

/**
 * Leftover argv for the init/upgrade actions, with unrecognised flags rejected.
 *
 * `commandLineArgs({ partial: true })` puts unrecognised *flags* and surplus positionals
 * into the same `_unknown` array in argv order, so taking `_unknown[0]` as the positional
 * silently accepts a typo: `mdaa init --starterkit minimal ./proj` would scaffold a
 * directory literally named `--starterkit` and report success. Deploy actions still pass
 * `_unknown` through untouched, since those are forwarded to cdk on purpose.
 */
function positionalsOrExit(): string[] {
  const unknown: string[] = options['_unknown'] ?? [];
  const flagLike = flagLikeTokens(unknown);
  if (flagLike.length > 0) {
    console.error(`Error: Unknown option${flagLike.length > 1 ? 's' : ''}: ${flagLike.join(', ')}`);
    console.error(`Run \`mdaa ${action} --help\` to see the options this action accepts.`);
    process.exit(1);
  }
  return unknown;
}

/** Map a rejected run to an exit status: 130 for a user cancellation, 1 for a failure. */
function exitFromError(err: Error): never {
  if (err instanceof CancelledError) {
    console.log(err.message);
    process.exit(130);
  }
  console.error(`Error: ${err.message}`);
  process.exit(1);
}

if (action === 'init') {
  const targetDir: string | undefined = positionalsOrExit()[0];
  runInit({
    targetDir,
    starterKit: options['starter-kit'],
    enhance: options['enhance'] || false,
    noPrompt: options['no-prompt'] || false,
    overwrite: options['overwrite'] || false,
  }).catch(exitFromError);
} else if (action === 'upgrade') {
  const targetVersion: string | undefined = positionalsOrExit()[0];
  runUpgrade(targetVersion, options['overwrite'] || false, options['no-prompt'] || false).catch(exitFromError);
} else if (DEPLOY_ACTIONS.has(action)) {
  const mdaa = new MdaaDeploy(options, options['_unknown']);
  mdaa.sanityCheck();
  mdaa.deploy();
} else {
  // Bare `mdaa`, `mdaa help`, or a typo. Previously these fell through to the deploy
  // branch, where `MdaaDeploy`'s constructor threw a raw stack trace for a missing action,
  // and any unknown verb was handed to cdk — both first impressions for a new user.
  console.error(action ? `Error: Unknown action '${action}'.\n` : 'Error: An action is required.\n');
  console.log(`Actions: ${[...DEPLOY_ACTIONS].join(', ')}, init, upgrade`);
  console.log('Run `mdaa --help` for the full option list, or `mdaa <action> --help` for one action.');
  process.exit(1);
}
