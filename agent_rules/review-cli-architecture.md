---
scope: manual
description: CLI shell-safety invariants — parameter validation, sink quoting, and their tests
---

# CLI Architecture Review - Steering Guide

Review changes to the MDAA CLI (`packages/cli`) for the shell-safety guardrails that
keep user-supplied config from becoming executed shell syntax. The CLI interpolates
many trusted-but-user-supplied YAML config values into the shell command strings it
runs via `child_process` (CDK context params, Terraform `-var` args, module/naming
paths, npm specifiers, ...). Two independent layers keep that safe, and this review
exists to make sure neither layer silently regresses when the CLI changes.

This is input hygiene, not a privilege boundary: MDAA already runs arbitrary shell by
design via `predeploy`/`postdeploy` hooks, so config is a trusted input. The goal is
to eliminate the entire "a config value accidentally became shell syntax" problem
class with a design where nothing can be missed.

## The Two-Layer Design (background)

**Layer 1 — fail-fast, parse-time format validation** (`lib/config-field-policy.ts`).
Every field of every config interface is *classified* in a
`Record<keyof Interface, FieldPolicy>` registry, so adding a field without classifying
it is a **compile error**. The four policies:

- `validated` — constrained format; validated at parse time (references `{{...}}` and
  `default` are deferred to post-resolution, mirroring the region/account model).
- `quote-only` — free-form (paths, context blobs, `module_config_data`); relies solely
  on the Layer-2 quoting applied at each sink.
- `structural` — a nested object/map the walker recurses into.
- `not-shell` — never interpolated into a shell command (booleans, objects serialized
  to files, the arbitrary-by-design hook `command`).

Validators are intentionally lenient: they reject only values that could not be a
legitimate instance of their field, never on shell-metacharacter grounds alone. Layer 1
provides an early, clear error for obvious typos — it is NOT the shell-safety guarantee.

**Layer 2 — universal shell-quoting at every sink, enforced by a branded type**
(`lib/shell-command.ts`, `lib/safe-command.ts`). Every *value* that reaches a command
string is routed through `ShellCommand` / `shellQuote`, which quotes it by construction.
Trusted, compile-time-constant literal text (command names, flags, operators, and
deliberate static shell expansions like `'${AWS_DEFAULT_REGION}'`) is admitted only via
the builder's literal-typed methods — `.for()`, `.flags()`, `.option()`'s flag, and the
`.shellSyntax()` escape hatch — or via `staticCommand()`. Each of these takes a
`Literal<T>`, a compile-time-only type that admits a finite string literal but **rejects**
a runtime `string` or an interpolated template literal. This is the layer that actually
guarantees safety; it holds regardless of what Layer 1 accepts.

The guarantee is enforced by the TypeScript compiler via the `SafeCommand` branded type
(`type SafeCommand = string & { readonly __safeCommand: unique symbol }`). The executors
(`MdaaDeploy.execCmd`, `executeCommand`, `executeCommandWithCapture`) and the command
arrays they consume (`moduleCmds`, the CDK/TF arg arrays) accept only `SafeCommand`, not
`string`, so `execCmd(someRawString)` is a **compile error** — a hand-assembled command
cannot reach an executor. The only ways to obtain a `SafeCommand`:

- `ShellCommand.build()` — every runtime value routed through it was shell-quoted;
- the `platform-utils` command helpers (`rmRfCmd`, `cpRCmd`, `setEnvCmd`, ...), which
  shell-quote their value arguments;
- `joinCommands()` — combines already-safe commands with a literal separator;
- `staticCommand()` — a compile-time-constant literal that carries no runtime value
  (e.g. `'terraform init'`); its `Literal<T>` parameter rejects an interpolated template;
- `unsafeCommand()` — the single, deliberately loud escape hatch for text that is
  arbitrary shell *by design* (the documented hook `command` trust boundary and
  operator-supplied `--cdk-pushdown` args). It performs no quoting; every use must be
  justified and greppable.

The interpolation bypass (`${...}` reaching a trusted-text producer) is caught by the
compiler itself: `Literal<T>` rejects any template-literal type at `.for()`, `.flags()`,
`.option()`'s flag, `.shellSyntax()`, and `staticCommand()`. That contract is compile-time
only, so no Jest test can observe it; it is pinned instead by `test/types.negative.ts`, a
`tsc --noEmit` file whose `@ts-expect-error` lines assert each forbidden shape fails to
compile (weakening `Literal<T>` makes an `@ts-expect-error` unused and fails the build).

One runtime **backstop** remains, in `test/shell-command.test.ts`, for the single bypass
the type system deliberately does not narrow: `unsafeCommand()` brands an arbitrary
`string` on purpose, so a source scan pins its call sites to exactly the two sanctioned
sinks and fails if a new one appears.

## The Three Invariants (what this review enforces)

Every change under `packages/cli` must preserve all three. A change that breaks any of
them is a finding.

### 1. Every parameter has best-effort validation

