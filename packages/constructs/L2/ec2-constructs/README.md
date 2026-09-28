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

### Network Interfaces
* Enforce Network Interface Name
* Enforce retention of the interface on stack deletion and on a replacing update, so its private IP and MAC outlive the stack that declared it. A rolled-back create is excluded, so a failed first deploy does not leave an interface holding a pinned private IP
* Publishes the interface id and primary private IP as SSM parameters and CloudFormation exports
* Require at least one security group. EC2 places an interface created with no group in the permissive VPC default security group, and makes that association itself, so it appears in neither the template nor CDK Nag — an empty group set is rejected at synth instead