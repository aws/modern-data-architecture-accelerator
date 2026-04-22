---
inclusion: fileMatch
fileMatchPattern: '**/*.diff.test.ts,**/diff.ts,**/*.baseline.json'
---

# CDK Diff-Based Baseline Testing - Steering Guide

Guidance for the local per-module diff testing approach using CDK semantic diffs.

## Why Diff Tests

CDK diff tests use the CDK toolkit's own semantic diff engine, which understands CloudFormation structure and only flags real infrastructure changes. This eliminates false positives from cosmetic changes that have no infrastructure impact.

## Architecture

### Core Utility

`packages/utilities/mdaa-testing/lib/diff.ts` exports `baselineDiffTestApp()`. It:

1. Synths the CDK app via `app.synth()`
2. Stores each stack's CloudFormation template as `test/__snapshots__/{stackName}.baseline.json`
3. On subsequent runs, uses `@aws-cdk/toolkit-lib` (`Toolkit`, `DiffMethod.LocalFile`, `NonInteractiveIoHost`) to diff the current synth output against the stored baseline
4. Fails the test if `differenceCount > 0`, reporting which stacks changed

The function is exported from `@aws-mdaa/testing` alongside the existing `snapShotTestApp`.

### Baseline Files

- Single-stack configs: `test/__snapshots__/{configBaseName}.baseline.json` (e.g., `sample-config-comprehensive.baseline.json`)
- Multi-stack configs: `test/__snapshots__/{configBaseName}.{stackName}.baseline.json` (e.g., `sample-config-comprehensive.test-org-test-env-test-domain-test-module.baseline.json`)
- `configBaseName` is derived from the `module_configs` context value on the app
- Full CloudFormation templates, pretty-printed JSON
- No serializer masking — the raw template is stored as-is
- Created automatically on first run if missing
- Updated explicitly via `UPDATE_BASELINES=true`

## File Naming Convention

- Diff test files: `{module-name}.diff.test.ts`
- Baseline files: `test/__snapshots__/{configBaseName}.baseline.json` (or `{configBaseName}.{stackName}.baseline.json` for multi-stack)
- The `.diff.test.ts` suffix is important — npm scripts use it for selective test execution

## Writing a Diff Test

Each sample config gets one `baselineDiffTestApp` call. Use `Create.appProvider` from `@aws-mdaa/testing` to create the memoized app factory.

```typescript
import { describe } from '@jest/globals';
import { baselineDiffTestApp, Create } from '@aws-mdaa/testing';
import { MyModuleApp } from '../lib/my-module';
import * as path from 'path';

describe('MyModule Baseline Diff Tests', () => {
  baselineDiffTestApp(
    'MyModule Comprehensive',
    Create.appProvider(
      context => {
        const moduleApp = new MyModuleApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-comprehensive.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-my-module-app',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );

  baselineDiffTestApp(
    'MyModule Minimal',
    Create.appProvider(
      context => {
        const moduleApp = new MyModuleApp({
          context: {
            ...context,
            module_configs: path.join(__dirname, '..', 'sample_configs', 'sample-config-minimal.yaml'),
          },
        });
        moduleApp.generateStack();
        return moduleApp;
      },
      {
        module_name: 'test-my-module-minimal',
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
      },
    ),
  );
});
```

### Key Rules

- One `baselineDiffTestApp` call per sample config variant (comprehensive, minimal, each mutually exclusive variant)
- The `testNamePrefix` must be alphanumeric/spaces/hyphens/underscores, 1-100 chars
- The `module_name` in context determines the stack name, which determines the baseline filename — keep it stable
- Use `path.join(__dirname, '..', 'sample_configs', ...)` for config paths, same as snapshot and synth tests
- Sample configs use `{{context:account-2}}` and `{{context:account-3}}` for cross-account references — never hard-coded 12-digit account IDs. Diff tests inject these via context overrides: `'account-2': '222222222222'`, `'account-3': '333333333333'`
- `diff.ts` sets `CDK_DEFAULT_ACCOUNT=test-account`, `CDK_DEFAULT_REGION=test-region`, and registers `TestRegionFact` automatically — do not set these in individual diff test files
- For modules with non-deterministic resources (e.g., `Custom::DomainConfig` with a `refresh` timestamp), use `ignoreResourcePatterns` to skip those logical IDs

## Running Diff Tests

From a module directory (package root):

```bash
npm run test                    # run all tests (unit + diff) with coverage
npm run test:update-baselines   # update diff baselines after intentional changes
```

From the repo root (runs across all modules via lerna):

```bash
npx lerna run test                    # run all tests across all modules
npx lerna run test:update-baselines   # update baselines across all modules
```

## Adding Diff Tests to a New Module

All existing app modules already have diff tests and npm scripts. When creating a new app module:

### 1. Ensure the module's `package.json` has the test scripts

```json
{
  "scripts": {
    "test": "jest --passWithNoTests --coverage",
    "test:update-baselines": "UPDATE_BASELINES=true jest --passWithNoTests --testPathPattern='.*\\.diff\\.test\\.ts'"
  }
}
```

### 2. Ensure `@aws-cdk/toolkit-lib` is available

It comes transitively through `@aws-mdaa/testing`. No additional dependency needed in the module.

### 3. Create the diff test file

Follow the pattern above. Each sample config variant gets a `baselineDiffTestApp` call with the corresponding config and context.

### 4. Generate initial baselines

```bash
npm run test:update-baselines
```

This creates the `.baseline.json` files in `test/__snapshots__/`. Commit them.

### 5. Validate

Run the diff test again — it should pass with zero differences.

## When Baselines Need Updating

Update baselines when you intentionally change infrastructure output:

- Modified L3 construct logic that changes synthesized resources
- Updated CDK version that changes default resource properties
- Changed sample config values that affect the template
- Added or removed resources in the construct

Do NOT update baselines blindly. Review the diff output to confirm the changes are intentional.

## CI/CD Integration

In `.gitlab-ci.yml`:

- `feature_merge_test` — runs `npx lerna run test` on merge requests in the `analyze` stage
- `release_version_package` — runs `npx lerna run test:update-baselines` during release

## Test Coverage

Every app module under `packages/apps/` has `*.diff.test.ts` with matching sample config coverage. The npm script `test:update-baselines` regenerates baselines across all packages.

## How baselineDiffTestApp Works Internally

1. Calls `appProvider()` to get the CDK app, then `app.synth()` to produce the cloud assembly
2. Filters stacks to those with valid names and templates
3. For each stack, checks if the baseline file exists (named after the sample config, not the stack)
4. If missing (or `UPDATE_BASELINES=true`), writes the current template as the baseline and returns
5. If baselines exist, creates a `Toolkit` instance with `NonInteractiveIoHost({ isCI: true })`
6. Calls `toolkit.diff()` with `DiffMethod.LocalFile(baselineFile)` and a pattern matching the stack name
7. Collects any stacks with resource or output differences (`stackDiff.resources.differenceCount` + `stackDiff.outputs.differenceCount`) and fails the test with a summary that includes the test name prefix. Metadata, input parameters, conditions, and mappings are ignored.

The diff is semantic — it understands CloudFormation resource types, property changes, additions, removals. It does not trip on hash changes, asset renames, formatting differences, or metadata changes like nag suppression line numbers.
