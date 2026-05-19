# Construct Overview
SageMaker Project L3 CDK Construct is used to configure and deploy SageMaker Project Domains.

***

## Deployed Resources

![sagemaker-project](docs/DataZone.png)

* **SageMaker Project Domain** - A SageMaker Project Domain

* **KMS CMK** - A KMS CMK specific to each domain created

* **Domain Execution Role** - An IAM Role used by DataZone. This role is specific to the domain.

* **Domain Provisioning Role** - An IAM Role specific to the domain deployed only when at least one blueprint is enabled. This role is used and shared among all the enabled blueprints. 

* **Data Lake Blueprint** - Data Lake Blueprint (id: DefaultDataLake) specific to each domain.

* **Data Lake Manage Access Role** - An IAM Role used by the Data Lake Blueprint, specific to each domain.

* **Data Warehouse Blueprint** - Data Warehouse Blueprint (id: DefaultDataWarehouse) specific to each domain.

* **Data Warehouse Manage Access Role** - An IAM Role used by the Data Warehouse blueprint, specific to each domain.

## DataZone Personas
![datazone-personas](docs/DataZone-Personas.png)