<!---
 Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 SPDX-License-Identifier: Apache-2.0
-->

# MDAA L2 Construct Integration Tests

Fast-tier integration tests for MDAA L2 constructs. Each test deploys real AWS resources, validates behavior, and tears down — all within 5 minutes.

## Structure

Tests are co-located with their construct packages in `test/integ/` directories:

```
packages/constructs/L2/
├── s3-constructs/
│   └── test/integ/
│       └── bucket.integ.ts
├── sqs-constructs/
│   └── test/integ/
│       └── queue.integ.ts
├── lambda-constructs/
│   └── test/integ/
│       └── function.integ.ts
└── ...

integ/constructs/
├── fixture.ts           # Shared infrastructure (VPC, KMS key, EC2 KeyPair)
├── splits.yaml          # Split configuration for CI parallelism
└── README.md            # This file
```

Test files follow the naming convention `*.integ.ts` and are located in `test/integ/` subdirectories of each L2 construct package.

## Split Configuration

Tests are grouped into splits for parallel CI execution. The split configuration is defined in `integ/constructs/splits.yaml`:

```yaml
# Split configuration for L2 construct integration tests
# Each split runs in a separate CI job
# Region is passed via AWS_REGION env var to the runner script

splits:
  - name: split_0
    tests:
      # SageMaker lifecycle config (~1 min)
      - packages/constructs/L2/sagemaker-constructs/test/integ/lifecycle-config.integ.ts
      # DMS endpoint (~1 min)
      - packages/constructs/L2/dms-constructs/test/integ/endpoint.integ.ts
      # ECS constructs (~2 min)
      - packages/constructs/L2/ecs-constructs/test/integ/ecs.integ.ts

  - name: split_1
    tests:
      # CloudWatch extras (~1 min)
      - packages/constructs/L2/cloudwatch-constructs/test/integ/extras.integ.ts
      # ... more tests

  - name: split_2
    tests:
      # S3 bucket (~1 min)
      - packages/constructs/L2/s3-constructs/test/integ/bucket.integ.ts
      # ... more tests
```

### Split Config Format

- `splits`: Array of split definitions
- `name`: Split identifier (e.g., `split_0`, `split_1`, `split_2`)
- `tests`: Array of test file paths relative to the repository root

### Supported Patterns

The config supports both explicit file paths and glob patterns:

```yaml
tests:
  # Explicit file path
  - packages/constructs/L2/s3-constructs/test/integ/bucket.integ.ts
  
  # Glob pattern (matches all integ tests in a package)
  - packages/constructs/L2/s3-constructs/test/integ/*.integ.ts
  
  # Glob pattern (matches all integ tests across all L2 packages)
  - packages/constructs/L2/*/test/integ/*.integ.ts
```

## Fixture Stack

The fixture (`MdaaIntegInfraFixtureStack`) provides shared resources that are expensive or slow to create:

- **VPC** — 2 AZs, NAT gateway, public/private subnets, S3 and STS endpoints
- **KMS Key** — Shared encryption key with CloudWatch Logs permissions
- **EC2 KeyPair** — Stored in Secrets Manager for EC2 tests

The fixture is deployed once by bootstrap-integ.sh, and key shared resource ARNs are stored as CloudFormation stack outputs. After deployment, other scripts can retrieve them directly from the outputs.

```python
ENV_VARS_MAP = [
    ("INTEG_KMS_KEY_ARN", "KmsKeyArn"),            # KMS key ARN for encryption
    ("INTEG_VPC_ID", "VpcId"),                     # VPC ID
    ("INTEG_PRIVATE_SUBNETS", "PrivateSubnets"),   # Comma-separated private subnet IDs
    ("INTEG_AZS", "AvailabilityZones"),            # Comma-separated availability zones
]
```

## Running Tests

### Prerequisites

1. AWS credentials configured (via environment or profile)
2. `AWS_REGION` or `AWS_DEFAULT_REGION` set
3. Dependencies installed: `npm run install:all` from repo root

### Bootstrap (first time or after teardown)

```bash
./scripts/bootstrap-integ.sh
```

This:
1. Ensures CDK bootstrap stack exists
2. Deploys the fixture stack (~5-10 min first time)
3. Exports `INTEG_*` environment variables as Cloudformation Outputs

### Run tests

The test runner script supports three invocation modes:

```bash
# Mode 1: Run a specific split by name (reads from splits.yaml)
python3 ./scripts/run-integ-tests.py split_0
python3 ./scripts/run-integ-tests.py split_1
python3 ./scripts/run-integ-tests.py split_2

# Mode 2: Run all tests in package directory (local dev)
python3 ./scripts/run-integ-tests.py packages/constructs/L2/s3-constructs

# Mode 3: Run all tests from all splits
python3 ./scripts/run-integ-tests.py
```