- Every field of every config interface (`MdaaConfigContents`, `MdaaDomainConfig`,
  `MdaaEnvironmentConfig`, `MdaaModuleConfig`, `HookConfig`, `TerraformConfig`,
  `MdaaCustomNaming`) is classified in the corresponding policy registry in
  `config-field-policy.ts`.
- A newly added field that carries a value with a **constrained format** (an ARN, a
  version specifier, a region, an account id, an identifier, a name) must be `validated`
  with a fail-fast checker — not silently left `quote-only`. `quote-only` is correct only
  for genuinely free-form values (arbitrary paths, JSON blobs, context maps).
- A validator must reject values that could not be a legitimate instance of its field,
  and must **never be loosened to admit the command-substitution / chaining /
  quote-break-out set**: `` $ ` ; & ( ) \ ' " ``, newline, and (for non-path fields) `/`.
  A `validated` field's `RegExp` widening to allow any of those is a HIGH finding.
- Map keys that flow into commands (domain / environment / module names) are name-
  validated via `validateName`; that validation must not be removed.
- `organization` is validated with the plain name checker (no reference deferral)
  because it is the *root* substitution source for `{{...}}` references and can never
  itself be a reference. This intentional asymmetry must be preserved.

### 2. Every sink has zero-trust validation of its input

A "sink" is any place a value is interpolated into a string that is later executed as a
shell command (`execSync`, `spawnSync({shell:true})`, `execCmd`, `executeCommand[WithCapture]`,
or a value pushed into a command-argument array).

- Every sink must route its runtime values through `ShellCommand` (`.arg()` /
  `.option()`'s value) or `shellQuote()`. Because the executors accept only `SafeCommand`,
  a bare template-literal interpolation (e.g. `` execCmd(`cdk deploy ${roleArn}`) ``) is a
  compile error — but a change must not defeat this by widening an executor/command-array
  type back to `string`, or by casting (`as SafeCommand` / `as unknown as`) to smuggle an
  unquoted string past the type.
- The trusted-text producers — `.shellSyntax()` and `staticCommand()` — must receive a
  **static string literal only**, never a template literal containing `${...}`. Their
  `Literal<T>` parameter enforces this at compile time, so widening a parameter away from
  `Literal<T>` (to `string` or `T`) is itself a break. A deliberate shell expansion is
  written as a single-quoted static string (`.shellSyntax('-var region="${AWS_DEFAULT_REGION}"')`),
  which carries no TypeScript interpolation.
- `unsafeCommand()` may be used ONLY at its two documented trust-boundary sinks (the hook
  `command` and `--cdk-pushdown` args). A new `unsafeCommand()` call site anywhere else is
  a HIGH finding: it is a value that should have been quoted via `ShellCommand`.
- A sink must trust nothing about its input having been validated upstream: quoting is
  applied unconditionally at the sink, so the guarantee cannot rot if Layer-1 validation
  later changes.
- A new command-producing helper (one that assembles bare command text) must return
  `SafeCommand` and shell-quote its value arguments, so it composes with the type-enforced
  executors rather than forcing a cast at the call site.

### 3. Every validator and sink is fully tested

- **Each `validated` field** must have the four test classes in
  `test/config-field-policy.test.ts` (or the field's dedicated validator test):
  1. happy path — a valid value is accepted;
  2. injection path — payloads carrying `$(...)`, backticks, `;`, `&&`, `|` are rejected;
  3. bad-format path — a malformed-but-not-injection value is rejected;
  4. reference-deferral path — a `{{...}}` reference is accepted (deferred), EXCEPT
     `organization`, which must have a test pinning that references are *rejected*.
- **Each sink** must have an assertion in `test/shell-command.test.ts` that an injection
  payload driven through it lands single-quoted (inert) and never bare.
- The compile-time contract in `test/types.negative.ts` must remain present and must not
  be weakened: its `@ts-expect-error` lines pin that a runtime `string` or interpolated
  template literal is rejected at each trusted-text producer (`.for()`, `.flags()`,
  `.option()`'s flag, `.shellSyntax()`, `staticCommand()`) and that a raw `string` is
  rejected at each executor. Deleting a case, or relaxing `Literal<T>` / the `SafeCommand`
  brand so a case starts compiling, is a HIGH finding.
- The `unsafeCommand()` source-scan backstop in `test/shell-command.test.ts` must remain
  and must not be weakened: it pins the call sites to exactly the two sanctioned sinks.
  Deleting it, loosening its regex, or adding an unreviewed call site is a HIGH finding
  unless the corresponding sink was also removed.

## CI Agent Usage

This section is used by the automated CLI Architecture Review CI agent. When invoked, Kiro
receives the `packages/cli` code diff, the full source of the security-critical files
(`config-field-policy.ts`, `shell-command.ts`, `safe-command.ts`, the config interfaces,
and the sink files `mdaa-cli.ts` / `utils.ts` / `package-helper.ts`), and the relevant
test files, and must produce structured JSON findings.

### JSON Output Schema

Write findings to `{output_file}` as a JSON object. No preamble, no markdown fences, no
explanation outside the JSON. The file must contain ONLY valid JSON.

```json
{
  "overall_risk": "HIGH | MEDIUM | LOW",
  "summary": "One paragraph summarizing whether the three CLI shell-safety invariants hold.",
  "findings": [
    {
      "risk": "HIGH | MEDIUM | LOW",
      "category": "missing_field_validation | unclassified_field | weakened_validator | sink_bypasses_quoting | interpolation_bypass | safecommand_type_bypass | unsafe_command_misuse | untested_validator | untested_sink | weakened_guard",
      "file": "path/to/file.ts",
      "line": 42,
      "detail": "What invariant is broken and exactly what must change to restore it."
    }
  ]
}
```

### Severity Classification for CI Agent

- **HIGH:** A sink interpolates a value without quoting (`sink_bypasses_quoting`); a
  trusted-text producer (`.shellSyntax()` or `staticCommand()`) receives a `${...}` template
  literal, or one of the `Literal<T>` parameters is widened to `string`/`T` so such a
  literal would type-check (`interpolation_bypass`); an executor or command-array type is
  widened from `SafeCommand` back to `string`, or a cast (`as SafeCommand` / `as unknown as`)
  smuggles an unquoted string past the branded type (`safecommand_type_bypass`); an
  `unsafeCommand()` call is added anywhere other than its two sanctioned sinks
  (`unsafe_command_misuse`); a `validated` field's pattern is widened to admit
  command-substitution / chaining / quote-break-out characters (`weakened_validator`); a new
  shell-bound, constrained-format field is left `quote-only`/`not-shell` instead of
  `validated` (`missing_field_validation`); a `types.negative.ts` case is removed or the
  `unsafeCommand()` source scan is removed / loosened while the mechanism it protects still
  exists (`weakened_guard`); name validation (`validateName`) removed from a map key that
  reaches a command.
- **MEDIUM:** A `validated` field is missing one of its four required test classes
  (`untested_validator`); a sink has no injection-neutralization assertion (`untested_sink`);
  the `organization` no-deferral asymmetry loses its pinning test.
- **LOW:** Minor test-coverage gaps (a missing edge-case payload where the class is
  otherwise covered), a validator comment that no longer matches the pattern, naming/doc
  drift in the shell-safety files.

### Category Definitions

| Category | What it covers |
|----------|---------------|
| `missing_field_validation` | A constrained-format, shell-bound config field left `quote-only`/`not-shell` when it should be `validated`. |
| `unclassified_field` | A config field with no entry in its policy registry (normally a compile error; flag if the `Record<keyof T>` pattern is bypassed via casts or a loosened type). |
| `weakened_validator` | A `validated` field's checker/pattern widened to admit `$ \` ; & ( ) \\ ' "`, newline, or (for non-path fields) `/`. |
| `sink_bypasses_quoting` | A command-assembly site that interpolates a runtime value without `ShellCommand`/`shellQuote`. |
| `interpolation_bypass` | A `.shellSyntax()` or `staticCommand()` call receiving a template literal containing `${...}`, or a `Literal<T>` parameter widened to `string`/`T` so one would type-check. |
| `safecommand_type_bypass` | An executor/command-array type widened from `SafeCommand` to `string`, or a cast smuggling an unquoted string past the branded type. |
| `unsafe_command_misuse` | An `unsafeCommand()` call outside its two sanctioned sinks (the hook `command`, `--cdk-pushdown` args). |
| `untested_validator` | A `validated` field missing happy / injection / bad-format / reference-deferral coverage. |
| `untested_sink` | A sink with no test asserting an injection payload is neutralized. |
| `weakened_guard` | Removal/weakening of the compile-time contract (a `test/types.negative.ts` case, or a relaxed `Literal<T>`/`SafeCommand` brand) or the `unsafeCommand()` source scan, while the mechanism it protects remains. |

