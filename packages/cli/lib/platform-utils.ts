/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';

export const isWindows = process.platform === 'win32';

/** Generate a command to set an environment variable for the current shell invocation */
export function setEnvCmd(key: string, value: string, win = isWindows): string {
  if (win) {
    // cmd.exe set "key=value" — escape embedded double-quotes
    const escapedValue = value.replace(/"/g, '""');
    return `set "${key}=${escapedValue}"`;
  }
  // POSIX: single-quote the value to prevent shell interpretation
  const escapedValue = value.replace(/'/g, String.raw`'\''`);
  return `export ${key}='${escapedValue}'`;
}

/** Return the default shell for command execution */
export function defaultShell(win = isWindows): string {
  return win ? 'cmd.exe' : '/bin/sh';
}

/** Generate a cross-platform rm -rf command */
export function rmRfCmd(target: string, win = isWindows): string {
  const resolved = path.resolve(target);
  return win ? `if exist "${resolved}" rmdir /s /q "${resolved}"` : `rm -rf '${target}'`;
}

/** Generate a cross-platform mkdir -p command */
export function mkdirpCmd(target: string, win = isWindows): string {
  const resolved = path.resolve(target);
  return win ? `if not exist "${resolved}" mkdir "${resolved}"` : `mkdir -p '${target}'`;
}

/** Generate a cross-platform recursive copy command */
export function cpRCmd(src: string, dest: string, win = isWindows): string {
  const resolvedSrc = path.resolve(src);
  const resolvedDest = path.resolve(dest);
  return win ? `xcopy "${resolvedSrc}" "${resolvedDest}" /s /e /i /y /q` : `cp -r ${src}/* ${dest}`;
}

/** Return the platform-appropriate null device */
export function devNull(win = isWindows): string {
  return win ? 'NUL' : '/dev/null';
}

/** Quote a path for the current platform's shell, escaping embedded quote characters */
export function shellQuote(p: string, win = isWindows): string {
  if (win) {
    // Escape embedded double-quotes for cmd.exe
    const escaped = p.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  // POSIX: single-quote context — replace embedded ' with '\'' (end quote, escaped quote, reopen)
  const escaped = p.replace(/'/g, String.raw`'\''`);
  return `'${escaped}'`;
}

/** Join multiple commands for sequential execution (&& short-circuits on failure) */
export function cmdJoin(...args: [...string[]] | [boolean, ...string[]]): string {
  // An optional leading boolean platform flag is accepted for signature
  // consistency with the other helpers, but both cmd.exe and POSIX shells
  // use && so that a failed command aborts the rest of the chain.
  const cmds = typeof args[0] === 'boolean' ? (args.slice(1) as string[]) : (args as string[]);
  return cmds.join(' && ');
}

/** Generate a cross-platform cd + command */
export function cdAndRun(dir: string, cmd: string, win = isWindows): string {
  if (win) {
    const escaped = path.resolve(dir).replace(/"/g, '""');
    return `cd /d "${escaped}" && ${cmd}`;
  }
  const escaped = dir.replace(/'/g, String.raw`'\''`);
  return `cd '${escaped}' && ${cmd}`;
}

/** Line continuation for multi-line commands */
export function lineContinuation(win = isWindows): string {
  return win ? ' ' : ' \\\n\t';
}

/** Generate a PYTHONPATH prefix for a command */
export function pythonPathCmd(pythonDir: string, cmd: string, win = isWindows): string {
  if (win) {
    const escaped = pythonDir.replace(/"/g, '""');
    return `set "PYTHONPATH=${escaped}" && ${cmd}`;
  }
  const escaped = pythonDir.replace(/'/g, String.raw`'\''`);
  return `export PYTHONPATH='${escaped}' && ${cmd}`;
}
