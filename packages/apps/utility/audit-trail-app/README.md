# Module Overview

This Audit Trail CDK application is used to configure deploy the resources required to define a secure S3-based Audit Trail on AWS.

***

## Deployed Resources and Compliance Details

![AuditTrail](../../../constructs/L3/utility/audit-trail-l3-construct/docs/AuditTrail.png)

**CloudTrail Audit Trail** - CloudTrail containing S3 Data Events will be configured to write to an audit bucket

## Configuration

```yaml
trail:
  # The name of the bucket to which audit events will be written
  cloudTrailAuditBucketName: ssm:/sample-org/shared/audit/bucket/name
  # The Arn of the KMS CMK which will be used to encrypt audit logs
  cloudTrailAuditKmsKeyArn: ssm:/sample-org/shared/audit/kms/cmk/arn
  # Optionally include control plane events in trail
  includeManagementEvents: true
```
