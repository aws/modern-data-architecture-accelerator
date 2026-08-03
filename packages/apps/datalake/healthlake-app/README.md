# HealthLake

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/datalake/healthlake-app/index.html).

Deploys one or more Amazon HealthLake FHIR R4 datastores with customer-managed KMS encryption, per-datastore least-privilege IAM data-access roles for import/export operations, and automatic Glue database metadata resolution. Datastores are configured via a named `datastores` map — each entry becomes a distinct datastore, all sharing a single KMS key. Use this module when you need one or more compliant, production-ready HealthLake datastores for healthcare data interoperability.

---

## Deployed Resources

Per entry in the `datastores` map:

**HealthLake FHIR R4 Datastore** - A fully managed FHIR R4-compliant datastore encrypted with the (shared) customer-managed KMS key for storing and querying healthcare data.

**Datastore Replacement Guard** - A Custom Resource (Lambda-backed) that blocks CloudFormation updates which would replace (delete and recreate) the datastore — see [Datastore Replacement Protection](#datastore-replacement-protection).

**IAM Data-Access Role** - A least-privilege IAM role assumed by the HealthLake service for S3 read/write and KMS encrypt/decrypt operations during import and export jobs.

**Glue Database Resolver** - A construct that derives the auto-created Glue database metadata (name and catalog ID) after datastore creation.

**SSM Parameters** - Nine SSM parameters per datastore: datastore ID, ARN, and endpoint; the data-access role's ARN, ID, and name (plus a `healthlake`-namespaced role-ARN alias); and the Glue database name and catalog ID — all for cross-module consumption.

Shared across all datastores in the stack:

**KMS Key** - A single customer-managed KMS key is used to encrypt every datastore. Provide `kmsKeyArn` at the module root to reuse an existing key, or omit it to have the module create one.

---

## Security/Compliance Details

This module enforces compliance by default with no opt-out for critical security controls:

- **Encryption at Rest** - Customer-managed KMS key (CMK) encryption is mandatory; no unencrypted datastores can be deployed
- **Least Privilege** - IAM policies are scoped to specific ARNs only; no wildcard resources (`*`) are used anywhere
- **KMS Grant Control** - `kms:CreateGrant` is restricted with the `GrantIsForAWSResource` condition
- **Service Trust** - Only `healthlake.amazonaws.com` is permitted in the role trust policy
- **CDK Nag Validation** - All resources pass AwsSolutions, NIST 800-53, HIPAA, and PCI DSS rulesets

### Datastore Replacement Protection

`AWS::HealthLake::FHIRDatastore` replaces (deletes and recreates) the underlying datastore whenever `DatastoreName`, `DatastoreTypeVersion`, `IdentityProviderConfiguration`, `PreloadDataConfig`, or `SseConfiguration` changes — this is documented AWS CloudFormation behavior, not an MDAA limitation. In practice this means renaming a datastore entry (its `datastores` map key), changing `kmsKeyArn`, toggling `identityProviderConfiguration`, or toggling `preloadSynthea` on an existing datastore would trigger a replacement.

**This module blocks that from happening by default.** Each datastore is guarded by a Custom Resource that compares the previous and current values of `datastoreName`, `kmsKeyArn`, `identityProviderConfiguration`, and `preloadSynthea` on every deploy. If any of these changed, the deployment fails *before* the datastore is touched — no replacement occurs, no data is at risk. `RemovalPolicy.RETAIN` is also applied to every `FHIRDatastore` as defense-in-depth: if a replacement is explicitly acknowledged (see below), the old datastore is detached rather than deleted, surviving as an orphaned AWS resource whose data you must migrate manually.

If you intend to make one of these changes on purpose (e.g. provisioning a genuinely new datastore under an existing name), set `acknowledgeReplacement: true` on that datastore's configuration for the deploy that makes the change:

```yaml
datastores:
  primary:
    rawBucketArn: arn:{{partition}}:s3:::example-raw-bucket
    preloadSynthea: true
    acknowledgeReplacement: true  # required to allow this change through
```

Remove `acknowledgeReplacement` (or set it back to `false`) after the acknowledged deploy completes, so the guard resumes blocking unintentional changes.

---

## Configuration

### MDAA Config

```yaml
# mdaa.yaml
healthlake:
  module: "@aws-mdaa/healthlake"
  config: healthlake-config.yaml
```

### Module Config Samples and Variants

#### Minimal Configuration

Deploys a HealthLake FHIR R4 datastore with only the required S3 bucket ARN. A customer-managed KMS key is created automatically when not explicitly provided. Use this when you need a basic datastore without sample data or SMART on FHIR authorization.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
--8<-- "target/docs/packages/apps/datalake/healthlake-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Covers all available configuration options including explicit KMS key, Synthea sample data preloading, and SMART on FHIR identity provider configuration. Use this as a reference for the full set of configurable properties.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
--8<-- "target/docs/packages/apps/datalake/healthlake-app/sample_configs/sample-config-comprehensive.yaml"
```

#### SMART on FHIR Configuration

Deploys a HealthLake FHIR R4 datastore with SMART on FHIR authorization enabled, requiring an OAuth2 token-decoding Lambda ARN. Use this when integrating with a SMART App Launch identity provider for clinical applications or third-party EHR clients.

[sample-config-smart.yaml](sample_configs/sample-config-smart.yaml)

```yaml
--8<-- "target/docs/packages/apps/datalake/healthlake-app/sample_configs/sample-config-smart.yaml"
```
