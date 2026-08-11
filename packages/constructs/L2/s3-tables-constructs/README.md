# @aws-mdaa/s3-tables-constructs

MDAA S3 Tables L2 Constructs - wraps AWS::S3Tables CloudFormation resources with MDAA naming, KMS encryption, and compliance controls.

## Constructs

- **MdaaTableBucket** - S3 Tables table bucket with KMS encryption and maintenance configuration
- **MdaaNamespace** - Namespace within a table bucket for organizing tables
- **MdaaTable** - Apache Iceberg table with schema, partition, and sort order definitions
- **MdaaTableBucketPolicy** - Table bucket resource policy that always injects a mandatory deny-non-TLS statement (deny when `aws:SecureTransport` is false), with any additional statements appended after it
- **MdaaTablePolicy** - Table resource policy that always injects the same mandatory deny-non-TLS statement for an individual table
