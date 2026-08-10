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

  it('should combine stdout and stderr in output', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'stdout content',
      stderr: 'stderr content',
      status: 0,
    });

    const result = executeCommandWithCapture(staticCommand('some-command'));

    expect(result.stdout).toBe('stdout contentstderr content');
    expect(result.exitCode).toBe(0);
  });

  it('should return non-zero exit code on command failure', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'partial output',
      stderr: 'error message',
      status: 1,
    });

    const result = executeCommandWithCapture(staticCommand('failing-command'));

    expect(result.stdout).toBe('partial outputerror message');
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

  it('should default to exit code 0 when status is null', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'output',
      stderr: '',
      status: null,
    });

    const result = executeCommandWithCapture(staticCommand('command'));

    expect(result.exitCode).toBe(0);
  });
});
