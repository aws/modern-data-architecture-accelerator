# Construct Overview

This Data Lake CDK L3 construct is used to configure deploy the resources required to define a secure S3-based Data Lake on AWS.

***

## Deployed Resources

![DataLake](docs/DataLake.png)

* **Data Lake KMS Key** - This key will be used to encrypt all Data Lake resources which support encryption at rest (including the Data Lake S3 Buckets).

* **Data Lake S3 Buckets** - These buckets will be deployed to form the persistence basis of the Data Lake. Each bucket's bucket policy will be generated according to the following:
  * The Access Policies specified in the config
  * Enforcing the use of the generated KMS key and SSE-KMS encryption
  * Enforcing the use of encryption in transit (HTTPS)
  