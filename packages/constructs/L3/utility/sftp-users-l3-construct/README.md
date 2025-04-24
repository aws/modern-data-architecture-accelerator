# Construct Overview

The SFTP Users CDK L3 construct is used to deploy the resources required to provision SFTP user credentials for a deployed SFTP Transfer Family Server.

***

## Deployed Resources

![SFTPUser](docs/SFTPUser.png)

* **SFTP User** - For each configured User, and SFTP Transfer Family User will be created with the specified SSH Public key credentials.

* **SFTP User IAM Role** - If an existing IAM role is not specified for a User in the config, a minimally-permissive IAM role will be automatically created and assigned to the user.
