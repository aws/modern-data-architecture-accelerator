# Testing

MDAA employs a layered testing strategy that mirrors the construct architecture. Each layer has distinct testing goals, tools, and coverage expectations.

## Standards

- All packages require 80% branch and 80% statement coverage, enforced via Jest configuration
- All compliance controls must have explicit test assertions, not just coverage
- CDK Nag rulesets (AwsSolutions, NIST 800-53 R5, HIPAA Security, PCI DSS 3.2.1) are validated in construct tests via `MdaaTestApp.checkCdkNagCompliance()`
- Tests run with `jest --passWithNoTests --coverage` as a single unified command
- Diff baselines are committed to the repository and reviewed as part of code changes
- Non-deterministic test values use `test-account`, `test-region`, `test-partition` for stable, reproducible output

## Architecture Overview

- **L2 Constructs**: Wrap CDK L1/L2 constructs with compliance controls, standardized props typing, and MDAA naming conventions. Available in TypeScript, Python, Java, and .NET via JSII. Tested with CDK Assertions to verify every compliance control and resource property.

- **L3 Constructs**: Implement architectural patterns and multi-resource integrations. Compose L2 constructs into higher-level abstractions and implement compliance controls where reusable L2 constructs have not been authored. TypeScript-only. Tested with CDK Assertions for compliance, plus unit tests for input validation and edge cases.

- **Apps / Modules**: Configuration-driven CDK apps that translate user-provided YAML configuration into L3 construct props, applying schema validation and deploying compliant infrastructure as CloudFormation stacks. Tested with CDK diff-based baselines that detect resource and output drift across versions, exercising every config schema property through sample configs.

![MDAA Code Architecture](docs/MDAA-Code-Architecture.png)

## Running Tests

```bash
# Full Repo Testing
# Run all tests across the monorepo
npx lerna run test

# Update baselines across all modules
npx lerna run test:update-baselines

# Per Package Testing
# Run all package-level tests with coverage (from any package directory)
npm run test

# Update diff baselines after intentional infrastructure changes
npm run test:update-baselines
```

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

L2 constructs require 80% branch and statement coverage (enforced via `jest.config.js`). All compliance controls must have explicit test assertions.

## L3 Constructs

L3 constructs implement architectural patterns and multi-resource integrations. They compose L2 constructs and CDK resources into higher-level abstractions (e.g., a data lake with buckets, encryption, access controls, and Lake Formation permissions).

L3 constructs also implement compliance controls where reusable L2 constructs have not been authored for a particular resource type.

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

Baselines are committed to the repository. When infrastructure changes are intentional, update baselines with:

```bash
npm run test:update-baselines
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

App modules require 80% branch and statement coverage. Diff tests exercise the full config parsing and construct instantiation pipeline, contributing to coverage alongside any additional unit tests.

## Integration Tests

Integration tests deploy actual infrastructure to AWS accounts and validate end-to-end behavior. These are located under `packages/constructs/*/test/integ/` and use the CDK integration test framework.

Integration tests run in CI against dedicated test accounts and are split across multiple parallel jobs for performance.

## CI Pipeline

The CI pipeline runs tests at multiple stages:

| Stage       | Job                           | What Runs                               |
| ----------- | ----------------------------- | --------------------------------------- |
| build       | `feature_merge_build_test`    | Unit tests and diff tests with coverage |
| analyze     | `feature_merge_test`          | Full test suite across all modules      |
| test        | `feature_merge_integ_split_*` | Integration tests against AWS accounts  |
| pre_release | `release_version_package`     | Baseline update for new version         |

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
3. Add `test:update-baselines` script to `package.json`
4. Run `npm run test:update-baselines` to generate initial baselines
5. Commit the baseline JSON files
6. Ensure 80% branch and statement coverage

### Updating Infrastructure

When a construct change intentionally modifies CloudFormation output:

1. Run `npm run test` and review the diff failures
2. Confirm the changes are expected
3. Run `npm run test:update-baselines` to accept the new baselines
4. Commit the updated baseline files alongside the code change
