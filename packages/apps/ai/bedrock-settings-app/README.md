# Bedrock Settings

The Bedrock Settings CDK application is used to configure and deploy Amazon Bedrock model invocation audit logging to S3 and/or CloudWatch, providing comprehensive monitoring and compliance capabilities for Bedrock model usage.

***

## Deployed Resources and Compliance Details

![bedrock-settings](../../../constructs/L3/ai/bedrock-settings-l3-construct/docs/bedrock-settings.png)

* **KMS Encryption Key**: Custom KMS key created to encrypt all Bedrock audit logs, ensuring data security and compliance with encryption requirements
* **S3 Bucket** (Optional): Secure S3 bucket for storing Bedrock model invocation audit logs with server-side encryption using the custom KMS key
* **CloudWatch Log Group** (Optional): CloudWatch Log Group for real-time monitoring of Bedrock model invocations with configurable retention policies
* **IAM Service Role**: Dedicated service role for Bedrock logging with least-privilege permissions to access logging destinations
* **IAM Managed Policy**: Custom policy granting necessary permissions for Bedrock to write audit logs to the configured destinations
* **Custom Resource Lambda**: Lambda function that configures Bedrock's global model invocation logging settings through AWS APIs
* **Bucket Policy**: Resource-based policy allowing Bedrock service to write audit logs to the S3 bucket
* **KMS Key Policy**: Comprehensive key policy allowing Bedrock, CloudWatch Logs, and S3 services to use the encryption key

**Compliance Features:**
* End-to-end encryption of audit logs using customer-managed KMS keys
* Configurable log retention policies for compliance requirements
* Cross-service IAM policies following least-privilege principles
* Support for both real-time (CloudWatch) and long-term (S3) audit log storage
* Proper service principal restrictions and condition-based access controls

***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          bedrock-settings: # Module Name can be customized
            module_path: "@aws-mdaa/bedrock-settings" # Must match module NPM package name
            module_configs:
              - ./bedrock-settings.yaml # Filename/path can be customized
```

### Module Config (./bedrock-settings.yaml)

[Config Schema Docs](SCHEMA.md)

```yaml
# Controls whether or not Bedrock logs model invocation activity

# Enabling this will result in a new S3 bucket being created
# specifically for model invocation audit logs.
# S3 provides long-term storage and is ideal for compliance and archival purposes.
enableAuditLoggingToS3: true

# Enabling this will result in a new CloudWatch Log Group being created
# specifically for model invocation audit logs.
# CloudWatch provides real-time monitoring capabilities and integration with other AWS services.
enableAuditLoggingToCloudwatch: true
```

**Configuration Requirements:**
* At least one of `enableAuditLoggingToS3` or `enableAuditLoggingToCloudwatch` must be set to `true`
* Both options can be enabled simultaneously for comprehensive logging coverage

**Resource Naming:**
* S3 Bucket: `logs-model-invocation-{account}-{region}`
* CloudWatch Log Group: `/aws/bedrock/model-invocation-logs/bedrock-model-invocation-{region}`
* KMS Key Alias: `bedrock-kms-key-{region}`

**Log Structure:**
* S3 logs are stored with prefix: `bedrock-model-invocation-logs/bedrock-model-invocation-{region}`
* CloudWatch logs include large data delivery to S3 for oversized log entries
* All logs are encrypted at rest using the dedicated KMS key

**Security Considerations:**
* The KMS key policy restricts access to the account root, Bedrock service, and logging services
* S3 bucket policy uses condition-based access controls with source account and ARN restrictions
* IAM service role follows least-privilege principles with resource-specific permissions
* All cross-service access uses proper service principals and condition keys

**Monitoring and Observability:**
* CloudWatch logs enable real-time monitoring and alerting on Bedrock usage
* S3 storage provides long-term audit trails for compliance and analysis
* Large log entries are automatically delivered to S3 even when using CloudWatch as primary destination
* Logs capture comprehensive model invocation metadata including timestamps, model details, and usage patterns
