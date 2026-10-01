# Testing

MDAA employs a layered testing strategy that mirrors the construct architecture. Each layer has distinct testing goals, tools, and coverage expectations.

## Standards

- All packages require 80% branch and 80% statement coverage, enforced via the root `jest.config.js`
- App packages inherit a lower branch threshold (0%) via `packages/apps/jest.config.js` due to an Istanbul/ts-jest quirk with default constructor parameters
- All compliance controls must have explicit test assertions, not just coverage
- CDK Nag rulesets (AwsSolutions, NIST 800-53 R5, HIPAA Security, PCI DSS 3.2.1) are validated in construct tests via `MdaaTestApp.checkCdkNagCompliance()`
- Tests run with `jest --passWithNoTests --coverage` as a single unified command
- Diff baselines are committed to the repository and reviewed as part of code changes
- Non-deterministic test values use `test-account`, `test-region`, `test-partition` for stable, reproducible output. The exception is a starter kit whose `mdaa.yaml` pins a concrete `region`: its baselines carry that region and its partition.
- The CLI is covered by command baselines — golden shell command strings — because its output is a command, not a template

## Quick Reference

### Running Tests

```bash
# From the repository root:
npm test                       # Affected TS tests + all Python tests
npm run test:all               # All TS tests, no cache
npm run test:python            # Python tests on affected packages
npm run test:python:all        # Python tests on all packages
npm run test:update-baselines  # Regenerate diff baselines after intentional changes
npm run test:starter-kits      # Starter kit tests, scoped to what the change affects
npm run test:starter-kits:all  # All starter kit tests for all kits

# From any package directory:
npm test                       # Run that package's tests with coverage
```

Starter kit tests are a separate command because they run the real CLI end to end per kit; `npm test` does not include them.

### Pre-push Validation

Run the MR pipeline checks locally before pushing:

```bash
npm run prepush                # Affected only, uses Nx cache (fast)
npm run prepush:all            # All packages, no cache (thorough)
```

Both run the same 6 steps, differing only in scope:

1. Validate package structure (`validate_packages.sh`)
2. Validate dependency lock file (`validate_dependencies.sh`)
3. Lint TypeScript
4. Lint Python
5. Prettier
6. Build + test

### Force Commands (no Nx affected, no cache)

```bash
npm run build:all              # Build all packages
npm run test:all               # Test all packages
npm run lint:all               # Lint all packages
npm run prettier:all           # Prettier all packages
```

## Jest Configuration

All 132 package jest configs inherit from the root `jest.config.js`:

```
jest.config.js (root)                    ← shared defaults + setupFiles
├── packages/apps/jest.config.js         ← apps base (branch threshold: 0%)
│   └── ~30 app package configs          ← inherit from apps base
└── ~102 construct/utility/cli configs   ← inherit from root directly
```

The root config provides:
- `roots`, `testMatch`, `transform` (ts-jest), `coverageReporters`
- `setupFiles` → `jest.setup.js` (mocks Docker/pip builds globally)
- `coverageThreshold`: 80% branches, 80% statements

Per-package configs only override what differs (typically `coverageThreshold`). No standalone configs exist.

### Global Test Mocks (`jest.setup.js`)

The root `jest.setup.js` runs before every test file in every package. It prevents Docker and pip builds during tests:

- Mocks `command-exists` → `sync` returns `false` (no Docker/finch detection)
- Stubs `Code.fromDockerBuild` and `Code.fromCustomCommand` → return mock code objects
- Preserves all other `Code` static methods (`fromAsset`, `fromInline`, etc.)

This eliminates the need for per-test-file Docker mocks. Three test files retain their own `command-exists` mocks because they test behavior that depends on it:
- `code-asset.compliance.test.ts` — tests the Docker vs pip branching logic
- `mdaa-cli.test.ts` / `mdaa-cli-sanity.test.ts` — CLI tests that simulate Docker availability


## L2 Constructs

L2 constructs wrap CDK L1/L2 constructs with compliance controls and developer experience improvements such as standardized props typing, MDAA naming conventions, and automatic CDK Nag suppression management.

### What to Test

Every compliance-related feature must be tested:

