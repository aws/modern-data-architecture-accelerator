/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeCommand, executeCommandWithCapture, logScriptAnalysis } from '../lib/command-utils';
import { staticCommand } from '../lib/safe-command';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';

describe('executeCommand', () => {
  let mockExecSync: jest.SpyInstance;

  beforeEach(() => {
    mockExecSync = jest.spyOn(childProcess, 'execSync').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should pass the correct shell option based on platform', () => {
    executeCommand(staticCommand('echo "hello"'));

    const expectedShell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    expect(mockExecSync).toHaveBeenCalledWith(
      'echo "hello"',
      expect.objectContaining({
        shell: expectedShell,
        stdio: 'inherit',
      }),
    );
  });

  it('should inherit environment variables', () => {
    executeCommand(staticCommand('some-command'));

    expect(mockExecSync).toHaveBeenCalledWith(
      'some-command',
      expect.objectContaining({
        env: process.env,
      }),
    );
  });
});

describe('logScriptAnalysis', () => {
  let mockStatSync: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockStatSync = jest.spyOn(fs, 'statSync');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log script stats when fs.statSync succeeds', () => {
    const scriptPath = '/path/to/script.sh';
    const mockStats = {
      size: 1024,
      mode: 0o755,
    } as fs.Stats;

    mockStatSync.mockReturnValue(mockStats);

    logScriptAnalysis(scriptPath);

    expect(mockStatSync).toHaveBeenCalledWith(scriptPath);
    expect(consoleErrorSpy).toHaveBeenCalledWith('\n=== Script File Analysis ===');
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Script path: ${scriptPath}`);
    expect(consoleErrorSpy).toHaveBeenCalledWith('File exists: true');
    expect(consoleErrorSpy).toHaveBeenCalledWith('File size: 1024 bytes');
    expect(consoleErrorSpy).toHaveBeenCalledWith('File permissions: 755');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Is executable: true');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Is readable: true');
  });
});

describe('executeCommandWithCapture', () => {
  let mockSpawnSync: jest.SpyInstance;

  beforeEach(() => {
    mockSpawnSync = jest.spyOn(childProcess, 'spawnSync');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should capture stdout and return exit code 0 on success', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'command output',
      stderr: '',
      status: 0,
    });

    const result = executeCommandWithCapture(staticCommand('echo "test"'));

    expect(result.stdout).toBe('command output');
    expect(result.exitCode).toBe(0);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      'echo "test"',
      expect.objectContaining({
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        encoding: 'utf-8',
      }),
    );
  });

  it('should keep stdout and stderr separate so callers parsing stdout are not fed warnings', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'stdout content',
      stderr: 'stderr content',
      status: 0,
    });

    const result = executeCommandWithCapture(staticCommand('some-command'));

    expect(result.stdout).toBe('stdout content');
    expect(result.stderr).toBe('stderr content');
    expect(result.exitCode).toBe(0);
  });

  it('should report a signal-killed child as a failure, not a success', () => {
    // A killed child has status null; reading that as 0 would treat its partial
    // output as a complete, successful result.
    mockSpawnSync.mockReturnValue({
      stdout: 'partial',
      stderr: '',
      status: null,
      signal: 'SIGKILL',
    });

    const result = executeCommandWithCapture(staticCommand('killed-command'));

    expect(result.exitCode).toBe(-1);
    expect(result.signal).toBe('SIGKILL');
  });

  it('should report a child that could not be spawned as a failure', () => {
    const error = new Error('spawn ENOENT');
    mockSpawnSync.mockReturnValue({ stdout: '', stderr: '', status: null, error });

    const result = executeCommandWithCapture(staticCommand('missing-binary'));

    expect(result.exitCode).toBe(-1);
    expect(result.error).toBe(error);
  });

  it('should pass a timeout through to spawnSync when one is given', () => {
    mockSpawnSync.mockReturnValue({ stdout: 'out', stderr: '', status: 0 });

    executeCommandWithCapture(staticCommand('slow-command'), { timeoutMs: 30_000 });

    expect(mockSpawnSync).toHaveBeenCalledWith('slow-command', expect.objectContaining({ timeout: 30_000 }));
  });

  it('should not set a timeout when none is given', () => {
    mockSpawnSync.mockReturnValue({ stdout: 'out', stderr: '', status: 0 });

    executeCommandWithCapture(staticCommand('command'));

    expect(mockSpawnSync.mock.calls[0][1]).not.toHaveProperty('timeout');
  });

  it('should return non-zero exit code on command failure', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'partial output',
      stderr: 'error message',
      status: 1,
    });

    const result = executeCommandWithCapture(staticCommand('failing-command'));

    expect(result.stdout).toBe('partial output');
    expect(result.stderr).toBe('error message');
    expect(result.exitCode).toBe(1);
  });

  it('should handle null stdout and stderr', () => {
    mockSpawnSync.mockReturnValue({
      stdout: null,
      stderr: null,
      status: 0,
    });

    const result = executeCommandWithCapture(staticCommand('silent-command'));

    expect(result.stdout).toBe('');
    expect(result.exitCode).toBe(0);
  });

  it('should default to exit code 0 when status is null with no signal or error', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'output',
      stderr: '',
      status: null,
    });

    const result = executeCommandWithCapture(staticCommand('command'));

    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
  });
});
