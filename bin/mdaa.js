#!/usr/bin/env node
// @ts-check
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path');
const { execSync } = require('child_process');

/** @type {string} */
const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, '..');

// Check node version
require(path.resolve(repoRoot, 'packages', 'cli', 'scripts', 'check_node_version.js'));

console.log('');
console.log('Running NPM Install for MDAA Repo');
execSync('npm install --no-save --quiet', { cwd: repoRoot, stdio: 'inherit' });

console.log('');
console.log('Building MDAA CLI');
console.log('');
// One-shot CLI build, so the nx daemon adds no value; disabling it also suppresses
// nx's interactive "Install Nx Console?" prompt. Passed via the env rather than a
// shell `VAR=value` prefix so this works on cmd.exe as well as POSIX.
const env = Object.assign({}, process.env, {
  JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION: '1',
  MDAA_BUILD_CODE_ONLY: 'true',
  NX_DAEMON: 'false',
});
execSync('npx nx run "@aws-mdaa/cli:build" --output-style=static', { cwd: repoRoot, stdio: 'inherit', env });

// Run the CLI
const args = process.argv
  .slice(2)
  .map(a => `"${a}"`)
  .join(' ');
const cliEntry = path.resolve(repoRoot, 'packages', 'cli', 'lib', 'mdaa');
execSync(`node "${cliEntry}" ${args}`, { cwd: process.cwd(), stdio: 'inherit', env: process.env });
