/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The compile-time guarantee that a string is safe to execute as a shell command.
 *
 * MDAA interpolates many user-supplied YAML config values into the shell command
 * strings it runs via `child_process`. The {@link ./shell-command.ShellCommand}
 * builder quotes every *value* by construction, but nothing stopped a caller from
 * assembling a command by hand (`execCmd(`--out ${modulePath}`)`) and bypassing
 * the builder entirely — a source-scanning guard test tried to catch that, but a
 * regex over line-split source cannot see multi-line args, string concatenation,
 * or a value wrapped in a helper call.
 *
 * `SafeCommand` moves that guarantee to the type system, the same place the
 * config-field registry already lives: the CLI executors
 * ({@link ./command-utils.executeCommand} / `executeCommandWithCapture` and
 * `MdaaDeploy.execCmd`) accept a `SafeCommand`, not a `string`, so
 * `execCmd(someString)` does not compile. The intended ways to obtain one are:
 *
 * - {@link ./shell-command.ShellCommand.build} — every runtime value routed
 *   through it is shell-quoted;
 * - the {@link ./platform-utils} command helpers (`rmRfCmd`, `cpRCmd`, ...),
 *   which quote their value arguments and return a `SafeCommand`;
 * - {@link joinCommands} — combines already-safe commands with a literal separator;
 * - {@link staticCommand} — for a compile-time-constant literal that contains no
 *   runtime value (e.g. `'terraform init'`);
 * - {@link unsafeCommand} — the single, deliberately loud escape hatch for input
 *   that is arbitrary shell *by design* (the documented hook trust boundary and
 *   operator-supplied `--cdk-pushdown` args). Every use must be justified.
 *
 * Scope: this makes the *accidental* bypass impossible (a plain `string` cannot reach
 * an executor), not the deliberate one — {@link brandSafe} is exported and unchecked.
 * That is acceptable because the config is a trusted input (MDAA runs arbitrary shell
 * from hooks by design), so this is input hygiene, not a privilege boundary.
 *
 * A brand is a purely compile-time marker: at runtime a `SafeCommand` *is* its
 * string, so it prints, concatenates, and executes exactly like one.
 */
export type SafeCommand = string & { readonly __safeCommand: unique symbol };

/**
 * Accepts only a finite string *literal* type; any non-literal collapses to
 * `never` and fails to compile. Rejects two shapes: the wide `string` (via
 * `string extends T`) and — the subtle case — a template-literal type like
 * `` `--out ${string}` `` from an interpolated template literal. The latter is
 * narrower than `string`, so it needs the `{} extends Record<T, never>` probe: a
 * template-literal type lowers to an index signature (no required keys, so `{}`
 * matches → `never`), whereas a true literal has required keys (`{}` does not
 * match → passes). This is the smuggling case the old source-scan guards caught.
 *
 * A violation reports as the cryptic `type 'string' is not assignable to
 * parameter of type 'never'` — decode it with this comment.
 */
// The bare `{}` — "type with no required keys" — is the load-bearing probe above;
// `object`/`unknown` would not discriminate, so the rule is disabled deliberately.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Literal<T extends string> = string extends T ? never : {} extends Record<T, never> ? never : T;

/**
 * The brand-minting primitive every producer below is built on. Exported because those
 * producers live in sibling modules and TS has no package-private — so it is unchecked:
 * any module can `brandSafe(`--out ${value}`)` and forge an unquoted command with no
 * compile error.
 *
 * Intended for {@link ./shell-command} and {@link ./platform-utils} only, which quote
 * every value they interpolate; elsewhere use {@link staticCommand} (literals),
 * `ShellCommand` (runtime values), or {@link unsafeCommand} (arbitrary shell). Treat any
 * other call as a review finding — a convention, not mechanized, since the config is
 * trusted (see {@link SafeCommand}).
 */
export function brandSafe(value: string): SafeCommand {
  return value as SafeCommand;
}

/**
 * Brand a compile-time-constant literal that carries no runtime value (command
 * names, flag groups, `terraform init`). The {@link Literal} bound rejects any
 * runtime value at compile time; route those through {@link ./shell-command.ShellCommand}
 * so they are quoted.
 */
export function staticCommand<T extends string>(text: Literal<T>): SafeCommand {
  return brandSafe(text);
}

/**
 * The audited escape hatch for text that is arbitrary shell *by design* — hook
 * `command`s and `--cdk-pushdown` args — and so cannot be quoted. Safe only because
 * the config/CLI args are trusted inputs. Not for casting away a quotable value.
 *
 * {@link brandSafe} would work here identically; this exists to be the *declared*
 * hatch — greppable, and its call sites pinned by a test (shell-command.test.ts).
 */
export function unsafeCommand(command: string): SafeCommand {
  return brandSafe(command);
}

/** Join already-safe fragments with a trusted literal separator, preserving the brand. */
export function joinCommands(commands: readonly SafeCommand[], separator = ' '): SafeCommand {
  return brandSafe(commands.join(separator));
}
