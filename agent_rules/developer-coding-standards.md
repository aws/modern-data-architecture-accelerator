---
scope: manual
---

# Coding Standards - Steering Guide

Enforce and improve MDAA coding standards across TypeScript/CDK constructs, Python code, and config schema documentation. This steering file covers the full scope of code quality — formatting, construct patterns, interface documentation, and schema generation.

#[[file:CONTRIBUTING.md]]
#[[file:TESTING.md]]

## Scope

- **TypeScript/CDK code**: All packages under `packages/constructs/`, `packages/apps/`, `packages/utilities/`, `packages/cli/`
- **Python code**: Lambda functions, Glue jobs, and tool projects
- **Config schema interfaces**: `lib/*-config.ts` files in app modules and their L3 construct dependencies
- **Generated schemas**: `lib/config-schema.json` (auto-generated from TypeScript interfaces via `typescript-json-schema`)

## Resource Naming

L2 and L3 constructs that name AWS resources via `props.naming.resourceName(...)` MUST first set the resource type via `withResourceType(MdaaResourceType.<TYPE>)`. The resource type is part of the generated name and is required for consistency across the codebase and for any downstream consumer that switches to a custom naming module.

```typescript
// Correct
queueName: props.naming
  .withResourceType(MdaaResourceType.SQS_QUEUE)
  .resourceName(`gt-${jobName}-dlq`, 80),

// Incorrect — missing withResourceType()
queueName: props.naming.resourceName(`gt-${jobName}-dlq`, 80),
```

When a `resourceName()` call is composed inside another string, hoist the call into a local variable instead of nesting template literals:

```typescript
// Correct
const logGroupResourceName = props.naming
  .withResourceType(MdaaResourceType.CLOUDWATCH_LOG_GROUP)
  .resourceName(`gt-${jobName}`, 64);
new logs.LogGroup(this, 'sfn-log-group', {
  logGroupName: `/aws/vendedlogs/states/${logGroupResourceName}`,
  ...
});

// Incorrect — nested template literal
new logs.LogGroup(this, 'sfn-log-group', {
  logGroupName: `/aws/vendedlogs/states/${props.naming
    .withResourceType(MdaaResourceType.CLOUDWATCH_LOG_GROUP)
    .resourceName(`gt-${jobName}`, 64)}`,
  ...
});
```

## Node.js Built-in Imports

Always use the `node:` protocol prefix when importing Node.js built-in modules:

```typescript
// Good
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

// Bad
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
```

The `node:` prefix makes it explicit that the import is a Node.js built-in rather than a third-party package, and avoids potential name collisions with npm packages.

## Dependency Pinning

All dependencies must use exact version pins. Range specifiers (`>=`, `~`, `^`) are not allowed.

- **Python** (`requirements.txt`): use `==` (e.g., `boto3==1.43.0`)
- **Node.js** (`package.json`): use exact versions without prefixes (e.g., `"1.6.0"`, not `"^1.6.0"` or `"~1.6.0"`)

This ensures reproducible builds and prevents silent transitive dependency drift between environments.

## SonarQube Compliance

Code must pass SonarQube analysis. Follow these rules to avoid common findings:

### Cognitive Complexity

- Functions must not exceed cognitive complexity of 15
- Extract helper functions to reduce nesting and branching
- Prefer early returns over deeply nested if/else chains

### Code Smells

- No unused variables, parameters, or imports (prefix with `_` if intentionally unused)
- No duplicate string literals — extract to named constants when a string appears 3+ times
- No empty catch blocks — at minimum add a comment explaining why the error is ignored
- No commented-out code — remove it (git has history)
- Use `Set.has()` instead of `Array.includes()` for membership checks on static collections
- Use `for...of` instead of index-based `for` loops when the index is not needed

### Security

- No hardcoded credentials, tokens, or secrets
- Use parameterized queries, never string concatenation for SQL/commands
- Validate and sanitize all external input

### Bugs

