# Construct Overview

Opinionated implementation of the Layer 2 CDK Construct for CloudWatch.

## Security/Compliance

### CloudWatch LogGroups
* Enforce LogGroup Name
* Enforces KMS CMK Encryption of LogGroup
* Enforces specification of LogGroup Retention
* Enforces LogGroup retention on stack deletion

### CloudWatch Alarms
* Validates the alarm period against the values CloudWatch accepts (1, 5, 10, 30, or a
  multiple of 60 seconds), for both single-metric and metric-math alarms. Metric-math
  periods are otherwise passed through to CloudFormation unvalidated and fail at deploy
  rather than at synth.
* `grantCloudWatchAlarmsTopicAccess` (`lib/alarm-topic-utils`) grants the CloudWatch
  alarm service principal `sns:Publish` on an alarm notification topic and, for a
  CMK-encrypted topic, `kms:Decrypt` + `kms:GenerateDataKey*` on the key. Both grants
  carry `aws:SourceAccount` and `aws:SourceArn` conditions scoped to an alarm name
  pattern, guarding against the confused-deputy problem.