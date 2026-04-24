---
inclusion: fileMatch
fileMatchPattern: '**/*.test.ts,**/jest.config.*'
---

# Testing Standards - Steering Guide

Enforce and improve testing across all MDAA packages — L2 constructs, L3 constructs, app modules, Python code, and integration tests. This steering file covers the full testing strategy, including writing new tests, reviewing test quality, and working with diff baselines.

#[[file:TESTING.md]]
#[[file:CONTRIBUTING.md]]

## Scope

- **L2 construct tests**: `packages/constructs/L2/*/test/`
- **L3 construct tests**: `packages/constructs/L3/*/*/test/`
- **App module tests**: `packages/apps/*/*/test/`
- **Python tests**: `*/python-tests/`
- **Integration tests**: `packages/constructs/*/test/integ/`
- **Diff baselines**: `*/test/__snapshots__/*.baseline.json`

## Standards Summary

- 80% branch and 80% statement coverage, enforced via Jest
- All compliance controls must have explicit test assertions
- CDK Nag rulesets validated via `MdaaTestApp.checkCdkNagCompliance()`
- Diff baselines committed to the repo and reviewed as part of code changes
- Non-deterministic test values: `test-account`, `test-region`, `test-partition`

## What to Review

### L2 Construct Tests
- Every compliance control has an explicit assertion (encryption, logging, access controls)
- CDK Nag compliance checked via `testApp.checkCdkNagCompliance()`
- MDAA naming conventions verified
- SSM parameter and CloudFormation output generation tested
- File naming: `{construct}.compliance.test.ts`, `{construct}.test.ts`

### L3 Construct Tests
- All L3-level compliance controls tested (encryption, IAM, security groups, logging)
- Resource composition and dependency ordering verified
- Constructor input validation and error handling tested
- Cross-account/cross-region resource generation tested
- File naming: `{construct}.compliance.test.ts`, `{construct}.test.ts`, `constructor-exceptions.test.ts`

### App Module Tests
- Every sample config has a corresponding `baselineDiffTestApp` call
- Every sample config has a synth test and snapshot test
- Schema coverage: every config property exercised through sample configs
- Mutually exclusive config branches each have dedicated sample configs and tests

### Python Tests
- Tests co-located in `python-tests/` directories
- Dependencies managed via `pyproject.toml` and `uv`
- Source path configured in `conftest.py`

## Diff Baseline Testing

App modules use CDK diff-based baseline testing via `baselineDiffTestApp` from `@aws-mdaa/testing`.

### How It Works

1. Synths the CDK app via `app.synth()`
2. Stores each stack's CloudFormation template as `test/__snapshots__/{configBaseName}.baseline.json`
3. On subsequent runs, diffs current output against stored baseline using `@aws-cdk/toolkit-lib`
4. Fails if resources or outputs changed (metadata, parameters, conditions, mappings are ignored)

### Key Rules

- One `baselineDiffTestApp` call per sample config variant
- `module_name` in context determines the stack/baseline filename — keep it stable
- Use `path.join(__dirname, '..', 'sample_configs', ...)` for config paths
- Cross-account references use context overrides: `'account-2': '222222222222'`, `'account-3': '333333333333'`
- `diff.ts` sets `CDK_DEFAULT_ACCOUNT=test-account`, `CDK_DEFAULT_REGION=test-region` automatically
- For non-deterministic resources, use `ignoreResourcePatterns` to skip specific logical IDs

### Updating Baselines

When infrastructure changes are intentional:

```bash
npm run test:update-baselines    # from package directory
npx lerna run test:update-baselines  # from repo root
```

Review the diff output before committing. Do NOT update baselines blindly.

### Adding Diff Tests to a New Module

1. Ensure `package.json` has the test scripts:
   ```json
   {
     "scripts": {
       "test": "jest --passWithNoTests --coverage",
       "test:update-baselines": "UPDATE_BASELINES=true jest --passWithNoTests --testPathPattern='.*\\.diff\\.test\\.ts'"
     }
   }
   ```
2. Create `test/{module}.diff.test.ts` with one `baselineDiffTestApp` per sample config
3. Run `npm run test:update-baselines` to generate initial baselines
4. Commit the `.baseline.json` files
5. Run `npm run test` to verify zero differences

## Adding Tests Checklist

### New L2 Construct
1. Create `test/{construct}.compliance.test.ts`
2. Use `MdaaTestApp` and `Template.fromStack()` for assertions
3. Call `testApp.checkCdkNagCompliance()` to validate Nag rules
4. Assert on all compliance-related resource properties
5. Ensure 80% branch and statement coverage

### New L3 Construct
1. Create `test/{construct}.compliance.test.ts` for compliance assertions
2. Create `test/{construct}.test.ts` for functional tests
3. Test constructor validation in `test/constructor-exceptions.test.ts`
4. Ensure 80% branch and statement coverage

### New App Module
1. Create sample configs under `sample_configs/` (minimal + comprehensive + variants)
2. Create `test/{module}.diff.test.ts` with one `baselineDiffTestApp` per sample config
3. Add `test:update-baselines` script to `package.json`
4. Generate and commit initial baselines
5. Ensure 80% branch and statement coverage

## Validation

After making test changes:

1. `npm run test` in the affected package — all tests pass with coverage
2. `npm run lint` — no linting errors
3. If baselines were updated, review the diff to confirm changes are intentional
4. If new sample configs were added, verify corresponding diff, synth, and snapshot tests exist