- No identical expressions on both sides of a binary operator (`x === x`)
- No assignments within conditions (`if (x = 5)`)
- No fallthrough in switch cases without explicit `// fallthrough` comment
- All promises must be awaited or explicitly voided (`void promise`)
- No `!` non-null assertions — use proper null checks or optional chaining

### Maintainability

- Maximum 3 function parameters — use an options object for more
- No functions longer than 60 lines — extract logical sections into named helpers
- Boolean parameters should be replaced with named options or separate functions
- Prefer `const` over `let` — only use `let` when reassignment is necessary
- Use `String.raw` for regex patterns with backslashes to avoid double-escaping

## Testing Standards

All new code must include tests. Follow the testing standards defined in TESTING.md (referenced above via `#[[file:TESTING.md]]`). Key rules to enforce:

- 80% branch and 80% statement coverage minimum (`@aws-mdaa/cli`: 75% branch, per its own
  `jest.config.js` — the CLI's shell/exec branches are exercised by the command baselines
  rather than by unit assertions)
- Every exported function must have at least one test
- Use `describe`/`test` blocks with descriptive names that explain the expected behavior
- No test logic in `describe` blocks — only in `test`/`it` callbacks
- Mock external dependencies (filesystem, network, prompts) — tests must not depend on environment state
- Use deterministic test values (`test-account`, `test-region`, `test-partition`) for reproducible output
- Clean up temp files/directories in `afterEach` or `afterAll`
- Prefer `toHaveBeenCalledWith` over `toHaveBeenCalled` for precise assertions
- Test error paths and edge cases, not just happy paths

## Generated Files — Do Not Edit Directly

- `lib/config-schema.json` — Machine-generated by `npm run build` in the app package. Never edit directly. Instead, modify the source TypeScript interface (in the L3 construct or app config) and run `npm run build` in the app package to regenerate.
- `SCHEMA.md` — Generated from `config-schema.json` during the same build step. Never edit directly.

## What to Review

When reviewing or improving code quality, apply the coding guidelines from CONTRIBUTING.md (pulled in via `#[[file:CONTRIBUTING.md]]` above). This steering file focuses on the config schema JSDoc audit process below.

## Config Schema Documentation

Config-exposed TypeScript interfaces flow into JSON schemas via `typescript-json-schema` during build. The quality of JSDoc on these interfaces directly determines the quality of the generated schema documentation that users see.

The documentation standards for config-exposed properties are defined in the `code-documentation` steering file (auto-included). This section covers the detailed process for auditing and improving config schema JSDoc across modules.

### Process

1. **Gather context** — read the app README, L3 construct README, app config (`lib/*-config.ts`), L3 construct source, and test config (`test/test-config.yaml`)
2. **Write documentation** — enhance JSDoc on ALL config-exposed properties using context from READMEs and code
3. **Cleanup** — replace verbose Q-ENHANCED docs with concise versions; remove misplaced docs on non-interface locations
4. **Validate** — no TypeScript errors, docs consistent with README, all config-exposed properties documented

### Validation

- No TypeScript syntax errors
- Documentation consistent with README
- All config-exposed properties documented

### Critical: Documentation-Only Changes

Config schema documentation tasks MUST produce documentation-only changes. No property declarations, imports, exports, class definitions, or executable code may be added, removed, or modified.

**After every edit**, verify interface integrity:

```bash
diff <(git show HEAD:path/to/file.ts | grep "readonly " | sort) <(grep "readonly " path/to/file.ts | sort)
```

If any `readonly` lines differ, the edit introduced a code change — revert and redo.

**After completing a module**, run `npm run build:all` and verify zero errors.

### Anti-Patterns

- Replacing a multi-line JSDoc comment and accidentally eating the `readonly` property declaration, interface closing `}`, or next interface's `/**` opening
- Replacing `id` fields in NagPackSuppression object literals with comments (these are code, not documentation)
- Verbose Q-ENHANCED docs with redundant phrasing instead of concise, README-informed descriptions
- Generic filler use cases ("Data management; Configuration; Setup") instead of specific ones from the README
