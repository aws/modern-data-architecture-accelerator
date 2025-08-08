/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';

export interface ExecutionError {
  status: number;
  signal: string | null;
  message?: string;
}

export function executeCommand(cmd: string): void {
  require('child_process').execSync(cmd, {
    stdio: 'inherit', // inherit all stdio streams for real-time output
    env: process.env, // Inherit all environment variables including AWS credentials
  });
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
  console.error(`Is executable: ${!!(stats.mode & parseInt('111', 8))}`);
  console.error(`Is readable: ${!!(stats.mode & parseInt('444', 8))}`);
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
