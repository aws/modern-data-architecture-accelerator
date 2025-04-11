/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from './mdaa-cli';

const commandLineArgs = require('command-line-args');
// nosemgrep
const pjson = require('../package.json');

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
    name: 'role_arn',
    alias: 'r',
    type: String,
    description: 'Optional - If specified, will be passed to the -r (--roleArn) parameter of the CDK command.',
  },
  {
    name: 'working_dir',
    alias: 'w',
    type: String,
    description: 'Optional - Override the working dir location (default ./mdaa_working)',
  },
  {
    name: 'clear',
    alias: 'x',
    type: Boolean,
    description: 'Optional - Clears working directory of all installed packages.',
  },
  {
    name: 'mdaa_version',
    alias: 'u',
    type: String,
    description: 'Optional - Specify the MDAA module version to be used.',
  },
  {
    name: 'version',
    alias: 'v',
    type: Boolean,
    description: 'Provides information about the installed MDAA version',
  },
  {
    name: 'npm_debug',
    alias: 'n',
    type: Boolean,
    description: 'Optional - Runs all NPM commands in debug mode',
  },
  {
    name: 'local_mode',
    alias: 'l',
    type: Boolean,
    description: 'MDAA code will be executed from local source code instead of from installed NPM packages',
  },
  {
    name: 'devops',
    alias: 'p',
    type: Boolean,
    description: 'Deploys MDAA DevOps Resources and Pipelines.',
  },
  {
    name: 'cdk_verbose',
    alias: 'b',
    type: Boolean,
    description: 'Increase CDK cli verbosity',
  },
  {
    name: 'nofail',
    alias: 'f',
    type: Boolean,
    description: 'Continue execution after failure',
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Prints this help.',
  },
];

const options = commandLineArgs(optionDefinitions, { partial: true });

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
mdaa.deploy();
