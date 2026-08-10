# Construct Overview

This Audit Trail CDK L3 construct is used to configure and deploy the resources required to define a secure S3-based Audit Trail on AWS.

***

## Deployed Resources

![AuditTrail](docs/AuditTrail.png)

* **CloudTrail Audit Trail** - CloudTrail containing Data Events will be configured to write to an audit bucket. S3 data events are scoped with `eventSelectors` (basic event selectors); data events for any other supported resource type, such as Bedrock AgentCore runtimes or Lambda functions, are scoped with `dataEventSelectors` (advanced event selectors). CloudTrail accepts only one of the two styles per trail.
