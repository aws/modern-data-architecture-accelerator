# Construct Overview

Opinionated implementation of the Layer 2 CDK Construct for SNS Topic.

The following opinions are enforced in the construct:

- Require the use of a Customer Managed KMS encryption key.
- Deny non-TLS connections to the bucket.

The construct can be used in the same way as the documented here.
[https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sns.Topic.html)

## Constructor

The constructor requires the following mandatory paramters:

- `topicName: string` - Topic name.  
- `masterKey: IKey` - A KMS Key.  
