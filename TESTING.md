# Testing

MDAA employs a layered testing strategy that mirrors the construct architecture. Each layer has distinct testing goals, tools, and coverage expectations.

## Standards

- All packages require 80% branch and 80% statement coverage, enforced via the root `jest.config.js`
- App packages inherit a lower branch threshold (0%) via `packages/apps/jest.config.js` due to an Istanbul/ts-jest quirk with default constructor parameters
- All compliance controls must have explicit test assertions, not just coverage
- CDK Nag rulesets (AwsSolutions, NIST 800-53 R5, HIPAA Security, PCI DSS 3.2.1) are validated in construct tests via `MdaaTestApp.checkCdkNagCompliance()`
- Tests run with `jest --passWithNoTests --coverage` as a single unified command
- Diff baselines are committed to the repository and reviewed as part of code changes
- Non-deterministic test values use `test-account`, `test-region`, `test-partition` for stable, reproducible output

## Quick Reference

### Running Tests

```bash
# From the repository root:
npm test                       # Affected TS tests + all Python tests
npm run test:all               # All TS tests, no cache
npm run test:python            # Python tests on affected packages
npm run test:python:all        # Python tests on all packages
npm run test:update-baselines  # Regenerate diff baselines after intentional changes

# From any package directory:
npm test                       # Run that package's tests with coverage
```

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
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '../lib';

describe('MDAA Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  new MdaaKmsKey(testApp.testStack, 'test-key', {
    naming: testApp.naming,
    alias: 'test-key',
    keyUserRoleIds: ['test-user-id'],
    keyAdminRoleIds: ['test-admin-id'],
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

Some resources produce non-deterministic output (e.g., timestamps, generated IDs). Use `ignoreResourcePatterns` to exclude specific logical IDs from diff checking:

```typescript
baselineDiffTestApp('MyModule Comprehensive', appProvider, {
  ignoreResourcePatterns: ['domainConfigcr', 'scheduledaction'],
});
```

### File Naming

- `{module-name}.diff.test.ts` for diff baseline tests (one per module)
- `test/__snapshots__/*.baseline.json` for committed baseline templates

### Coverage

App modules require 80% statement coverage. Branch coverage is set to 0% at the apps base level due to an Istanbul/ts-jest quirk where default constructor parameters (`props: AppProps = {}`) count as uncovered branches even when all real logic is tested.

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

For detailed Python testing documentation, see [PYTHON_TESTING.md](PYTHON_TESTING.md).

## Integration Tests

Integration tests deploy actual infrastructure to AWS accounts and validate end-to-end behavior. Tests are located under `packages/constructs/*/test/integ/` and organized into splits for parallel CI execution.

See [integ/constructs/README.md](integ/constructs/README.md) for full documentation.

### Testing Apps Locally

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

### Running Integration Tests

```bash
# Bootstrap shared resources (VPC, KMS, KeyPair)
./scripts/test/bootstrap-integ.sh

# Run tests for a specific package
python3 ./scripts/test/run-integ-tests.py packages/constructs/L2/s3-constructs

# Run a CI split
python3 ./scripts/test/run-integ-tests.py split_0

# Teardown
./scripts/test/bootstrap-integ.sh --teardown
```

Prerequisites: AWS credentials configured, `AWS_REGION` or `AWS_DEFAULT_REGION` set.

## CI Pipeline

The CI pipeline runs tests at multiple stages:

| Stage    | Job                          | What Runs |
| -------- | ---------------------------- | --------- |
| prebuild | `feature_merge_lint`         | ESLint on affected packages |
| prebuild | `feature_merge_lint_python`  | Ruff on Python tools |
| prebuild | `feature_validate_packages`  | Package structure validation |
| build    | `feature_merge_build_test`   | Build + unit tests + diff tests with coverage |
| test     | `feature_merge_python_test`  | Python tests (reuses build cache) |
| test     | `feature_merge_test_docs`    | Documentation build validation |
| test     | `feature_merge_integ_split_*`| Integration tests against AWS accounts |
| analyze  | `feature_merge_sonarqube`    | SonarQube analysis |

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
3. Run `UPDATE_BASELINES=true npm test` to generate initial baselines
4. Commit the baseline JSON files
5. Ensure 80% statement coverage

### Updating Infrastructure

When a construct change intentionally modifies CloudFormation output:

1. Run `npm test` and review the diff failures
2. Confirm the changes are expected
3. Run `npm run test:update-baselines` to accept the new baselines
4. Commit the updated baseline files alongside the code change
