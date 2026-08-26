/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from './mdaa-deploy';
import { runInit, runUpgrade } from './mdaa-init';
import { CancelledError } from './exceptions';
// nosemgrep
import * as pjson from '../package.json';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const commandLineArgs = require('command-line-args');

/**
 * Actions handled by {@link MdaaDeploy}. An allowlist rather than a fallthrough, so an
 * unknown verb is reported here instead of being passed to cdk as if it were one.
 */
const DEPLOY_ACTIONS = new Set(['synth', 'diff', 'deploy', 'destroy', 'list', 'ls']);

const optionDefinitions = [
  {
    name: 'config',
    alias: 'c',
    type: String,
    defaultValue: './mdaa.yaml',
    description: 'Optional - The path to the MDAA config file.',
  },
  {
    name: 'action',
    alias: 'a',
    type: String,
    defaultOption: true,
    description: "Required - One of 'init','upgrade','synth','diff','deploy','destroy','list','ls'.",
  },
  {
    name: 'domain',
    alias: 'd',
    type: String,
    description:
      'Optional - If specified, only matching domains (by name) will be processed. Multiple values can be specified as comma separated.',
  },
  {
    name: 'env',
    alias: 'e',
    type: String,
    description:
      'Optional - If specified, only matching envs (by name) will be processed. Multiple values can be specified as comma separated.',
  },
  {
    name: 'module',
    alias: 'm',
    type: String,
    description:
      'Optional - If specified, only matching modules (by name) will be processed. Multiple values can be specified as comma separated.',
  },
  {
    name: 'tag',
    alias: 't',
    type: String,
    description: 'Optional - If specified, value will be passed to NPM as a dist-tag during package installation.',
  },
  {
    name: 'role-arn',
    alias: 'r',
    type: String,
    description: 'Optional - If specified, will be passed to the -r (--roleArn) parameter of the CDK command.',
  },
  {
    name: 'role_arn',
    type: String,
    description: 'Optional - Backwards compatible alias for --role-arn',
  },
  {
    name: 'working-dir',
    alias: 'w',
    type: String,
    description: 'Optional - Override the working dir location (default ./mdaa_working)',
  },
  {
    name: 'working_dir',
    type: String,
    description: 'Optional - Backwards compatible alias for --working_dir',
  },
  {
    name: 'clear',
    alias: 'x',
    type: Boolean,
    description: 'Optional - Clears working directory of all installed packages.',
  },
  {
    name: 'mdaa-version',
    alias: 'u',
    type: String,
    description: 'Optional - Specify the MDAA module version to be used.',
  },
  {
    name: 'mdaa_version',
    type: String,
    description: 'Optional - Backwards compatible alias for --mdaa-version',
  },
  {
    name: 'version',
    alias: 'v',
    type: Boolean,
    description: 'Provides information about the installed MDAA version',
  },
  {
    name: 'npm-debug',
    alias: 'n',
    type: Boolean,
    description: 'Optional - Runs all NPM commands in debug mode',
  },
  {
    name: 'npm_debug',
    type: Boolean,
    description: 'Optional - Backwards compatible alias for --npm-debug.',
  },
  {
    name: 'local-mode',
    alias: 'l',
    type: Boolean,
    description: 'MDAA code will be executed from local source code instead of from installed NPM packages',
  },
  {
    name: 'local_mode',
    type: Boolean,
    description: 'Optional - Backwards compatible alias for --local-mode.',
  },
  {
    name: 'devops',
    alias: 'p',
    type: Boolean,
    description: 'Deploys MDAA DevOps Resources and Pipelines.',
  },
  {
    name: 'cdk-verbose',
    alias: 'b',
    type: Boolean,
    description: 'Increase CDK cli verbosity',
  },
  {
    name: 'cdk_verbose',
    type: Boolean,
    description: 'Optional - Backwards compatible alias for --cdk-verbose.',
  },
  {
    name: 'nofail',
    alias: 'f',
    type: Boolean,
    description: 'Continue execution after failure',
  },
  {
    name: 'cdk-out',
    alias: 'k',
    type: String,
    description: 'Optional - Override the CDK output directory (default uses working-dir/cdk.out)',
  },
  {
    name: 'baseline',
    alias: 'B',
    type: String,
    description:
      'Optional - For diff action, compare against baseline templates in this directory instead of deployed stacks',
  },
  {
    name: 'diff-out',
    alias: 'D',
    type: String,
    description:
      'Optional - For diff action, write diff output for each module to files in this directory instead of console',
  },
  // init options
  {
    name: 'starter-kit',
    type: String,
    description: 'Optional - Starter kit name for init action.',
  },
  {
    name: 'enhance',
    type: Boolean,
    description: 'Optional - Enhance an existing config directory without prompting (init action).',
  },
  {
    name: 'no-prompt',
    type: Boolean,
    description: 'Optional - Skip interactive prompts (init action, requires --starter-kit).',
  },
  {
    name: 'force',
    alias: 'F',
    type: Boolean,
    description: 'Optional - Overwrite user-owned files without prompting (init/upgrade action).',
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Prints this help.',
  },
  {
    name: 'testing',
    type: Boolean,
    description: 'Testing mode - prints CDK commands without executing them.',
  },
];

const options = commandLineArgs(optionDefinitions, { partial: true });

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
    console.log('Usage: mdaa init [--starter-kit <name>] [--enhance] [--no-prompt] [--force] <directory>\n');
    console.log('Options:');
    console.log('  --starter-kit <name>   Use a specific starter kit (skip selection prompt)');
    console.log('  --enhance              Add AI steering/schemas to an existing config directory');
    console.log('  --no-prompt            Skip interactive prompts (requires --starter-kit for new dirs)');
    console.log('  --force, -F            Overwrite modified MDAA-owned files without prompting');
    console.log('');
  } else if (action === 'upgrade') {
    console.log('Usage: mdaa upgrade [--force] [version]\n');
    console.log('Upgrades mdaa_version in mdaa.yaml and refreshes .mdaa/ assets (schemas, docs, steering).');
    console.log('If no version is specified, upgrades to the currently installed CLI version.');
    console.log('Schemas and docs come from the installed CLI, so [version] must match it —');
    console.log('to move to another version, run: npx @aws-mdaa/cli@<version> upgrade\n');
    console.log('Options:');
    console.log('  --force, -F            Overwrite modified user-owned files without prompting');
    console.log('');
  } else {
    console.table(optionDefinitions, ['name', 'alias', 'description']);
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
  const flagLike = unknown.filter(arg => arg.startsWith('-'));
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
    force: options['force'] || false,
  }).catch(exitFromError);
} else if (action === 'upgrade') {
  const targetVersion: string | undefined = positionalsOrExit()[0];
  runUpgrade(targetVersion, options['force'] || false, options['no-prompt'] || false).catch(exitFromError);
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
