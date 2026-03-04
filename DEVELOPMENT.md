# Development

## Setting up MDAA Dev Environment

1. Clone this repo.
2. Install NPM/Node
3. NPM Install CDK, Lerna
4. Authenticate to the MDAA NPM Repo
5. From the root of the repo, run npm install:

    ```bash
    npm install
    ```

6. After making code changes, run a build/test using lerna:

    ```bash
    lerna run build && lerna run test
    ```

    Alternatively, you can run 'npm run build && npm run test' in each individual package you have modified.

## Testing

### Testing Overview

MDAA supports both **TypeScript/CDK testing** and **Python testing** for comprehensive code coverage. The testing approach varies depending on the type of package being tested (App, Stack, Construct, or Python Lambda/Glue code). Before testing, ensure that the entire MDAA repo is cloned, bootstrapped, and built using the procedures in [CONTRIBUTING](CONTRIBUTING.md).

### Quick Test Commands

```bash
# Run all tests (TypeScript + Python)
npm run test:python:all        # All Python tests
lerna run test --stream        # All TypeScript tests
./scripts/test.sh             # Both TypeScript and Python tests

# Run tests during development
lerna run build && lerna run test    # TypeScript build + test
npm run test:python:all              # Python tests only
```

### Testing Constructs and Stacks

Constructs and Stacks should be tested via unit testing using the CDK Assertions framework.
This framework can be used to ensure that the CFN resources produced by a MDAA construct or stack are defined
as expected in the resulting CFN template. Specific attention should be paid in these unit tests to any resource
property which has compliance implications.

#### Example Construct/Stack Unit Tests

```typescript
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Stack } from "aws-cdk-lib";
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Match, Template } from "aws-cdk-lib/assertions";
import { NagSuppressions } from "cdk-nag";
import { MdaaBucket, MdaaBucketProps } from "../lib";

describe( 'MDAA Construct Compliance Tests', () => {
    const constructTestApp = new MdaaTestApp()
    const constructTestStack = new Stack( constructTestApp, "test-stack" )

    const testKey = MdaaKmsKey.fromMdaaKeyArn( constructTestStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: MdaaBucketProps = {
        naming: constructTestApp.naming,
        bucketName: "test-bucket",
        encryptionKey: testKey
    }

    const testConstruct = new MdaaBucket( constructTestStack, "test-construct", testContstructProps )
    NagSuppressions.addResourceSuppressions(
        testConstruct,
        [
            { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' },
            { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA Data Lake does not use bucket replication.' }
        ],
        true
    );
    constructTestApp.checkCdkNagCompliance( constructTestStack )
    const template = Template.fromStack( constructTestStack );

    test( 'BucketName', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "BucketName": constructTestApp.naming.resourceName( "test-bucket" )
        } )
    } )

    test( 'DefaultEncryption', () => {
        template.hasResourceProperties( "AWS::S3::Bucket", {
            "BucketEncryption": {
                "ServerSideEncryptionConfiguration": [
                    {
                        "BucketKeyEnabled": true,
                        "ServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "aws:kms",
                            "KMSMasterKeyID": testKey.keyArn
                        }
                    }
                ]
            }
        } )
    } )
    
} )
```

### Integration Testing (L2 Constructs)

Some lightweight MDAA L2 constructs have integration tests that deploy real AWS resources, validate behavior, and tear down. Tests are co-located with their packages in `test/integ/` directories. For full documentation on writing and running integration tests, see [integ/constructs/README.md](integ/constructs/README.md).

#### Prerequisites

- AWS credentials configured
- `AWS_REGION` or `AWS_DEFAULT_REGION` set

#### Quick Start

```bash
# Bootstrap shared resources
./scripts/bootstrap-integ.sh

# Run all tests in a package directory
python3 ./scripts/run-integ-tests.py packages/constructs/L2/s3-constructs

# Or run all integration tests (might be slow, use directory mode)
python3 ./scripts/run-integ-tests.py

# Teardown when you're finished
./scripts/bootstrap-integ.sh --teardown
```

### Testing Python Code

MDAA includes comprehensive Python testing for Lambda functions, Glue jobs, and other Python components using modern tooling.

#### Python Test Structure

Python tests are located in `python-tests/` directories alongside the Python source code:

```
package-name/
├── python-tests/              # Python testing directory
│   ├── pyproject.toml        # Modern Python project config
│   ├── pytest.ini           # pytest configuration
│   ├── conftest.py          # Shared test fixtures
│   ├── .venv/              # Virtual environment (auto-managed)
│   └── test_*.py           # Test files
├── src/ or lib/             # Python source code being tested
└── package.json             # npm scripts for testing (optional)
```

#### Running Python Tests

**Prerequisites: Install uv**
```bash
# Install uv (required for Python testing)
curl -LsSf https://astral.sh/uv/install.sh | sh
# or: brew install uv
# or: pip install uv
```

**Option 1: Direct uv commands (Recommended)**
```bash
# Navigate to any python-tests directory
cd path/to/package/python-tests

# Run tests (uv handles everything automatically)
uv run pytest                    # Run all tests
uv run pytest --cov            # Run with coverage
uv run pytest -v               # Verbose output
uv run pytest test_specific.py # Run specific test file
```

**Option 2: npm scripts**
```bash
# From package root
npm run test:python             # Run Python tests for this package
npm run test:python:coverage    # Run with coverage report

# From repository root
npm run test:python:all         # Run ALL Python tests (recommended for CI/CD)
npm run test:python            # Run workspace Python tests only
```

#### Discovering Python Tests

To see all packages with Python tests:
```bash
# Find all python-tests directories
find packages sample_configs -name "python-tests" -type d

# Count total test packages
find packages sample_configs -name "python-tests" -type d | wc -l
```

#### Adding Python Tests to New Packages

1. **Copy structure** from existing package:
   ```bash
   # Find an existing python-tests directory
   find packages sample_configs -name "python-tests" -type d | head -1
   
   # Copy the structure
   cp -r path/to/existing/python-tests your-package/
   ```

2. **Update `pyproject.toml`** with your dependencies:
   ```toml
   [project]
   name = "your-package-tests"
   dependencies = [
       "pytest>=7.4.0",
       "pytest-cov>=4.1.0",
       "boto3>=1.28.0",
       # Add your specific dependencies
   ]
   ```

3. **Update `conftest.py`** to point to your source code:
   ```python
   # Add the source directory to Python path
   src_path = os.path.join(os.path.dirname(__file__), '../src')
   sys.path.insert(0, src_path)
   ```

4. **Create test files** following `test_*.py` naming convention

5. **Run tests**: `uv run pytest` in the python-tests directory

For detailed Python testing documentation, see [PYTHON_TESTING.md](PYTHON_TESTING.md).

### Testing Apps

MDAA Apps can be developed and tested like any other CDK app. This typically involves a 'cdk list/synth/diff/deploy'
from within the App source directory, while also providing the necessary context values which would otherwise be provided by the MDAA framework.
Executing the cdk command will result in the application source code being built. However, any changes made in underlying dependencies (such as stacks and constructs)
would require either a 'lerna run build' at the root of the MDAA repo, or 'npm run build' in the package folder for each of the modified dependencies.

#### Example CDK Command Invoking a MDAA App

```bash
cdk synth --require-approval never -c org="<org>" -c env="<env>" -c domain="<domain>" -c module_configs="<path/to/config/file>" -c tag_configs="<path/to/tag_config/file>"  -c module_name="<module_name>" --all
```