The test runner:
1. Reads split configuration from `splits.yaml` (for split name mode)
2. Validates that all test files exist
3. Checks for duplicate split assignments
4. Synthesizes all tests in parallel (eliminates ts-node overhead)
5. Deploys each test stack (skips fixture stacks)
6. Destroys each test stack
7. Reports pass/fail summary with split membership

### Teardown

```bash
./scripts/bootstrap-integ.sh --teardown
```

Destroys fixture stack, schedules KMS key deletion (7-day wait), and cleans up EC2 key pair and Secrets Manager secret.

## CI/CD

Tests run in GitLab CI on every merge request across three parallel jobs:

| Job | Split | Region | Resource Group |
|-----|-------|--------|----------------|
| `feature_merge_integ_split_0` | split_0 | us-east-2 | integ-us-east-2 |
| `feature_merge_integ_split_1` | split_1 | us-west-1 | integ-us-west-1 |
| `feature_merge_integ_split_2` | split_2 | us-west-2 | integ-us-west-2 |

Each job runs in a different region to enable parallelism without resource conflicts. Resource groups prevent concurrent runs in the same region.

CI jobs invoke the test runner with split names:

```bash
./scripts/run-integ-tests.sh split_0
```

## Writing New Tests

### 1. Create the test file

Create a new file in your construct package's `test/integ/` directory:

```
packages/constructs/L2/<your-package>/test/integ/<name>.integ.ts
```

### 2. Test file template

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MyConstruct } from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getFixtureResources, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegMyConstructStack', { env });

// For tests needing only KMS:
const kmsKey = getFixtureKmsKey(stack);

// For tests needing VPC + KMS:
const fixture = getFixtureResources(stack);
// Use: fixture.kmsKey, fixture.vpc, fixture.privateSubnets, fixture.availabilityZones

const naming = getIntegNaming(app, 'mymod');

// Create your construct...
new MyConstruct(stack, 'MyConstruct', {
  naming,
  encryptionKey: kmsKey,
  // ... other props
});

Aspects.of(stack).add(new ForceDestroy());
app.synth();
```

### 3. Add to splits.yaml

Add your test file to the appropriate split in `integ/constructs/splits.yaml`:

```yaml
splits:
  - name: split_0
    tests:
      # ... existing tests
      # Add your new test (choose the split with shortest total time)
      - packages/constructs/L2/<your-package>/test/integ/<name>.integ.ts
```

When adding new tests, add them to the split with the shortest total time to keep splits balanced. Check CI job durations to identify the lightest split.

### Fixture helpers

| Function | Returns | Use when |
|----------|---------|----------|
| `getFixtureKmsKey(stack)` | `IKey` | Test only needs encryption |
| `getFixtureResources(stack)` | `{ kmsKey, vpc, privateSubnets, availabilityZones }` | Test needs VPC resources |
| `getIntegNaming(app, moduleName)` | `IMdaaResourceNaming` | Always needed for MDAA constructs |
| `getIntegEnv()` | `{ account, region }` | Stack environment |

All helpers are imported from `@aws-mdaa/testing/lib/integ`.

### Key rules

1. **File naming**: Use `<name>.integ.ts` pattern in `test/integ/` directory
2. **Stack naming**: Use `getIntegNaming` helper from '@aws-mdaa/testing/lib/integ'` for consistent namings
3. **ForceDestroy aspect**: Always apply to ensure cleanup works
4. **Use fixture helpers**: Call `getFixtureKmsKey()` or `getFixtureResources()` instead of creating new infrastructure
5. **Keep it fast**: Target < 5 min deploy + destroy cycle

## Design Decisions

### Why co-locate tests with packages?

Tests live next to their construct code (`packages/constructs/L2/<pkg>/test/integ/`) for:
- Easier discovery — find tests alongside the code they validate
- Better maintainability — changes to constructs and tests happen together
- Clearer ownership — package owners own their integration tests

### Why splits.yaml instead of directory-based splits?

A configuration file decouples test discovery from physical file organization:
- Tests can be moved without changing CI configuration
- Split assignments can be rebalanced without moving files
- Glob patterns enable flexible test grouping

### Why environment variables instead of cross-stack references?

Environment variables decouple test stacks from the fixture stack, enabling:
- Tests to live in package directories
- Simpler stack synthesis (no cross-stack dependency resolution)
- Easier local debugging (set env vars manually)

### Why manual splits instead of integ-runner?

CDK's `integ-runner` requires storing full `cdk.out` snapshots in version control. For a monorepo with many constructs, this bloats repository size significantly. Manual splits with parallel CI jobs achieve similar parallelism without the storage overhead.

### Why shared fixture?

Resources like VPCs and KMS keys are slow to create (2-5 min) and have cleanup constraints (KMS 7-day deletion). A shared fixture amortizes this cost across all tests and simplifies cleanup.

### Why different regions per split?

Using separate regions for each CI job enables true parallelism — jobs don't compete for the same fixture stack or hit regional resource limits.
