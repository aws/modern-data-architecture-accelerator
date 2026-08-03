# @aws-mdaa/healthlake-l3-construct

MDAA HealthLake L3 Construct that composes L2 constructs into a single deployable unit for provisioning a HealthLake FHIR R4 datastore with CMK encryption, a least-privilege data-access IAM role, and automatic Glue database metadata resolution.

## Deployed Resources

**HealthLake FHIR R4 Datastore** - A FHIR R4-compliant datastore encrypted with a customer-managed KMS key. Optionally preloads Synthea sample data for development/test environments.

**IAM Data Access Role** - A least-privilege IAM role trusted by `healthlake.amazonaws.com` for S3 read/write and KMS encrypt/decrypt operations during import/export jobs.

**Glue Database Resolver** - Derives the auto-created Glue database metadata (name and catalog ID) statically after datastore creation, and publishes it to SSM for cross-module consumption.

## Usage

```typescript
import { HealthLakeL3Construct } from '@aws-mdaa/healthlake-l3-construct';

new HealthLakeL3Construct(stack, 'HealthLake', {
  naming: mdaaNaming,
  roleHelper: roleHelper,
  kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/example-key-id', // optional; shared across datastores. auto-created if omitted
  datastores: {
    // Each map key is the datastore name suffix.
    primary: {
      rawBucketArn: 'arn:aws:s3:::my-raw-bucket',
      preloadSynthea: false, // optional, default false
      identityProviderConfiguration: { // optional, defaults to AWS_AUTH
        authorizationStrategy: 'SMART_ON_FHIR',
        fineGrainedAuthorizationEnabled: true,
        idpLambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:smart-decoder',
      },
    },
    // Additional datastores can be defined here — they share the same kmsKeyArn.
  },
});
```
