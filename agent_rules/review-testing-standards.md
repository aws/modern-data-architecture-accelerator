---
scope: fileMatch
globs:
  - '**/*.test.ts'
  - '**/jest.config.*'
---

# Testing Standards - Steering Guide

Enforce and improve testing across all MDAA packages — L2 constructs, L3 constructs, app modules, Python code, and integration tests. This steering file covers the full testing strategy, including writing new tests, reviewing test quality, and working with diff baselines.

#[[file:TESTING.md]]
#[[file:CONTRIBUTING.md]]

## Scope

- **L2 construct tests**: `packages/constructs/L2/*/test/`
- **L3 construct tests**: `packages/constructs/L3/*/*/test/`
- **App module tests**: `packages/apps/*/*/test/`
- **CLI tests**: `packages/cli/test/`
- **Starter kit tests**: `starter_kits/test/`
- **Python tests**: `*/python-tests/`
- **Integration tests**: `packages/constructs/*/test/integ/`
- **Diff baselines**: `*/test/__snapshots__/*.baseline.json`
- **CLI command baselines**: `packages/cli/test/__snapshots__/cli-commands-*.baseline.json`, `starter_kits/test/*/baselines/cli-commands.baseline.json`

## Standards Summary

- 80% branch and 80% statement coverage, enforced via Jest (CLI: 75% branch)
- All compliance controls must have explicit test assertions
- CDK Nag rulesets validated via `MdaaTestApp.checkCdkNagCompliance()`
- Diff baselines committed to the repo and reviewed as part of code changes
- Non-deterministic test values: `test-account`, `test-region`, `test-partition`
- CLI changes are covered by command baselines: golden shell command strings, not templates

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
- Mutually exclusive config branches each have dedicated sample configs and tests. Note: a *new* additive field should extend the comprehensive sample config by default — only create a dedicated sample config when the field is mutually exclusive with a field already in the comprehensive config (see user-config-authoring.md section 8).

### CLI Tests
- Any change to command assembly, config resolution, or `{{...}}` reference handling has a command baseline diff. A CLI change with no baseline movement means the behavior is unpinned.
- Baseline coverage is for composition-emergent behavior (assembled command text, module ordering, merge outcomes). Field validation, parsing, and error handling stay in unit tests — do not duplicate them as baselines.
- New behavior extends the `sample_configs/sample-config-{usecase}.yaml` that owns the concern; a new config file is warranted only for a genuinely new concern, and must be registered in `SAMPLE_CASES`.
- A regenerated baseline must be attributable: every changed line traces to the diff, including semantically inert changes (requoting, path normalization).
- Hand-edited baselines are a defect. Baselines are generated output.

### Starter Kit Tests
- A CLI change must select the kit CLI command baselines. `scripts/test/test_starter_kit.py` detection path 5 matches `@aws-mdaa/cli` in the nx affected set — without it, kit baselines go stale while module synths pass.
- A CLI change that alters command format requires regenerated kit baselines in the same MR.

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
npm run test:update-baselines:all  # from repo root
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

## CLI Command Baseline Testing

The CLI emits a shell command per module. That command — not a CloudFormation template — is its contract, and it is fully determined before any template exists. App diff tests build CDK context in-process and never exercise the encode-to-argv step, so a command-assembly change leaves every template baseline passing.

### How It Works

1. A sample config is staged into a temp directory
2. The CLI runs with `--testing`, which prints each command instead of executing it (no AWS, CDK, network, Terraform, Checkov, or pip)
3. `parseCliCommands` folds line-continued output into one entry per logical command
4. `compareCliBaseline` diffs against the committed baseline; paths normalize to `/TEMP_DIR` and `/REPO_ROOT` so baselines are portable

