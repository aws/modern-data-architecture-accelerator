# Development

## Setting up CAEF Dev Environment

1. Clone this repo.
2. Install NPM/Node
3. NPM Install CDK, Lerna
4. Authenticate to the CAEF NPM Repo
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

The testing approach for CAEF changes varies depending on the type of package being tested (App, Stack, or Construct). Before testing, ensure that
the entire CAEF repo is cloned, bootstrapped, and built using the procedures in [CONTRIBUTING](CONTRIBUTING.md).

### Testing Constructs and Stacks

Constructs and Stacks should be tested via unit testing using the CDK Assertions framework.
This framework can be used to ensure that the CFN resources produced by a CAEF construct or stack are defined
as expected in the resulting CFN template. Specific attention should be paid in these unit tests to any resource
property which has compliance implications.

#### Example Construct/Stack Unit Tests

```typescript
import { CaefTestApp } from "@aws-caef/testing";
import { Stack } from "aws-cdk-lib";
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { Match, Template } from "aws-cdk-lib/assertions";
import { NagSuppressions } from "cdk-nag";
import { CaefBucket, CaefBucketProps } from "../lib";

describe( 'CAEF Construct Compliance Tests', () => {
    const constructTestApp = new CaefTestApp()
    const constructTestStack = new Stack( constructTestApp, "test-stack" )

    const testKey = CaefKmsKey.fromCaefKeyArn( constructTestStack, "test-key", "arn:test-partition:kms:test-region:test-account:key/test-key" )

    const testContstructProps: CaefBucketProps = {
        naming: constructTestApp.naming,
        bucketName: "test-bucket",
        encryptionKey: testKey
    }

    const testConstruct = new CaefBucket( constructTestStack, "test-construct", testContstructProps )
    NagSuppressions.addResourceSuppressions(
        testConstruct,
        [
            { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF Data Lake does not use bucket replication.' },
            { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF Data Lake does not use bucket replication.' }
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

### Testing Apps

CAEF Apps can be developed and tested like any other CDK app. This typically involves a 'cdk list/synth/diff/deploy'
from within the App source directory, while also providing the necessary context values which would otherwise be provided by the CAEF framework.
Executing the cdk command will result in the application source code being built. However, any changes made in underlying dependencies (such as stacks and constructs)
would require either a 'lerna run build' at the root of the CAEF repo, or 'npm run build' in the package folder for each of the modified dependencies.

#### Example CDK Command Invoking a CAEF App

```bash
cdk synth --require-approval never -c org="<org>" -c env="<env>" -c domain="<domain>" -c app_configs="<path/to/config/file>" -c tag_configs="<path/to/tag_config/file>"  -c module_name="<module_name>" --all
```
