# Construct Overview

The EC2 Instance CDK L3 construct is used to configure and deploy a secure EC2 Instance and associated resources.

***

## Deployed Resources

![ec2](docs/ec2.png)

* **EC2 Instance** - A secure EC2 Instance.

* **Security Group** - Will be used by EC2 Instance.

* **KMS CMK** - Created if not keyARN is provided, The KMS CMK which will be used to encrypt the root volume.
