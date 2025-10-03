/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';

export interface ExecutionError {
  /**
   * Q-ENHANCED-PROPERTY
   * Required numeric status code indicating the exit status of the failed command execution enabling programmatic error handling. Provides the process exit code for command execution failures allowing automated error detection and appropriate response handling in MDAA CLI operations.
   *
   * Use cases: Exit code handling; Programmatic error detection; Automated response; Error classification
   *
   * AWS: Process exit codes from AWS CLI, CDK, and CloudFormation operations
   *
   * Validation: Must be numeric exit status code; required for error classification and handling
   **/
  readonly status: number;
  readonly signal: string | null;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional error message providing detailed information about command execution failures in the MDAA CLI. Contains descriptive text explaining the nature of the execution error, command failure reasons, or system-level issues encountered during MDAA deployment operations and configuration processing.
   *
   * Use cases: Error reporting; Debugging assistance; Failure diagnosis; User feedback; Troubleshooting guidance
   *
   * AWS: CLI error handling and logging for AWS CDK and service deployment operations
   *
   * Validation: Optional string containing human-readable error description; used for diagnostic and user feedback purposes
   **/
  readonly message?: string;
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
