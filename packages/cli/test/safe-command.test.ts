/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { staticCommand, unsafeCommand, joinCommands, SafeCommand } from '../lib/safe-command';

// safe-command.ts is the core primitive of the shell-safety design: the
// `SafeCommand` brand and its four producers. The brand is compile-time only (its
// rejection of raw strings at the executors is pinned in test/types.negative.ts),
// so these runtime tests assert the producers' value behavior — the pass-through
// of staticCommand/unsafeCommand and joinCommands' separator handling — which the
// consumers only exercise indirectly.
describe('safe-command producers', () => {
  describe('staticCommand', () => {
    it('returns its literal argument verbatim', () => {
      expect(staticCommand('terraform init')).toBe('terraform init');
      expect(staticCommand('-auto-approve')).toBe('-auto-approve');
    });

    it('preserves the empty string', () => {
      expect(staticCommand('')).toBe('');
    });
  });

  describe('unsafeCommand', () => {
    it('returns its argument verbatim, performing no quoting (the audited escape hatch)', () => {
      // unsafeCommand is the deliberate bypass for arbitrary-by-design shell text
      // (hook commands, --cdk-pushdown args). It must NOT alter the input.
      const hook = 'aws s3 cp $SRC "$DST" && echo done';
      expect(unsafeCommand(hook)).toBe(hook);
    });

    it('preserves the empty string', () => {
      expect(unsafeCommand('')).toBe('');
    });
  });

  describe('joinCommands', () => {
    const a = staticCommand('terraform init');
    const b = staticCommand('terraform plan');
    const c = staticCommand('terraform apply');

    it('joins with a single space by default', () => {
      expect(joinCommands([a, b])).toBe('terraform init terraform plan');
    });

    it('joins with an explicit " && " separator', () => {
      expect(joinCommands([a, b, c], ' && ')).toBe('terraform init && terraform plan && terraform apply');
    });

    it('joins with the multi-line line-continuation separator', () => {
      expect(joinCommands([a, b], ' \\\n\t')).toBe('terraform init \\\n\tterraform plan');
    });

    it('returns the single element unchanged for a one-element array', () => {
      expect(joinCommands([a])).toBe('terraform init');
    });

    it('returns the empty string for an empty array', () => {
      expect(joinCommands([])).toBe('');
    });

    it('preserves the brand so the result is accepted where a SafeCommand is required', () => {
      // Compile-time: the return type is SafeCommand (this assignment would not
      // type-check otherwise). Runtime: it is still the joined string.
      const joined: SafeCommand = joinCommands([a, b], ' && ');
      expect(joined).toBe('terraform init && terraform plan');
    });
  });
});
