# Construct Overview

The Roles CDK L3 construct is used to deploy IAM roles which can be used within a broader data environment.

## Deployed Resources

![Roles](docs/Roles.png)

* **IAM Managed Policies** 
    * An IAM 'Customer' Managed Policy will be created for each policy specified in the config.
    * MDAA Managed Policies will be created, which can be attached to the IAM Roles specified in the config.
* **IAM Roles** - An IAM role will be created for each role specified in the config.