- Resource property enforcement (encryption, logging, access controls)
- CDK Nag compliance (AwsSolutions, NIST 800-53, HIPAA, PCI DSS)
- MDAA naming convention application
- SSM parameter and CloudFormation output generation
- IAM policy scoping and least-privilege enforcement
- Input validation and error handling

### How to Test

L2 tests use the CDK Assertions library (`Template.fromStack()`) to inspect synthesized CloudFormation templates. Tests instantiate the construct with `MdaaTestApp`, then assert on resource properties, resource counts, and CDK Nag compliance.

```typescript
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '../lib';

describe('MDAA Compliance Tests', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  new MdaaKmsKey(testApp.testStack, 'test-key', {
    naming: testApp.naming,
    alias: 'test-key',
    keyUserRoles: [roleHelper.resolveRoleRef({ refId: 'test-user', id: 'test-user-id' })],
    keyAdminRoles: [roleHelper.resolveRoleRef({ refId: 'test-admin', id: 'test-admin-id' })],
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Key rotation is enabled', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });
});
```

### File Naming

- `{construct}.compliance.test.ts` for compliance and property assertions
- `{construct}.test.ts` for additional unit tests (edge cases, error handling)

### Coverage

L2 constructs require 80% branch and statement coverage. All compliance controls must have explicit test assertions.

## L3 Constructs

L3 constructs implement architectural patterns and multi-resource integrations. They compose L2 constructs and CDK resources into higher-level abstractions (e.g., a data lake with buckets, encryption, access controls, and Lake Formation permissions).

L3 constructs also implement compliance controls when a reusable L2 construct isn't warranted for a particular resource type.

### What to Test

- All compliance controls implemented at the L3 level (encryption, IAM policies, security groups, logging)
- Resource composition and dependency ordering
- Constructor input validation and error handling
- Cross-account and cross-region resource generation
- CDK Nag compliance for the full construct tree

### How to Test

Same approach as L2: CDK Assertions library with `MdaaTestApp`. L3 tests typically have more complex setup because they compose multiple resources.

```typescript
import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { Template } from 'aws-cdk-lib/assertions';
import { MyL3Construct } from '../lib';

describe('MDAA Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  new MyL3Construct(testApp.testStack, 'test-construct', {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    // ... construct-specific props
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('S3 bucket has encryption', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        /* ... */
      },
    });
  });
});
```

### File Naming

- `{construct}.compliance.test.ts` for compliance and resource property assertions
- `{construct}.test.ts` for functional unit tests
- `{construct}.constructor.test.ts` or `constructor-exceptions.test.ts` for input validation
- `validators.test.ts` for standalone validation logic

### Coverage

L3 constructs require 80% branch and statement coverage. All compliance controls must have explicit test assertions, whether implemented at the L3 level or delegated to L2 constructs.

## Apps / Modules

App modules implement configuration schemas (TypeScript interfaces auto-generated to JSON Schema) and translate user-provided YAML configuration into L3 construct props. They are the user-facing entry point for deploying infrastructure.

### What to Test

App-level testing validates the full pipeline from configuration to CloudFormation output:

- Configuration schema coverage: every schema property exercised through sample configs
- Schema validation: invalid configs rejected, required fields enforced
- Infrastructure stability: generated CloudFormation resources do not change unexpectedly across versions
- Multi-config variant coverage: mutually exclusive config branches each have dedicated sample configs

### How to Test: Diff Baseline Testing

App modules use CDK diff-based baseline testing. This approach uses the CDK toolkit's semantic diff engine to compare synthesized CloudFormation templates against committed baselines.

Each sample config gets a `baselineDiffTestApp` call that:

1. Synths the CDK app with the sample config
2. Stores the CloudFormation template as a `.baseline.json` file
3. On subsequent runs, diffs the current output against the baseline using `@aws-cdk/toolkit-lib`
4. Fails if resources or outputs changed

