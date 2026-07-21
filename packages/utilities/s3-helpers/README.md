# S3 Helpers

Shared S3 helper utilities for MDAA constructs. Consolidates lifecycle, bucket
policy, inventory, and audit helpers into a single jsii-compatible package.

## Lifecycle Helper

Translates config-friendly S3 lifecycle rule definitions (string storage classes
and day counts) into CDK `LifecycleRule` objects. Provides a single canonical
config shape shared across MDAA L3 constructs.

## Bucket Policy Helper

Generates S3 bucket policy statements for prefix-level and bucket-level access
control. Supports federated (role ID) and non-federated (principal ARN) access
patterns with read, read-write, and read-write-super permission tiers.

## Inventory Helper

Creates S3 inventory configurations and associated Glue tables for querying
inventory data via Athena. Supports cross-account inventory destinations.

## Audit Helper

Creates CloudTrail trails for S3 data events and Glue tables for querying
CloudTrail audit logs via Athena. Supports both all-bucket and selective
event selector configurations.
