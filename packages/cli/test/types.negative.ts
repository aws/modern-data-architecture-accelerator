/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compile-time negative tests for the shell-safety guarantee. The load-bearing
 * parts — `Literal<T>` (forbids a runtime string/template at a trusted-text
 * producer) and the `SafeCommand` brand (forbids a raw string at an executor) —
 * are compile-time only, so no Jest test can observe them; without this file one
 * could weaken `Literal<T>` to `type Literal<T> = T` and every runtime test still passes.
 *
 * Not a Jest test (no `.test.ts` suffix). `tsc` checks it (tsconfig includes it,
 * `noEmitOnError`): each `@ts-expect-error` asserts the next line must NOT compile;
 * if one starts compiling, tsc flags the now-unused directive and the build fails.
 * Positive cases (no directive) assert the legitimate shapes still compile.
 *
 * A "Unused '@ts-expect-error' directive" error means a value that should be
 * rejected now compiles — the guard has a hole.
 */

import { ShellCommand } from '../lib/shell-command';
import { staticCommand, unsafeCommand } from '../lib/safe-command';
import { executeCommand } from '../lib/command-utils';

declare const runtime: string;

// --- Literal<T> rejects every non-literal at a trusted-text position ----------

// A wide runtime `string` as the program name.
// @ts-expect-error runtime string is not a compile-time literal
ShellCommand.for(runtime);

// A template literal that interpolates a runtime value as the program name —
// this is the interpolation-smuggling shape; its type is a *template-literal
// type*, narrower than `string`, so `string extends T` alone would NOT catch it.
// @ts-expect-error interpolated template literal is not a finite literal
ShellCommand.for(`npx ${runtime}`);

// A runtime string as a valueless flag.
// @ts-expect-error runtime string flag
ShellCommand.for('npx').flags(runtime);

// A runtime string in the MIDDLE of the variadic — the mapped-tuple form must
// flag the offending argument at its own position, not unify it away.
// @ts-expect-error runtime string mid-variadic
ShellCommand.for('npx').flags('cdk', runtime, 'synth');

// A runtime string as the option FLAG (the value is allowed to be runtime).
// @ts-expect-error runtime string option flag
ShellCommand.args().option(runtime, 'value');

// A template literal as shell syntax (the audited escape hatch is literal-only).
// @ts-expect-error interpolated template literal as shell syntax
ShellCommand.for('npm').shellSyntax(`region=${runtime}`);

// staticCommand: a wide runtime string.
// @ts-expect-error runtime string branded as a static command
staticCommand(runtime);

// staticCommand: an interpolated template literal (the exact bypass the deleted
// source-scan test used to police — now a compile error instead).
// @ts-expect-error interpolated template literal branded as a static command
staticCommand(`--out ${runtime}`);

// staticCommand: string concatenation also produces a wide `string`.
// @ts-expect-error concatenation is not a literal
staticCommand('--out ' + runtime);

// --- SafeCommand brand rejects a raw string at an executor --------------------

// @ts-expect-error a raw string is not a SafeCommand
executeCommand(runtime);

// @ts-expect-error a raw string is not a SafeCommand
executeCommand('terraform init');

// --- Positive controls: the legitimate shapes MUST still compile --------------
// (No `@ts-expect-error` — if any of these breaks, tsc fails here directly.)

// Literal program name, literal flags, runtime VALUEs (quoted by the builder).
ShellCommand.for('npx').flags('cdk', 'synth').option('-c', runtime).arg(runtime).build();

// A bare-fragment builder with a runtime value.
ShellCommand.args().option('-var', runtime).build();

// shellSyntax with a single-quoted literal carrying a deliberate expansion.
ShellCommand.for('npm').shellSyntax('> /dev/null').build();

// staticCommand with a compile-time-constant literal.
staticCommand('terraform init');

// The executor accepts a SafeCommand produced by the builder / static helper.
executeCommand(ShellCommand.for('terraform').flags('init').build());
executeCommand(staticCommand('terraform init'));

// unsafeCommand deliberately accepts an arbitrary runtime string (the audited
// escape hatch) — this MUST compile, and is the reason a source scan, not the
// type system, polices its call sites (see shell-command.test.ts). `brandSafe(runtime)`
// would compile here too, and is policed by neither — by decision, not oversight.
executeCommand(unsafeCommand(runtime));
