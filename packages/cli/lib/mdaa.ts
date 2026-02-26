/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from './mdaa-cli';
// nosemgrep
import * as pjson from '../package.json';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const commandLineArgs = require('command-line-args');

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
    description: "Required - One of 'synth','diff','deploy', 'dryrun', 'destroy', 'list'.",
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
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Prints this help.',
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

if (options['help']) {
  // Display concise display of information for better user experience
  console.table(optionDefinitions, ['name', 'alias', 'description']);
  process.exit(0);
}

const mdaa = new MdaaDeploy(options, options['_unknown']);
mdaa.sanityCheck();
mdaa.deploy();
