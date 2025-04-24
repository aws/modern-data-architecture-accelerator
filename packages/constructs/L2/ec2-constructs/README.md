# Construct Overview

Opinionated implementation of the Layer 2 CDK Constructs for EC2.

## Security/Compliance

### Ec2 Instances
* Enforce Instance Name
* Require the use of a Customer Managed KMS encryption key on all block devices
* Enforce termination protection
* Enforce retention of block devices on instance termination
* Enforce use of IMDSv2
* Enforce detailed monitoring

### SSH KeyPairs
* Enforce KeyPair Name
* Enforces storage of private key in Secrets Manager with access limited to specified principals