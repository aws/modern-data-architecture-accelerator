# MDAA MWAA Constructs

L2 construct for Amazon Managed Workflows for Apache Airflow (MWAA) with compliance defaults.

Wraps `CfnEnvironment` with:
- KMS encryption required
- Private web server access by default
- All Airflow component logging enabled at INFO level minimum
- RETAIN removal policy
- SSM parameter and CloudFormation output publishing

## Log group retention

MWAA creates a service-managed CloudWatch log group per enabled Airflow component,
named `airflow-<environmentName>-<component>`. Those groups are CMK-encrypted by
MWAA using the required `kmsKey` (via the [KMS grants MWAA
attaches](https://docs.aws.amazon.com/mwaa/latest/userguide/custom-keys-certs.html)),
but MWAA provides no way to set their **retention** — `AWS::MWAA::Environment` has
no retention property, and the groups default to never-expire.

Because the group name is derived deterministically from the environment name,
this construct pre-creates each of the five groups as a CloudFormation resource so
retention can be applied from the template: `encryptionKey` set to `kmsKey`,
`RemovalPolicy.RETAIN`, and a retention period from the `logRetention` prop
(default `RetentionDays.TWO_YEARS`). The environment `DependsOn` all five, so they
exist before MWAA initializes. Set `logRetention` to `RetentionDays.INFINITE` to
opt out of expiry (retention Nag rules are suppressed only on that explicit path).
