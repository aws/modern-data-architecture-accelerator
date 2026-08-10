/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import { SafeCommand, brandSafe } from './safe-command';

export const isWindows = process.platform === 'win32';

/**
 * The single shell-quoting implementation for the whole CLI — every helper below
 * and the {@link ./shell-command.ShellCommand} builder route values through it so
 * an embedded quote in a config-derived value cannot break out.
 *
 * POSIX: single-quote escaping, the only special case being a literal `'` encoded
 * as `'\''`; the empty string maps to `''`. Single quotes suppress everything, so
 * this is total.
 *
 * Windows: double-quote escaping for cmd.exe (`"` -> `""`). Break-out is blocked
 * (`&`/`|`/`<`/`>` are inert inside quotes, and doubling every input quote keeps
 * quote-state parity), but this is **not** total — KNOWN GAP: cmd.exe expands
 * `%VAR%` inside double quotes, so a value containing `%PATH%` arrives expanded
 * rather than literal. Value corruption, not command substitution (that needs
 * `FOR /F` or `!VAR!`, neither reachable here). Unfixed because `%` has no
 * command-line escape (`%%` works only in batch files); the real fix is to stop
 * routing values through `shell: cmd.exe` — argv array or PowerShell — which is
 * outside this layer. Pinned by tests in platform-utils.test.ts.
 */
export function shellQuote(p: string, win = isWindows): string {
  if (win) {
    return `"${p.replace(/"/g, '""')}"`;
  }
  // A literal `'` inside single quotes is encoded as `'\''`; extracted to a
  // variable to avoid nesting a template literal inside another (typescript:S4624).
  const escaped = p.replace(/'/g, String.raw`'\''`);
  return `'${escaped}'`;
}

/** Return the default shell for command execution */
export function defaultShell(win = isWindows): string {
  return win ? 'cmd.exe' : '/bin/sh';
}

/**
 * Set an environment variable, value shell-quoted: `export NAME='<value>'` on
 * POSIX; `set "NAME=<value>"` on Windows (cmd.exe quotes the whole token as a unit).
 */
export function setEnvCmd(key: string, value: string, win = isWindows): SafeCommand {
  if (win) {
    return brandSafe(`set "${key}=${value.replace(/"/g, '""')}"`);
  }
  return brandSafe(`export ${key}=${shellQuote(value, win)}`);
}

/** Generate a cross-platform rm -rf command with the target path shell-quoted */
export function rmRfCmd(target: string, win = isWindows): SafeCommand {
  if (win) {
    const quoted = shellQuote(path.resolve(target), win);
    return brandSafe(`if exist ${quoted} rmdir /s /q ${quoted}`);
  }
  return brandSafe(`rm -rf ${shellQuote(target, win)}`);
}

/** Generate a cross-platform mkdir -p command with the target path shell-quoted */
export function mkdirpCmd(target: string, win = isWindows): SafeCommand {
  if (win) {
    const quoted = shellQuote(path.resolve(target), win);
    return brandSafe(`if not exist ${quoted} mkdir ${quoted}`);
  }
  return brandSafe(`mkdir -p ${shellQuote(target, win)}`);
}

/** Generate a cross-platform recursive copy command with src/dest shell-quoted */
export function cpRCmd(src: string, dest: string, win = isWindows): SafeCommand {
  if (win) {
    return brandSafe(
      `xcopy ${shellQuote(path.resolve(src), win)} ${shellQuote(path.resolve(dest), win)} /s /e /i /y /q`,
    );
  }
  // POSIX: shell-quote src/dest so a metacharacter in the (config-derived) path
  // cannot be interpreted, but keep the `/*` glob outside the quotes so the shell
  // still expands it to the directory's contents.
  return brandSafe(`cp -r ${shellQuote(src, win)}/* ${shellQuote(dest, win)}`);
}

/** Return the platform-appropriate null device */
export function devNull(win = isWindows): string {
  return win ? 'NUL' : '/dev/null';
}

/**
 * Join already-safe commands with `&&` for sequential execution. The optional
 * leading boolean is accepted for signature parity with the other helpers only —
 * both cmd.exe and POSIX use `&&`.
 */
export function cmdJoin(...args: [...SafeCommand[]] | [boolean, ...SafeCommand[]]): SafeCommand {
  const cmds = typeof args[0] === 'boolean' ? (args.slice(1) as SafeCommand[]) : (args as SafeCommand[]);
  return brandSafe(cmds.join(' && '));
}

/**
 * Generate a `cd <dir> && <cmd>` command. The directory is shell-quoted; `cmd`
 * is an already-assembled {@link SafeCommand} appended verbatim.
 */
export function cdAndRun(dir: string, cmd: SafeCommand, win = isWindows): SafeCommand {
  if (win) {
    return brandSafe(`cd /d ${shellQuote(path.resolve(dir), win)} && ${cmd}`);
  }
  return brandSafe(`cd ${shellQuote(dir, win)} && ${cmd}`);
}

/** Line continuation for multi-line commands */
export function lineContinuation(win = isWindows): string {
  return win ? ' ' : ' \\\n\t';
}

/**
 * Prefix an already-safe command with a `PYTHONPATH` export. The directory is
 * shell-quoted via {@link setEnvCmd}; `cmd` is appended verbatim.
 */
export function pythonPathCmd(pythonDir: string, cmd: SafeCommand, win = isWindows): SafeCommand {
  return brandSafe(`${setEnvCmd('PYTHONPATH', pythonDir, win)} && ${cmd}`);
}
