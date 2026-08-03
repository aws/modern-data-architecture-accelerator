# Construct Overview

Opinionated implementation of the Layer 2 CDK Construct for EventBridge.

## Security/Compliance

### EventBridge Event Bus

- Enforce Event Bus Name

### EventBridge Rule

- Enforce Rule Name
- Publish Rule Name/ARN to SSM Parameter Store for cross-module reference

Note an EventBridge rule holds no data at rest, so there is no encryption surface to enforce on the rule itself. Compliance for what a rule _targets_ (for example an encrypted SNS topic) belongs to those resources.

### CloudTrail Alert Rules

- `createCloudTrailAlertRules` (`lib/cloudtrail-alert-rules`) builds `MdaaRule`s that alert on a
  resource's CloudTrail events, notifying an SNS topic and optionally a customer-supplied
  remediation Lambda. Service-agnostic: the caller supplies the CloudTrail sources, the resource
  identity fields, and the per-rule `errorCodes`/`eventNames`.
- Rejects at synth the misconfigurations that would otherwise deploy cleanly and never fire: a rule
  with neither `errorCodes` nor `eventNames` (which would match every API call), missing CloudTrail
  sources, and scoping that names no resource identity at all (which would match every resource of
  that service in the account).
- Scopes each rule to the resource by OR-ing every identity form the service may record -
  `detail.requestParameters.<field>` and `detail.resources[].ARN` - because the field carrying a
  resource's identity differs per API, and some APIs carry no `requestParameters` at all.
- Publishes via a **per-rule delivery role** (`authorizeUsingRole`), not a service-principal grant on
  the topic and key policies. The role's identity policy grants `sns:Publish` on that topic and
  `kms:Decrypt`/`GenerateDataKey*` on its key, and nothing else - so no statement authorizing every
  EventBridge rule in the account is emitted. CDK's default cannot be narrowed after the fact
  (`grantPublish` deduplicates), and a KMS _resource_ policy cannot carry `aws:SourceArn` for this
  path at all, so an identity policy is the only scoped option. It also makes imported topics work,
  which a resource-policy grant could not. Tests pin that neither policy gains an
  `events.amazonaws.com` statement.
- The delivery role's policy is inline and includes the `kms:GenerateDataKey*` action family, so it
  carries `IAMNoInlinePolicy` and `AwsSolutions-IAM5` nag suppressions - same reasoning as the
  EventBridge target role in `dataops-stepfunction`.

Requires a CloudTrail trail in the account/region logging the matched events. Management events are
logged by default on any trail; data events are off by default and must be enabled explicitly.
Without a trail covering the matched events, a rule never fires.
