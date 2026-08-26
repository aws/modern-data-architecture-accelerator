/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import { defaultShell } from './platform-utils';
import { SafeCommand } from './safe-command';

export interface ExecutionError {
  /** Numeric status code indicating the exit status of the failed command execution enabling */
  readonly status: number;
  readonly signal: string | null;
  /** Error message providing detailed information about command execution failures in the MDAA CLI */
  readonly message?: string;
}

export function executeCommand(cmd: SafeCommand): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { execSync } = require('node:child_process'); // NOSONAR
  const execOptions = {
    stdio: 'inherit' as const, // inherit all stdio streams for real-time output
    env: process.env, // Inherit all environment variables including AWS credentials
    shell: defaultShell(),
  };
  execSync(cmd, execOptions); // NOSONAR
}

export interface CapturedOutput {
  /** Child stdout only — kept separate so callers parsing output aren't fed warnings */
  stdout: string;
  stderr: string;
  /**
   * Child exit status, or -1 when the child was killed by a signal or never ran. A
   * signal-killed child reports `status: null`, which must not read as success.
   */
  exitCode: number;
  /** Set when the child was killed by a signal (including a timeout's SIGTERM) */
  signal: string | null;
  /** Set when the child could not be spawned, or was killed by a timeout (ETIMEDOUT) */
  error?: Error;
}

export interface CaptureOptions {
  /** Kill the child after this many ms. Unbounded when omitted. */
  readonly timeoutMs?: number;
}

export function executeCommandWithCapture(cmd: SafeCommand, options?: CaptureOptions): CapturedOutput {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { spawnSync } = require('node:child_process');

  // Use shell to execute the command
  const spawnOptions = {
    shell: defaultShell(),
    encoding: 'utf-8',
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    ...(options?.timeoutMs ? { timeout: options.timeoutMs } : {}),
  };
  const result = spawnSync(cmd, spawnOptions); // NOSONAR

  const signal = result.signal ?? null;
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    // `status` is null for a signal kill and for a spawn failure; treating either as 0
    // would report a killed child as a successful one and cache its partial output.
    exitCode: result.status ?? (signal || result.error ? -1 : 0),
    signal,
    error: result.error,
  };
}

export function logExecutionError(execError: unknown): void {
  if (!isExecutionError(execError)) {
    return;
  }

  console.error(`Exit code: ${execError.status}`);
  if (execError.signal) {
    console.error(`Signal: ${execError.signal}`);
  }
  if (execError.message) {
    console.error(`Error message: ${execError.message}`);
  }
}

export function isExecutionError(error: unknown): error is ExecutionError {
  return error !== null && typeof error === 'object' && 'status' in error;
}

export function analyzeScriptFile(cmd: string): void {
  if (!cmd.includes('.sh')) {
    return;
  }

  const scriptMatch = cmd.match(/(\S+\.sh)/); // NOSONAR
  if (!scriptMatch) {
    return;
  }

  const scriptPath = scriptMatch[1];
  logScriptAnalysis(scriptPath);
}

export function logScriptAnalysis(scriptPath: string): void {
  try {
    const stats = fs.statSync(scriptPath);
    logScriptStats(scriptPath, stats);
  } catch (fsError) {
    logScriptError(scriptPath, fsError);
  }
}

export function logScriptStats(scriptPath: string, stats: fs.Stats): void {
  console.error(`\n=== Script File Analysis ===`);
  console.error(`Script path: ${scriptPath}`);
  console.error(`File exists: true`);
  console.error(`File size: ${stats.size} bytes`);
  console.error(`File permissions: ${stats.mode.toString(8)}`);
  console.error(`Is executable: ${!!(stats.mode & Number.parseInt('111', 8))}`);
  console.error(`Is readable: ${!!(stats.mode & Number.parseInt('444', 8))}`);
}

export function logScriptError(scriptPath: string, fsError: unknown): void {
  console.error(`\n=== Script File Analysis ===`);
  console.error(`Script path: ${scriptPath}`);
  console.error(`File access error: ${fsError}`);
}

export function logImmediate(message: string): void {
  // Use process.stdout.write for immediate output without buffering issues
  process.stdout.write(message + '\n');
}