Two consumers: `packages/cli/test/cli-commands.diff.test.ts` (one config per concern) and `starter_kits/test/starter-kit.diff.test.ts` (each kit's real `mdaa.yaml`).

### Key Rules

- One sample config per concern, not per schema variant: hierarchy, env-templates, refs, shell-values, orchestration, npm-version, terraform
- Configs are fixtures, not user-facing examples. Deliberately invalid or unsafe values are correct in `sample-config-shell-values.yaml`; app sample-config standards (minimal/comprehensive, inline schema docs) do not apply
- No SSM refs (`{{ssm-org:...}}`, `{{resolve:ssm:...}}`) — they resolve in a construct scope during synth and throw during CLI config resolution
- Baselines record current behavior including known defects; each defect is documented in the header of the config that exercises it
- Never hand-edit a baseline — change the CLI and regenerate

### Updating Command Baselines

```bash
npm run test:update-baselines                          # from packages/cli
UPDATE_BASELINES=true npm run test:starter-kits:all    # kit baselines, from repo root
```

Commands are inert text under `--testing`, so an unreviewed baseline can hide a defect no template diff would surface. A quoting change that looks cosmetic can alter what the shell delivers to the app. Read every changed line.

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

### New CLI Behavior
1. Add the case to the `sample_configs/sample-config-{usecase}.yaml` that owns the concern, or create a new config and register it in `SAMPLE_CASES`
2. Cover only composition-emergent behavior; field validation and parsing go in unit tests
3. Run `npm run test:update-baselines` from `packages/cli` and read every changed command line
4. If command format changed, regenerate kit baselines with `UPDATE_BASELINES=true npm run test:starter-kits:all`
5. Commit baselines with the code change

## Validation

After making test changes:

1. `npm run test` in the affected package — all tests pass with coverage
2. `npm run lint` — no linting errors
3. If baselines were updated, review the diff to confirm changes are intentional
4. If new sample configs were added, verify corresponding diff, synth, and snapshot tests exist
5. If the CLI changed, verify command baselines moved and every changed line is attributable; run `npm run test:starter-kits` to confirm kit baselines are current


## CI Agent Usage

This section is used by the automated Test Standards CI agent. When invoked by the agent,
Kiro receives the test files, sample config filenames, jest config, baseline filenames, code diff,
and package type for a single package, and must produce structured JSON findings.

### JSON Output Schema

Write findings to `{output_file}` as a JSON object. No preamble, no markdown fences, no explanation
outside the JSON. The file must contain ONLY valid JSON.

```json
{
  "overall_risk": "HIGH | MEDIUM | LOW",
  "summary": "One paragraph explaining the overall test standards alignment.",
  "findings": [
    {
      "risk": "HIGH | MEDIUM | LOW",
      "category": "missing_test | naming | coverage | baseline | nag_compliance",
      "file": "path/to/file (the test file or source file with the gap)",
      "detail": "What's missing or wrong and what should be done."
    }
  ]
}
```

### Risk Classification for CI Agent

- **HIGH:** Missing compliance test assertions for new security-related code (encryption, IAM policies, access controls, security groups, logging). Missing `checkCdkNagCompliance()` call in a construct test. Missing `baselineDiffTestApp` for a sample config in an app module. A CLI command-assembly or config-resolution change with no CLI command baseline movement. A hand-edited baseline.
- **MEDIUM:** Missing functional test assertions for new non-security code (resource composition, constructor validation, cross-account logic). Test file naming violations. Hardcoded test values (`us-east-1` instead of `test-region`), except in the baselines of a starter kit whose `mdaa.yaml` pins that region. Coverage threshold misconfiguration. A CLI change altering command format without regenerated starter kit baselines. A CLI baseline case duplicating what unit tests already assert.
- **LOW:** Missing test assertions for non-functional changes (tags, descriptions, metadata). Missing `test:update-baselines` script. Minor style issues.

### Rules for CI Agent Findings

- One finding per test gap. Group related gaps (e.g., missing diff + synth + snapshot for the same config) into one finding.
- **Layer-specific focus:**
  - **L2 constructs:** Focus on compliance test assertions (encryption, access controls, logging). Functional tests are secondary.
  - **L3 constructs:** Focus on compliance tests AND functional tests (resource composition, constructor validation). Tags, metadata, and operational properties are LOW priority.
  - **App modules:** Focus on diff baseline tests (every sample config has a `baselineDiffTestApp`). Schema coverage is the Module Quality agent's concern, not this agent's.
- Every finding must include `file` pointing to either the missing test location or the source file that lacks test coverage.
- Only flag gaps related to code that was CHANGED in this MR. Do not flag pre-existing test gaps.
- For app modules, cross-reference sample config filenames against `baselineDiffTestApp` calls in diff test files.
- For constructs, check that new/changed classes in `lib/` have corresponding test assertions.
- For `packages/cli`, cross-reference `sample_configs/sample-config-*.yaml` filenames against `SAMPLE_CASES` entries in `test/cli-commands.diff.test.ts`. Flag a changed CLI `lib/` file whose behavior no baseline pins.
- Order findings: HIGH first, then MEDIUM, then LOW.
- Use only ASCII characters in all string values.
