/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  setEnvCmd,
  rmRfCmd,
  mkdirpCmd,
  cpRCmd,
  devNull,
  shellQuote,
  cmdJoin,
  cdAndRun,
  lineContinuation,
  pythonPathCmd,
  defaultShell,
} from '../lib/platform-utils';

describe('platform-utils (POSIX)', () => {
  const win = false;

  test('defaultShell returns /bin/sh', () => {
    expect(defaultShell(win)).toBe('/bin/sh');
  });

  test('setEnvCmd uses export', () => {
    expect(setEnvCmd('FOO', 'bar', win)).toBe("export FOO='bar'");
  });

  test('setEnvCmd escapes embedded single quotes on POSIX', () => {
    expect(setEnvCmd('FOO', "val'ue", win)).toBe("export FOO='val'\\''ue'");
  });

  test('rmRfCmd uses rm -rf with single quotes', () => {
    expect(rmRfCmd('/tmp/test', win)).toBe("rm -rf '/tmp/test'");
  });

  test('mkdirpCmd uses mkdir -p with single quotes', () => {
    expect(mkdirpCmd('/tmp/test', win)).toBe("mkdir -p '/tmp/test'");
  });

  test('cpRCmd uses cp -r with glob', () => {
    expect(cpRCmd('/src', '/dest', win)).toBe('cp -r /src/* /dest');
  });

  test('devNull returns /dev/null', () => {
    expect(devNull(win)).toBe('/dev/null');
  });

  test('shellQuote uses single quotes', () => {
    expect(shellQuote('my path', win)).toBe("'my path'");
  });

  test('shellQuote escapes embedded single quotes on POSIX', () => {
    // Input with embedded single quote should not allow injection
    // a'; rm -rf ~; ' → 'a'\'''; rm -rf ~; '\'''
    expect(shellQuote("a'; rm -rf ~; '", win)).toBe("'a'\\''; rm -rf ~; '\\'''");
  });

  test('shellQuote handles multiple embedded single quotes', () => {
    expect(shellQuote("it's a 'test'", win)).toBe("'it'\\''s a '\\''test'\\'''");
  });

  test('cmdJoin uses &&', () => {
    expect(cmdJoin(win, 'cmd1', 'cmd2', 'cmd3')).toBe('cmd1 && cmd2 && cmd3');
  });

  test('cmdJoin with single command', () => {
    expect(cmdJoin(win, 'only')).toBe('only');
  });

  test('cdAndRun uses single-quoted cd', () => {
    expect(cdAndRun('/my/dir', 'ls', win)).toBe("cd '/my/dir' && ls");
  });

  test('cdAndRun preserves command with arguments', () => {
    expect(cdAndRun('/project', 'npm run build --scope @test/pkg', win)).toBe(
      "cd '/project' && npm run build --scope @test/pkg",
    );
  });

  test('lineContinuation uses backslash-newline-tab', () => {
    expect(lineContinuation(win)).toBe(' \\\n\t');
  });

  test('pythonPathCmd uses export', () => {
    expect(pythonPathCmd('/py', 'checkov -d .', win)).toBe("export PYTHONPATH='/py' && checkov -d .");
  });

  test('pythonPathCmd preserves full command string', () => {
    expect(pythonPathCmd('/usr/local/python', 'python main.py --verbose', win)).toBe(
      "export PYTHONPATH='/usr/local/python' && python main.py --verbose",
    );
  });
});

describe('platform-utils (Windows)', () => {
  const win = true;

  test('defaultShell returns cmd.exe', () => {
    expect(defaultShell(win)).toBe('cmd.exe');
  });

  test('setEnvCmd uses set', () => {
    expect(setEnvCmd('FOO', 'bar', win)).toBe('set "FOO=bar"');
  });

  test('setEnvCmd escapes embedded double-quotes on Windows', () => {
    expect(setEnvCmd('FOO', 'val"ue', win)).toBe('set "FOO=val""ue"');
  });

  test('rmRfCmd uses rmdir /s /q', () => {
    const result = rmRfCmd('/tmp/test', win);
    expect(result).toMatch(/^if exist ".*" rmdir \/s \/q ".*"$/);
  });

  test('mkdirpCmd uses mkdir with if not exist', () => {
    const result = mkdirpCmd('/tmp/test', win);
    expect(result).toMatch(/^if not exist ".*" mkdir ".*"$/);
  });

  test('cpRCmd uses xcopy', () => {
    const result = cpRCmd('/src', '/dest', win);
    expect(result).toMatch(/^xcopy ".*" ".*" \/s \/e \/i \/y \/q$/);
  });

  test('devNull returns NUL', () => {
    expect(devNull(win)).toBe('NUL');
  });

  test('shellQuote uses double quotes', () => {
    expect(shellQuote('my path', win)).toBe('"my path"');
  });

  test('shellQuote escapes embedded double-quotes on Windows', () => {
    // Input with embedded double-quote should not allow injection
    expect(shellQuote('a" & del /q *', win)).toBe('"a"" & del /q *"');
  });

  test('shellQuote handles multiple embedded double-quotes', () => {
    expect(shellQuote('say "hello" to "world"', win)).toBe('"say ""hello"" to ""world"""');
  });

  test('cmdJoin uses &&', () => {
    expect(cmdJoin(win, 'cmd1', 'cmd2', 'cmd3')).toBe('cmd1 && cmd2 && cmd3');
  });

  test('cmdJoin with single command', () => {
    expect(cmdJoin(win, 'only')).toBe('only');
  });

  test('cdAndRun uses cd /d with double quotes', () => {
    const result = cdAndRun('/my/dir', 'ls', win);
    expect(result).toMatch(/^cd \/d ".*" && ls$/);
  });

  test('cdAndRun preserves command with arguments', () => {
    const result = cdAndRun('/project', 'npm run build --scope @test/pkg', win);
    expect(result).toMatch(/^cd \/d ".*" && npm run build --scope @test\/pkg$/);
  });

  test('lineContinuation uses space', () => {
    expect(lineContinuation(win)).toBe(' ');
  });

  test('pythonPathCmd uses set', () => {
    expect(pythonPathCmd('/py', 'checkov -d .', win)).toBe('set "PYTHONPATH=/py" && checkov -d .');
  });

  test('pythonPathCmd preserves full command string', () => {
    expect(pythonPathCmd('C:\\python\\lib', 'python main.py --verbose', win)).toBe(
      'set "PYTHONPATH=C:\\python\\lib" && python main.py --verbose',
    );
  });
});
