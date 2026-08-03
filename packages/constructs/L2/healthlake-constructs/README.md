# Construct Overview

Opinionated implementation of Layer 2 CDK Constructs for AWS HealthLake FHIR R4 datastores.

## Security/Compliance

### HealthLake FHIR R4 Datastore
* Enforce customer-managed KMS key encryption (CMK)
* Enforce MDAA naming conventions
* Publish datastore outputs to SSM Parameter Store

### HealthLake Data Access Role
* Trust policy restricted to `healthlake.amazonaws.com` only
* S3 permissions scoped to specific bucket ARNs with object-level path scoping
* KMS permissions scoped to specific key ARN
* `kms:CreateGrant` requires `GrantIsForAWSResource` condition

### HealthLake Glue Database
* Glue database name and catalog ID derived statically at synth time — no custom resource, Lambda, or runtime IAM required
* Publishes database metadata to SSM Parameter Store
