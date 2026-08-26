/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * `resolveVersionConstraint` is the gate in front of the only shell command the init path
 * runs. `shell-command.test.ts` pins the quoting of the call site's argument; this pins the
 * gate itself — that a malicious or malformed constraint is rejected *before* any child
 * process is spawned, and that npm's output is not trusted verbatim on the way back.
 */

import * as childProcess from 'node:child_process';
import { resolveVersionConstraint, parseNpmViewVersion } from '../lib/init-schemas';

describe('resolveVersionConstraint', () => {
  let spawnSyncSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    spawnSyncSpy = jest.spyOn(childProcess, 'spawnSync');
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    ['command chaining with ;', '1.2.3; id'],
    ['command chaining with &&', '1.2.3 && id'],
    ['command substitution', '$(id)'],
    ['backtick substitution', '`id`'],
    ['newline injection', '1.2.3\nid'],
    ['pipe to a command', '1.2.3 | id'],
    ['redirection', '1.2.3 > /tmp/x'],
    ['a dist-tag', 'latest'],
    ['a path', '../../escape'],
  ])('rejects %s without spawning anything', (_label, constraint) => {
    expect(resolveVersionConstraint(constraint)).toBeUndefined();
    expect(spawnSyncSpy).not.toHaveBeenCalled();
  });

  test('passes an exact version straight through without spawning anything', () => {
    expect(resolveVersionConstraint('1.7.0')).toBe('1.7.0');
    expect(spawnSyncSpy).not.toHaveBeenCalled();
  });

  // Exact, so no npm lookup — and it names a real `.mdaa/<version>/` directory.
  test.each([['1.7.0-rc1'], ['1.7.0-beta.1'], ['1.0.0-global']])(
    'passes the prerelease version %s straight through without spawning anything',
    version => {
      expect(resolveVersionConstraint(version)).toBe(version);
      expect(spawnSyncSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    },
  );

  test('resolves a range through npm and returns the concrete version', () => {
    spawnSyncSpy.mockReturnValue({ stdout: '1.7.3\n', stderr: '', status: 0 });

    expect(resolveVersionConstraint('^1.7.0')).toBe('1.7.3');
    expect(spawnSyncSpy).toHaveBeenCalledTimes(1);
  });

  test('bounds the npm lookup so an unreachable registry cannot hang init', () => {
    spawnSyncSpy.mockReturnValue({ stdout: '1.6.9\n', stderr: '', status: 0 });

    resolveVersionConstraint('~1.6.0');

    expect(spawnSyncSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ timeout: 30_000 }));
  });

  test('does not trust output from a signal-killed npm', () => {
    spawnSyncSpy.mockReturnValue({ stdout: '1.5.0\n', stderr: '', status: null, signal: 'SIGKILL' });

    expect(resolveVersionConstraint('>=1.5.0 <1.6.0')).toBeUndefined();
  });

  test('reports the fallback rather than resolving silently', () => {
    spawnSyncSpy.mockReturnValue({ stdout: '', stderr: 'npm error 404', status: 1 });

    expect(resolveVersionConstraint('^9.9.0')).toBeUndefined();
    expect(logSpy.mock.calls.flat().join('\n')).toContain("could not resolve mdaa_version '^9.9.0'");
  });
});

describe('parseNpmViewVersion', () => {
  test('takes a bare single-match version', () => {
    expect(parseNpmViewVersion('1.7.0\n')).toBe('1.7.0');
  });

  test('takes the highest version from a multi-match range, which npm prints last', () => {
    const output = ["@aws-mdaa/cli@1.5.0 '1.5.0'", "@aws-mdaa/cli@1.6.0 '1.6.0'", "@aws-mdaa/cli@1.7.0 '1.7.0'"].join(
      '\n',
    );

    expect(parseNpmViewVersion(output)).toBe('1.7.0');
  });

  test('ignores an npm warning printed alongside the version', () => {
    expect(parseNpmViewVersion('npm warn config production Use `--omit=dev`\n1.7.0\n')).toBe('1.7.0');
  });

  test('keeps a prerelease version', () => {
    expect(parseNpmViewVersion('1.8.0-beta.1\n')).toBe('1.8.0-beta.1');
  });

  test.each([
    ['empty output', ''],
    ['only whitespace', '  \n\n'],
    ['a warning with no version', 'npm warn config production\n'],
    ['a non-version word', 'latest\n'],
    ['something with a path separator', '../escape\n'],
  ])('returns undefined for %s', (_label, output) => {
    expect(parseNpmViewVersion(output)).toBeUndefined();
  });
});