### DO NOT flag (handled by other agents or out of scope)

- General code architecture (layering, dependency direction, construct IDs) — Architecture agent.
- Test coverage of CLI logic **unrelated** to validators or sinks — Test Standards agent.
- Encryption, IAM, or infrastructure security controls — Compliance agent.
- Documentation quality outside the shell-safety files — Documentation agent.
- Style, formatting, and lint concerns handled by ESLint/Prettier.
- Changes entirely outside `packages/cli`.

### Rules for CI Agent Findings

- One finding per broken invariant.
- Every finding must include `file` and `line` pointing to the source of the break.
- Only flag issues related to code that was CHANGED in this MR (an invariant that was
  already unmet before the MR and is untouched by it is out of scope).
- Order findings: HIGH first, then MEDIUM, then LOW.
- Use only ASCII characters in all string values.

### Line Number Anchoring (CRITICAL for stability)

Line numbers must be deterministic across runs. Incorrect line numbers cause duplicate
review threads.

**Core rule: copy the `line` from the `Anchor:` value of the pre-parsed diff chunk that
contains the issue.** For example, if the chunk header says `Anchor: L42`, use 42. Do NOT
compute your own line numbers. If the issue is in a full-source file (not a diff chunk),
use the line number in that file. If the issue cannot be attributed to a specific line,
use 0.
