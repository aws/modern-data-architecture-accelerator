# Construct Overview

Opinionated L2 Constructs for S3 Buckets.

## Security/Compliance

### S3 Bucket
* Enforce Bucket Name
* Enforce KMS CMK encryption at rest
* Enforce KMS bucket key
* Enforce auto-delete objects false
* Enforce retain on stack deletion
* Enforce SSL/TLS
* Enforce block public access
* Enforce versioning

**Note** MDAA Does not enforce S3 server logging on buckets, as they require a non-KMS CMK encrypted target. Instead, it is recommended to enable S3 Data Events within CloudTrail