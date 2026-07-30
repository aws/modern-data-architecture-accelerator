/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cross-platform build script for the MDAA CLI package.
 *
 * Design:
 *   - On POSIX (Linux/macOS): delegates to build_package.sh in the same
 *     directory, preserving byte-identical behavior with the rest of the
 *     monorepo (including MDAA_BUILD_CODE_ONLY short-circuit, SCHEMA.md
 *     generation via ensure_python_env.sh, etc.).
 *   - On Windows: mirrors the same 5 steps that build_package.sh performs,
 *     using Node child_process with shell:true so .cmd shims resolve.
 *
 * Usage: node ../../scripts/build/build_cli_package.js <ConfigClassName>
 * Must be invoked from the package root directory (cwd = packages/cli/).
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const configClass = process.argv[2];
const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, '..', '..');

if (process.platform !== 'win32') {
  // ─── POSIX: delegate to the canonical bash script ───────────────────────────
  // This ensures POSIX builds stay byte-identical to main and pick up any
  // future changes to build_package.sh (schema flags, python env, etc.).
  const shPath = path.join(scriptDir, 'build_package.sh');
  const result = spawnSync('bash', [shPath, configClass || ''], {
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

// ─── Windows: mirror build_package.sh steps ─────────────────────────────────

/**
 * Run a command with shell:true (resolves .cmd shims on Windows).
 * Exits the process on failure.
 */
function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
    ...opts,
  });
  if (result.status !== 0) {
    const code = result.status === null ? 1 : result.status;
    console.error(`Command failed (exit ${code}): ${cmd} ${args.join(' ')}`);
    process.exit(code);
  }
}

// Step 1: Compile TypeScript
run('npx', ['tsc']);

// MDAA_BUILD_CODE_ONLY short-circuit — compile only, skip schema & docs.
// The CLI sets this at deploy time (prepLocalPackage) to avoid rebuilding
// schemas/docs for local modules that just need JS output.
if (process.env.MDAA_BUILD_CODE_ONLY === 'true') {
  process.exit(0);
}

if (!configClass) {
  console.error('Error: Config class name is required');
  console.error('Usage: node build_cli_package.js <ConfigClassName>');
  process.exit(1);
}

// Step 2: Generate config-schema.json via typescript-json-schema
const nodeModules = path.join(repoRoot, 'node_modules');
const schemaArgs = [
  'typescript-json-schema',
  '--required',
  '--noExtraProps',
  'tsconfig.json',
  configClass,
  '--include', 'lib/*.ts',
  '--include', path.join(nodeModules, '@types/**/*.ts'),
  '--include', 'lib/config-schema.json',
];
const schemaResult = spawnSync('npx', schemaArgs, {
  shell: true,
  env: process.env,
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024,
});
if (schemaResult.status !== 0) {
  console.error('typescript-json-schema failed:');
  if (schemaResult.stderr) console.error(schemaResult.stderr);
  process.exit(schemaResult.status === null ? 1 : schemaResult.status);
}
fs.writeFileSync(path.join(process.cwd(), 'lib', 'config-schema.json'), schemaResult.stdout);

// Step 3: Copy schema to central schemas directory
const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
const schemasDir = path.join(repoRoot, 'schemas');
fs.copyFileSync(
  path.join(process.cwd(), 'lib', 'config-schema.json'),
  path.join(schemasDir, `${pkgJson.name}.json`),
);

// Step 4: Generate SCHEMA.md documentation via Python
// Try python3, then python, then py -3 (Windows Python Launcher).
// Unlike build_package.sh, this does not auto-create a venv (ensure_python_env.sh
// relies on bash `source` and uv, neither of which is guaranteed on Windows) —
// it probes for an existing Python with json_schema_for_humans installed.
// If none found or the module is missing, FAIL — silent staleness is the bug
// this script was created to prevent.
const jsfhConf = path.join(repoRoot, 'scripts', 'generate_docs', 'jsfh-conf.yaml');
const pythonCandidates = ['python3', 'python', 'py'];

let pythonFound = false;
for (const pyCmd of pythonCandidates) {
  const pyArgs = pyCmd === 'py'
    ? ['-3', '-m', 'json_schema_for_humans.cli', '--config-file', jsfhConf, 'lib/config-schema.json', 'SCHEMA.md']
    : ['-m', 'json_schema_for_humans.cli', '--config-file', jsfhConf, 'lib/config-schema.json', 'SCHEMA.md'];

  const pyResult = spawnSync(pyCmd, pyArgs, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  // Command not found: without a shell spawnSync reports ENOENT, but with
  // shell:true cmd.exe instead exits 9009 ("not recognized as an internal or
  // external command"). Treat both as "try the next candidate".
  if ((pyResult.error && pyResult.error.code === 'ENOENT') || pyResult.status === 9009) {
    continue;
  }
  if (pyResult.status === 0) {
    pythonFound = true;
    break;
  }
  // Python found but module or execution failed
  console.error(`SCHEMA.md generation failed with ${pyCmd} (exit ${pyResult.status}).`);
  console.error(
    "Ensure 'json_schema_for_humans' is installed. Run 'npm run python-install' from the repo root.",
  );
  process.exit(pyResult.status === null ? 1 : pyResult.status);
}

if (!pythonFound) {
  console.error('Error: No Python interpreter found (tried: python3, python, py -3).');
  console.error("Install Python 3 and run 'npm run python-install' to install required packages.");
  process.exit(1);
}
