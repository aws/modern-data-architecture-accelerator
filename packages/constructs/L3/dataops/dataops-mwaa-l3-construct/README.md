# MDAA DataOps MWAA L3 Construct

Deploys compliant Amazon MWAA environments with KMS encryption, VPC isolation,
per-environment IAM access policies, an S3 DAGs bucket (project or dedicated)
with a default DAG deployed to the `deployment/airflow/<env-name>/dags/` prefix,
and per-environment CloudWatch log groups with default retention. Each
environment publishes its ARN and web server URL as SSM parameters for
cross-module references.

Supports DataOps project integration for shared KMS key auto-wiring, or
standalone mode with explicit KMS/S3/VPC configuration.
