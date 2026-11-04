# Construct Overview

Opinionated implementation of the Layer 2 CDK Construct for CloudWatch.

## Security/Compliance

### CloudWatch LogGroups
* Enforce LogGroup Name. `verbatimLogGroupName` keeps the supplied name under the path prefix
  unchanged, for groups whose name is owned by the service writing to them (such as a Lambda
  function's `/aws/lambda/<function name>`).
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
  pattern, guarding against the confused-deputy problem. It reports whether the key's
  policy was updated, which it cannot be for an imported key.
* Metrics Insights alarms: a `MdaaAlarm` metric query whose expression is a Metrics
  Insights query (starting with `SELECT`) requires a period, which must be a multiple of
  60 seconds, and period x evaluation periods must not exceed 3 hours, the window
  CloudWatch evaluates these alarms over.
* `validateMetricsInsightsAlarmWindow`, `validateAlarmEvaluationRange`,
  `validateEvaluationPeriods`, and `validateDatapointsToAlarm` (`lib/alarm-utils`) reject
  at synth the alarm timing that `PutMetricAlarm` would reject at deploy, naming the
  caller's config keys.
* `validateAlarmNotificationTarget`, `resolveAlarmNotificationTopic`, and
  `addAlarmNotificationWarnings` (`lib/alarm-notification`) resolve a module's alarm
  notification target: an existing SNS topic, or a created CMK-encrypted topic with email
  subscriptions and the CloudWatch grants. Creating a topic on an imported key is
  rejected, because CloudWatch could not use the key.
  `validateAlarmNameMatchesPattern` (`lib/alarm-topic-utils`) checks that an alarm name
  falls inside the pattern those grants are scoped to.