Only resource and output differences are flagged. Metadata changes (CDK Nag suppression annotations, asset hashes, CDK version metadata) are ignored, eliminating false positives that plagued traditional snapshot testing.

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
});
```

### Sample Configs

Every app module has sample configuration files under `sample_configs/`:

- `sample-config-minimal.yaml` for the simplest valid deployment
- `sample-config-comprehensive.yaml` exercising every compatible schema property
- `sample-config-{variant}.yaml` for mutually exclusive configuration branches

Sample configs use template variables (`{{region}}`, `{{account}}`, `{{partition}}`) instead of hard-coded AWS values. Cross-account references use `{{context:account-2}}`, `{{context:account-3}}`.

Each sample config must have a corresponding `baselineDiffTestApp` call in the module's diff test file.

### Baseline Files

Baselines are stored as JSON in `test/__snapshots__/`:

- Single-stack: `{configBaseName}.baseline.json`
- Multi-stack: `{configBaseName}.{stackName}.baseline.json`

Baselines are committed to the repository. When infrastructure changes are intentional:

```bash
# From the repo root — update baselines for affected packages
npm run test:update-baselines

# From a specific package directory
UPDATE_BASELINES=true npm test
```

Review the diff output before committing updated baselines to confirm changes are intentional.

### Handling Non-Deterministic Resources

Some resources produce non-deterministic output (e.g., timestamps, generated IDs). Two options are available:

**Strip entire resources** — use `ignoreResourcePatterns` when the entire resource is non-deterministic (e.g., Lambda versions with hash-based logical IDs):

```typescript
baselineDiffTestApp('MyModule Comprehensive', appProvider, {
  ignoreResourcePatterns: ['scheduledaction'],
});
```

**Strip specific properties** — use `ignoreResourceProperties` when a resource is mostly stable but has one or two non-deterministic properties (e.g., a `refresh` timestamp). This keeps the resource in the baseline so its other properties are still validated:

```typescript
baselineDiffTestApp('MyModule Comprehensive', appProvider, {
  ignoreResourceProperties: { 'domainConfigcr': ['refresh'] },
});
```

Both options strip the ignored content from the baseline template at write time, so baselines only contain validated content.

### File Naming

- `{module-name}.diff.test.ts` for diff baseline tests (one per module)
- `test/__snapshots__/*.baseline.json` for committed baseline templates

### Coverage

App modules require 80% statement coverage. Branch coverage is set to 0% at the apps base level due to an Istanbul/ts-jest quirk where default constructor parameters (`props: AppProps = {}`) count as uncovered branches even when all real logic is tested.

### Diff Risk Assessment

Baseline diffs must be reviewed carefully before committing. Not all diffs are equal — some represent routine changes, while others can cause data loss or deployment failures in existing environments. Treat every baseline update as a change to deployed infrastructure.

#### Breaking Diffs

A breaking diff is any change that would cause a CloudFormation deployment failure in an existing environment. Breaking diffs must be avoided at all costs. Common causes:

- Renaming a CloudFormation logical ID for a stateful resource (S3 bucket, DynamoDB table, RDS instance) — CloudFormation deletes the old resource and creates a new one, losing all data
- Changing a resource property that requires replacement (e.g., `BucketName` on an S3 bucket, `TableName` on a DynamoDB table) — same delete-and-recreate behavior
- Removing a resource that other stacks or external systems depend on (exports, SSM parameters, IAM roles referenced by running workloads)

#### Data-Containing Resource Diffs

Any diff that deletes or replaces a data-containing resource requires explicit justification and review. These resources include S3 buckets, DynamoDB tables, RDS/Aurora instances, OpenSearch domains, EFS file systems, and Glue databases/tables. Even if the replacement resource is identical, the data in the original resource is lost.

When reviewing a baseline diff, flag any resource where `Action: DELETE` or `Action: REPLACE` appears on a data-containing resource type. If the change is intentional, document why data loss is acceptable or how data migration will be handled.

#### Construct ID and Scoping Changes

CDK generates CloudFormation logical IDs from the construct tree path. Changes to construct IDs, nesting depth, or scope hierarchy silently change logical IDs, which CloudFormation interprets as "delete old resource, create new one." This is particularly dangerous because:

- The new resource has the same configuration as the old one, so the diff looks harmless — just a logical ID rename
- But CloudFormation will attempt to create the new resource before deleting the old one, causing naming collisions if the resource has a fixed physical name (e.g., S3 bucket name, IAM role name, SSM parameter path)
- Even if creation succeeds, the old resource is orphaned or deleted, losing any data it contained

Watch for these patterns in diffs:

- A resource disappearing at one logical ID and appearing at another with identical properties
- Changes to construct `id` parameters in L2/L3 constructors
- Moving a construct from one scope to another (e.g., from the stack directly into a nested construct)
- Refactoring that changes the construct tree depth (adding or removing intermediate constructs)

When a logical ID change is unavoidable, it must be handled with a CloudFormation resource import or a migration plan — never by simply updating the baseline and deploying.

#### Privilege Escalation Diffs

Changes that increase permissions or broaden access require security review, even though they deploy successfully. Watch for:

- IAM policy statements with added actions, especially `*` actions or sensitive actions (`iam:PassRole`, `sts:AssumeRole`, `kms:Decrypt`)
- Removal of IAM policy conditions that previously scoped access (`aws:SourceArn`, `aws:SourceAccount`)
- Broadened resource ARNs (e.g., scoped prefix → wildcard)
- New principals in resource policies (S3, KMS, SNS/SQS)
- Security group ingress additions, especially `0.0.0.0/0`
- Removal of `DeletionPolicy: Retain` or `UpdateReplacePolicy: Retain`

Privilege escalation is dangerous because it deploys without errors but silently weakens the security posture. Verify the increase is intentional, justified, and follows least-privilege principles.

#### New CDK Nag Suppressions

New `NagPackSuppression` entries — whether in construct code or config-level `nag_suppressions` — are explicit opt-outs from compliance controls. Each new suppression requires compliance review:

- The reason must be specific and reference AWS service authorization documentation
- The suppression must be scoped as narrowly as possible (resource-level, not stack-level)
- Suppressions that bypass encryption or access control requirements are highest priority for review

> **Kiro:** The `diff-risk-assessment` steering file automates reviewing baseline diffs for breaking changes, data loss risks, and construct ID scoping issues. It activates automatically when baseline files are modified.

## CLI

The CLI (`packages/cli`) resolves the config hierarchy, transforms `{{...}}` references, and interpolates the result into one shell command per module, which it then executes in a child process. Its observable contract is therefore **the command string**, not a CloudFormation template — every step runs before any template exists.

Template baselines cannot cover this. App-level diff tests build their CDK context in-process, so they never exercise the encode-to-argv step where quoting, escaping, and reference interpolation happen. A change to command assembly leaves every template baseline passing.

### How to Test: CLI Command Baseline Testing

Sample configs run through the real CLI in `--testing` mode, which prints each command instead of executing it. No AWS credentials, CDK, network, Terraform, Checkov, or pip is needed, so the whole suite runs in seconds:

1. A sample config is staged into a temp directory
2. The CLI runs with `--testing`, printing every command it would execute
3. `parseCliCommands` folds line-continued output into one entry per logical command
4. `compareCliBaseline` diffs the result against the committed baseline

Paths are normalized to `/TEMP_DIR` and `/REPO_ROOT`, so baselines are portable between local runs and CI.

The mechanism is used in two places:

| Where | Configs | Baseline | What it pins |
|---|---|---|---|
| `packages/cli/test/cli-commands.diff.test.ts` | `packages/cli/sample_configs/sample-config-{usecase}.yaml` | `packages/cli/test/__snapshots__/cli-commands-{usecase}.baseline.json` | CLI behavior per use case — one config per concern |
| `starter_kits/test/starter-kit.diff.test.ts` | each kit's `mdaa.yaml` | `starter_kits/test/{kit}/baselines/cli-commands.baseline.json` | The commands a real kit produces end to end |

### Sample Configs

Unlike app modules, which vary a single schema, CLI sample configs are partitioned **one file per concern**. Each isolates one aspect of command assembly so a baseline diff points at a single cause:

| Config | Concern |
|---|---|
| `sample-config-hierarchy.yaml` | Global → domain → env → module resolution; which fields merge, accumulate, or replace |
| `sample-config-env-templates.yaml` | `env_templates` at global and domain scope; template module ordering and overrides |
| `sample-config-refs.yaml` | `{{org}}`, `{{context:...}}`, `{{env_var:...}}` resolution, and `{{region}}`/`{{account}}`/`{{partition}}` pass-through |
| `sample-config-shell-values.yaml` | Adversarial values (spaces, quotes, `$`, `$(...)`, backticks, `&&`, `;`) through every quote-only config sink |
| `sample-config-orchestration.yaml` | Staging, bootstrap toggles, stage grouping and module ordering |
| `sample-config-npm-version.yaml` | The npm install branch: `module_path@version` composition and `--tag` |
| `sample-config-terraform.yaml` | `module_type: tf` — Terraform action mapping and `-var` arguments |

Add a case to the existing config that owns the concern. Only add a new config when the concern is genuinely new, and add its name to `SAMPLE_CASES` in the diff test.

Choose baseline coverage for behavior that is **emergent from composition** — the assembled command text, ordering, and merge outcomes. Field-level validation, parsing, and error handling belong in unit tests; do not duplicate them here.

Configs may deliberately contain values that are invalid or unsafe in a real deployment — that is the point of `sample-config-shell-values.yaml`. They are test fixtures, not user-facing examples, so the sample-config standards for app modules (minimal/comprehensive, inline schema documentation) do not apply.

SSM references (`{{ssm-org:...}}`, `{{resolve:ssm:...}}`) must not appear: they resolve inside a construct scope during synth and throw when the CLI resolves a config.

### Baseline Files

Baselines record **current** behavior, including known defects. A defect is documented in the header comment of the config that exercises it, so a reader is not misled into treating the output as correct.

Never hand-edit a baseline. Change the CLI and regenerate, so the diff is the evidence of the change:

```bash
# From packages/cli
npm run test:update-baselines

# Compare a different CLI build against the committed baselines
MDAA_CLI_ENTRYPOINT_OVERRIDE=/path/to/packages/cli/lib/mdaa.js npx jest --testPathPattern=cli-commands
```

Because commands are inert text under `--testing`, an unreviewed baseline can hide a defect that a template diff would never surface. Read every changed line: a quoting change that looks cosmetic can alter what the shell delivers to the app.

### File Naming

- `test/cli-commands.diff.test.ts` for the CLI's own command baselines
- `test/__snapshots__/cli-commands-{usecase}.baseline.json` for committed command baselines
- `sample_configs/sample-config-{usecase}.yaml` for the configs that drive them

### Coverage

The CLI requires 80% statement and 75% branch coverage (`packages/cli/jest.config.js`).

### Starter Kit Test Selection

Starter kit tests are selected per kit by `scripts/test/test_starter_kit.py`, which runs only what a change affects. A CLI change selects every kit's CLI command baseline (detection path 5, matched on `@aws-mdaa/cli` in the nx affected set) but no module synths — command-string changes cannot alter template output.

This gate is required for correctness, not just speed. The CLI is never a kit `module_path`, and a CLI change touches no kit `mdaa.yaml`, so without it the module synth baselines still run and pass while the CLI baselines silently go stale.

When a CLI change intentionally alters command format, regenerate the kit baselines too:

```bash
npm run test:starter-kits            # verify: affected kits only
UPDATE_BASELINES=true npm run test:starter-kits:all   # regenerate all kits
```

## Testing Python Code

MDAA includes Python testing for Lambda functions, Glue jobs, and other Python components.

### Python Test Structure

```
package-name/
├── python-tests/              # Python testing directory
│   ├── pyproject.toml        # Modern Python project config
│   ├── conftest.py           # Shared test fixtures
│   ├── .venv/               # Virtual environment (auto-managed by uv)
│   └── test_*.py            # Test files
├── src/ or lib/              # Python source code being tested
└── package.json              # npm scripts including test:python
```

### Running Python Tests

**Prerequisites: Install uv**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# or: brew install uv
```

```bash
# From the repo root
npm run test:python            # Affected packages only
npm run test:python:all        # All packages

# From any package with python-tests/
npm run test:python            # Runs via scripts/test/test_python_package.sh

# Direct uv commands (from a python-tests/ directory)
uv run pytest                  # Run all tests
uv run pytest --cov            # Run with coverage
uv run pytest -v               # Verbose output
```

### Adding Python Tests to New Packages

1. Create a `python-tests/` directory with `pyproject.toml`, `conftest.py`, and `test_*.py` files
2. Add `"test:python": "bash ../../../../scripts/test/test_python_package.sh"` to the package's `package.json` scripts (adjust the relative path depth as needed)
3. The centralized runner (`scripts/test/test_python_package.sh`) no-ops gracefully if `python-tests/` doesn't exist

## Testing Apps Locally

MDAA Apps can be tested like any CDK app using `cdk synth/diff/deploy` from the app directory, providing the necessary context values:

```bash
cdk synth --require-approval never \
  -c org="<org>" \
  -c env="<env>" \
  -c domain="<domain>" \
  -c module_configs="<path/to/config/file>" \
  -c module_name="<module_name>" \
  --all
```

Any changes to underlying dependencies (stacks, constructs) require rebuilding those packages first (`npm run build:all` from the repo root, or `npm run build` in each modified package).

## CI Pipeline

The CI pipeline runs tests at multiple stages:

| Stage    | Job                          | What Runs |
| -------- | ---------------------------- | --------- |
| prebuild | `feature_merge_lint`         | ESLint on affected packages |
| prebuild | `feature_merge_lint_python`  | Ruff on Python tools |
| prebuild | `feature_validate_packages`  | Package structure validation |
| build    | `feature_merge_build_test`   | Build + unit tests + diff tests (incl. CLI command baselines) with coverage |
| test     | `feature_merge_python_test`  | Python tests (reuses build cache) |
| test     | `feature_merge_starter_kit_generate` | Generates a child pipeline with one job per starter kit |
| test     | `sk_{kit}` (child pipeline)  | Per-kit CLI command baseline + affected module synth baselines |
| test     | `feature_merge_test_docs`    | Documentation build validation |
| analyze  | `feature_merge_sonarqube`    | SonarQube analysis |

Each `sk_{kit}` job self-filters to what the change affects via `scripts/test/test_starter_kit.py`, so an unaffected kit runs nothing.

## Adding Tests

### New L2 Construct

1. Create `test/{construct}.compliance.test.ts`
2. Use `MdaaTestApp` and `Template.fromStack()` for assertions
3. Call `testApp.checkCdkNagCompliance()` to validate Nag rules
4. Assert on all compliance-related resource properties
5. Ensure 80% branch and statement coverage

### New L3 Construct

1. Create `test/{construct}.compliance.test.ts` for compliance assertions
2. Create additional `test/{construct}.test.ts` files for functional tests
3. Test constructor validation in `test/constructor-exceptions.test.ts`
4. Ensure 80% branch and statement coverage

### New App Module

1. Create sample configs under `sample_configs/` (minimal + comprehensive + variants)
2. Create `test/{module}.diff.test.ts` with one `baselineDiffTestApp` per sample config
3. Create `test/{module}.snapshot.test.ts` with one `snapShotTestApp` per sample config using `Create.appProvider`
4. Run `UPDATE_BASELINES=true npm test` to generate initial baselines
5. Commit the baseline JSON files
6. Ensure 80% statement coverage

### New CLI Behaviour

1. Add the case to the `sample_configs/sample-config-{usecase}.yaml` that owns the concern, or create a new config and register it in `SAMPLE_CASES`
2. Cover only composition-emergent behavior here; put field validation and parsing in unit tests
3. Run `npm run test:update-baselines` from `packages/cli` and read every changed command line
4. Commit the baseline alongside the code change

### Updating Infrastructure

When a construct change intentionally modifies CloudFormation output:

1. Run `npm test` and review the diff failures
2. Confirm the changes are expected
3. Run `npm run test:update-baselines` to accept the new baselines
4. Commit the updated baseline files alongside the code change

### Updating Command Baselines

When a CLI change intentionally modifies emitted commands:

1. Run `npm test` in `packages/cli` and review the failures
2. Regenerate with `npm run test:update-baselines` from `packages/cli`
3. Regenerate the kit baselines with `UPDATE_BASELINES=true npm run test:starter-kits:all`
4. Verify each diff hunk is explained by the change; a semantically inert diff (requoting, path normalization) still needs to be attributed
5. Commit both sets of baselines with the code change
