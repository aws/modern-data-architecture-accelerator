# Construct Overview

The Athena Workgroup CDK L3 construct is used to deploy the resources required to support usage of Athena via a Workgroup and Identity Federation, including an Athena results S3 Bucket and KMS CMK, and a federation role which can be used to federate identities from external identity providers.

***

## Deployed Resources

![AthenaWorkgroup](docs/AthenaWorkgroup.png)

* **Workgroup KMS Key** - This key will be used to encrypt all Workgroup resources which support encryption at rest (including the Workgroup Results S3 Bucket).

* **Workgroup Results S3 Bucket** - This S3 bucket holds the workgroup's Athena query results, and is specified by the Athena Workgroup configuration and/or client connection configurations. This bucket should be accessible only by the Workgroup Federation Roles, and the Data Admin roles.

* **Athena Workgroup** - The Athena Workgroup itself.

* **Workgroup IAM Managed Policies** - Managed policies which will be assigned to configured Athena User Roles.
