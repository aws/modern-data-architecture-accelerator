# Construct Overview

The Glue Catalog CDK L3 construct is used to configure an account's Glue Catalog for encryption at rest and cross account access for Data Mesh deployments. It should be deployed only once per AWS account.

***

## Deployed Resources

![GlueCatalog](docs/GlueCatalog.png)

* **Glue Catalog KMS Key** - This key will be used to encrypt the Glue Catalog metadata.

* **Glue Catalog Settings** - These settings will be deployed in order to configure the Glue Catalog to utilize the Catalog KMS Key.
