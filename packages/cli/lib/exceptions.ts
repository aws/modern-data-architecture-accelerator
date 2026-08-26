/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The user aborted an interactive prompt (declined, or Ctrl-C / EOF).
 *
 * Thrown rather than calling `process.exit` at the prompt so cleanup handlers still run,
 * and so the entry point can exit 130 — the SIGINT convention. Exiting 0 made a cancelled
 * run indistinguishable from a successful one to any wrapper script.
 */
export class CancelledError extends Error {
  constructor(message = 'Cancelled.') {
    super(message);
    this.name = 'CancelledError';
  }
}

export class DuplicateAccountLevelModulesException<T> implements Error {
  constructor(readonly duplicates: T[]) {
    this.message = `Found account-level modules that will be deployed more than once`;
    this.name = 'DuplicateAccountLevelModulesException';
  }

  message: string;
  name: string;
}
