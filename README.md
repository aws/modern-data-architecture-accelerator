# Modern Data Architecture Accelerator (MDAA)

## MDAA Overview

The Modern Data Architecture Accelerator (MDAA) is designed to accelerate the implementation of a secure, compliant and fully capable Modern Data Architecture on AWS, allowing organizations of all sizes and sophsitication to quickly focus on driving business outcomes from their data while maintaining high assurance of security compliance. Specifically, organizations are enabled to rapidly solve data-driven problems using both traditional analytics, as well as using contemporary capabilities such as generative AI.

MDAA provides rapid deployment of all major elements of a Modern Data Architcture, such as Ingest, Persistence, Governance, DataOps, Consumption, Visual Analytics, Data Science, and AI/ML.
Additionally, MDAA has been designed to enable compliance with AWS Solutions, NIST 800-53 Rev5 (US), HIPAA, PCI-DSS CDK Nag Rulesets, as well as ITSG-33 (Canada) security control requirements. Terraform modules are compliant with standard Checkov security policies. This combination of integral compliance and broad, configuration-driven capability allows for rapid design and deployment of simple to complex data analytics environments--including Lake House and Data Mesh architectures--while minimizing security compliance risks.

## Target Usage

* Any organization looking to rapidly deploy a secure Modern Data Architecture in support of data-driven business/mission requirements, such as Analytics, Business Intelligence, AI/ML, and Generative AI
* Large organizations looking to design and deploy complex Modern Data Architectures such as Lake House or Data Mesh.
* Small to Medium organizations looking for code-free, configuration-driven deployment of a Data Analytics platform.
* Builder organizations who are building custom, code-driven data analytics architectures through use of reusable compliant constructs across multiple languages.
* Any organization with elevated compliance/regulatory requirements.

***

## Getting Started

Getting started with MDAA requires the following steps:

1. [Architecture and Design](ARCHITECTURES.md) - A physical platform architecture should be defined either from scratch, or derived from an AWS/MDAA reference design.
2. [Configuration](CONFIGURATION.md) - One or more MDAA configuration files are authored, along with individual configuration files for each MDAA module.
3. [(Optional) Customization](CUSTOMIZATION.md) - Optionally, resources and stacks can be customized through code-based escape hatches before deployment.
4. [Predeployment Preparation](PREDEPLOYMENT.md) - In this step, the MDAA NPM packages are built and published to a private NPM repo.
5. [Deployment](DEPLOYMENT.md) - Each MDAA configuration file is either manually or automatically deployed (via CD/CD).

### Sample Architectures

Alternatively, you can jump directly into a set of sample architectures and configurations. Note that these sample configurations can be used as a starting point for much more sophisticated architectures.

* [Basic DataLake with Glue](sample_configs/basic_datalake/README.md) - A basic S3 Data Lake with Glue database and crawler
* [Basic Terraform DataLake](sample_configs/basic_terraform_datalake/README.md) - A basic S3 Data Lake built with the MDAA Terraform module
* [Fine-grained Access Control DataLake](sample_configs/lakeformation_datalake/README.md) - An S3 Data Lake with fine-grained access control using LakeFormation
* [Data Warehouse](sample_configs/basic_datawarehouse/README.md) - A standalone Redshift Data Warehouse
* [Lakehouse](sample_configs/lakehouse/README.md) - A full LakeHouse implementation, with Data Lake, Data Ops Layers (using NYC taxi data), and a Redshift data warehouse
* [Data Science Platform](sample_configs/basic_datascience_platform/README.md) - A standalone SageMaker Studio Data Science Platform
* [GenAI Platform](sample_configs/basic_gaia/README.md) - A standalone GAIA GenAI Platform

### Sample DataOps Blueprints

Additionally, once your Modern Data Architecture is deployed, you can use these sample Data Operations blueprints, including MDAA configs and DataOps code, to start solving your data-driven problems.

* [Basic Crawler](sample_blueprints/basic_dataops_crawler/README.md) - A basic crawler blueprint
* [Event-Driven CSV to Parquet Lambda](sample_blueprints/lambda_csv_parquet/README.md) - A blueprint for transforming small-medium CSV files into Parquet as they are uploaded into a datalake.
* [Schedule-Driven CSV to Parquet Glue](sample_blueprints/glue_csv_parquet/README.md) - A blueprint for transforming larger CSV files into Parquet on a scheduled basis using Glue ETL.

***

## Logical Design

MDAA is designed as a set of logical architectural layers, each constituted by a set of functional 'modules'. Each module configures and deploys a set of resources which constitute the data analytics environment. Modules may have logical dependencies on eachother, and may also leverage non-MDAA resources deployed within the environment, such as those deployed via Landing Zone Accelerator.

While MDAA can be used to implement a comprehensive, end to end data analytics platform, it ***does not*** result in a closed system. MDAA may be freely integrated with non-MDAA deployed platform elements and analytics capabilites. Any individual layer or module of MDAA can be replaced by a non-MDAA component, and the remaining layers/modules will continue to function (assuming basic functional parity with the replaced MDAA module/layer).

MDAA is conceptually, architecturally, and technically similar in nature to the Landing Zone Accelerator (LZA), providing similar functionality for analytics platform configuration and deployment as LZA does for general cloud platform configuration and deployment. The logical layers of MDAA are specifically designed to be deployed on top of a general purpose, secure cloud platform such as that deployed by LZA.

![Mdaa Logical Architecture](docs/MDAA-Logical.png)
***

## Design Principles

### Security and Compliance

See [MDAA Security](SECURITY.md)

### Governance

* Leverage Infrastructure as Code (CDK/CloudFormation, Terraform)--as the single agent of deployment and change within the target AWS accounts
* Optional governed, secure self-service deployments via Service Catalog
* Consistent but customizable naming convention across all deployed resources
* Consistent tagging of all generated resources

### Accessibility, Flexibility and Extensibility

* Flexible, YAML configuration-driven deployments (CDK Apps) with implicit application of security controls in code
* Ability to orchestrate architectures with both Terraform and CDK-based modules
* Optional publishing of Service Catalog products for end-user self-service of compliant infrastructure
* Reusable CDK L2 and L3 Constructs, and Terraform Modules for consistent application of security controls across modules
* Extensibility through multi-language support using the same approach as CDK itself (via JSII)
  * TypeScript/Node.js
  * Python 3.x
  * Java
  * .Net

***

## MDAA Components

MDAA is implemented as a set of compliant modules which can be deployed via a unified Deployment/Orchestration layer. 

* **MDAA CDK Modules** - A set of configuration-driven CDK Apps, which leverage the MDAA CDK Constructs in order to define and deploy compliant data analytics environment components as CloudFormation stacks. These apps can be executed directly and independantly using CDK cli, or composed and orchestrated via the MDAA CLI.

* **MDAA Terraform Modules (Preview)** - A set of standardized Terraform modules which adhere to security control requirements. These apps can be executed directly and independantly using Terraform cli, or composed and orchestrated via the MDAA CLI. Note that Terraform integration is currently in preview, and not all MDAA functionality is available.

* **MDAA CDK L2 and L3 Constructs** - A set of reusable CDK constructs which are leveraged by the rest of the MDAA codebase, but can also be reused to build additional compliant CDK constructs, stacks, or apps. These constructs are each designed for compliance with AWS Solutions, HIPAA, PCI-DSS and NIST 800-53 R5 CDK Nag rulesets. Similar to the CDK codebase MDAA is built on, MDAA constructs are available with binding for multiple langauges, currently including TypeScript/Node.js and Python 3.

* **MDAA CLI (Deployement/Orchestration) App** - A configuration driven CLI application which allows for composition and orchestration of multiple MDAA Modules (CDK and Terraform) in order to deploy a compliant end to end data analytics environment. Also ensures that each MDAA Module is deployed with the specified configuration into the specified accounts while also accounting for dependencies between modules.

![MDAA Code Architecture](docs/MDAA-Code-Architecture.png)

***

## Available MDAA Modules (CDK Apps and L3 Constructs)

### Governance Modules (CDK Apps and L3 Constructs)

* [**(Preview)DataZone**](packages/apps/governance/datazone-app/README.md) - Allows DataZone domains and environment blueprints to be deployed.
* [**(Preview)Macie Session**](packages/apps/governance/macie-session-app/README.md) - Allows Macie sessions to be deployed at the account level.
* [**LakeFormation Data Lake Settings**](packages/apps/governance/lakeformation-settings-app/README.md) - Allows LF Settings to be administred using IaC.
* [**LakeFormation Access Controls**](packages/apps/governance/lakeformation-access-control-app/README.md) - Allows LF Access Controls to be administered using IaC
* [**Glue Catalog**](packages/apps/governance/glue-catalog-app/README.md) - Configures the Encryption at Rest settings for Glue Catalog at the account level. Additionally, configures Glue catalogs for cross account access required by a Data Mesh architecture.
* [**IAM Roles and Policies**](packages/apps/governance/roles-app/README.md) - Generates IAM roles for use within the Data Environment
* [**Audit**](packages/apps/governance/audit-app/README.md) - Generates Audit resources to use as target for audit data and for querying audit data via Athena
* [**Audit Trail**](packages/apps/governance/audit-trail-app/README.md) - Generates CloudTrail to capture S3 Data Events into Audit Bucket
* [**Service Catalog**](packages/apps/governance/service-catalog-app/README.md) - Allows Service Catalog Portfolios do be deployed and access granted to principals

### Data Lake Modules (CDK Apps and L3 Constructs)

* [**Datalake KMS and Buckets**](packages/apps/datalake/datalake-app/README.md) - Generates a set of encrypted data lake buckets and bucket policies. Bucket policies are suitable for direct access via IAM and/or federated roles, as well as indirect access via LakeFormation/Athena.
* [**Athena Workgroup**](packages/apps/datalake/athena-workgroup-app/README.md) - Generates Athena Workgroups for use on the Data Lake

### Data Ops Modules (CDK Apps and L3 Constructs)

* [**Data Ops Project**](packages/apps/dataops/dataops-project-app/README.md) - Generates shared secure resources for use in Data Ops pipelines
* [**Data Ops Crawlers**](packages/apps/dataops/dataops-crawler-app/README.md) - Generates Glue crawlers for use in Data Ops pipelines
* [**Data Ops Jobs**](packages/apps/dataops/dataops-job-app/README.md) - Generates Glue jobs for use in Data Ops pipelines
* [**Data Ops Workflows**](packages/apps/dataops/dataops-workflow-app/README.md) - Generates Glue workflows for orchestrating Data Ops pipelines
* [**Data Ops Step Functions**](packages/apps/dataops/dataops-stepfunction-app/README.md) - Generates Step Functions for orchestrating Data Ops pipelines
* [**Data Ops Lambda**](packages/apps/dataops/dataops-lambda-app/README.md) - Deploys Lambda functions for reacting to data events and performing smaller scale data processing
* [**Data Ops DataBrew**](packages/apps/dataops/dataops-databrew-app/README.md) - Generates Glue DataBrew resources (Jobs, Recipicees) for performing data profiling and cleansing
* [**(Preview) Data Ops Nifi**](packages/apps/dataops/dataops-nifi-app/README.md) - Generates Apache Nifi clusters for building event-driven data flows
* [**(Preview) Data Ops Database Migration Service (DMS)**](packages/apps/dataops/dataops-dms-app/README.md) - Generates DMS Replication Instances, Endpoints, and Tasks

### Data Analytics Modules (CDK Apps and L3 Constructs)

* [**Redshift Data Warehouse**](packages/apps/analytics/datawarehouse-app/README.md) - Deploys secure Redshift Data Warehouse clusters
* [**Opensearch Domain**](packages/apps/analytics/opensearch-app/README.md) - Deploys secure Opensearch Domains and Opensearch Dashboards
* [**QuickSight Account**](packages/apps/analytics/quicksight-account-app/README.md) - Deploys resources which can be used to deploy a QuickSight account
* [**QuickSight Namespace**](packages/apps/analytics/quicksight-namespace-app/README.md) - Deploys QuickSight namespaces into an account to allow for QuickSight multi tenancy in the same QuickSight/AWS Account
* [**QuickSight Project**](packages/apps/analytics/quicksight-project-app/README.md) - Deploys QuickSight Shared Folders and permissions

### AI/Data Science Modules (CDK Apps and L3 Constructs)

* [**SageMaker Studio Domain**](packages/apps/datascience/sm-studio-domain-app/README.md) - Deploys secured SageMaker Studio Domain
* [**SageMaker Notebooks**](packages/apps/datascience/sm-notebook-app/README.md) - Deploys secured SageMaker Notebooks
* [**Data Science Team/Project**](packages/apps/datascience/data-science-team-app/README.md) - Deploys resource to support a team's Data Science activities

### Core/Utility Modules (CDK Apps and L3 Constructs)

* [**EC2**](packages/apps/utility/ec2-app/README.md) - Generates secure EC2 instances and Security groups
* [**SFTP Transfer Family Server**](packages/apps/utility/sftp-server-app/README.md) - Deploys SFTP Transfer Family service for loading data into the Data Lake
* [**SFTP Transfer Family User Administrator**](packages/apps/utility/sftp-users-app/README.md) - Allows SFTP Transfer Family users to be administered in IaC
* [**DataSync**](packages/apps/utility/datasync-app/README.md) - Deploys DataSync resources for data movement service between on-premises storage systems and cloud-based storage services
* [**EventBridge**](packages/apps/utility/eventbridge-app/README.md) - Deploys EventBridge resoruces such as EventBuses

***

## Available MDAA Reusable CDK L2 Constructs

These constructs are specifically designed to be compliant with the AWSSolutions, HIPAA, PCI-DSS, and NIST 800-53 R5 CDK Nag Rulesets and are used throughout the MDAA codebase. Additionally, these compliant constructs can be directly leveraged to build new constructs outside of the MDAA codebase.

* [**Athena Workgroup Constructs**](packages/constructs/L2/athena-constructs/README.md)
* [**EC2 Constructs**](packages/constructs/L2/ec2-constructs/README.md)
* [**(Preview) ECS Constructs**](packages/constructs/L2/ecs-constructs/README.md)
* [**(Preview) EKS Constructs**](packages/constructs/L2/eks-constructs/README.md)
* [**Glue Crawlers, Jobs, and Security Configuration Constructs**](packages/constructs/L2/glue-constructs/README.md)
* [**Glue DataBrew Job and Recipe Constructs**](packages/constructs/L2/databrew-constructs/README.md)
* [**IAM Role Construct**](packages/constructs/L2/iam-constructs/README.md)
* [**KMS CMK Construct**](packages/constructs/L2/kms-constructs/README.md)
* [**Lambda Role and Function Constructs**](packages/constructs/L2/lambda-constructs/README.md)
* [**Redshift Cluster Construct**](packages/constructs/L2/redshift-constructs/README.md)
* [**S3 Bucket Construct**](packages/constructs/L2/s3-constructs/README.md)
* [**SageMaker Constructs (Studio and Notebooks)**](packages/constructs/L2/sagemaker-constructs/README.md)
* [**OpenSearch Constructs**](packages/constructs/L2/opensearch-constructs/README.md)
* [**SQS Queue Construct**](packages/constructs/L2/sqs-constructs/README.md)
* [**SNS Topic Construct**](packages/constructs/L2/sns-constructs/README.md)
* [**SFTP Transfer Family Server Construct**](packages/constructs/L2/transfer-family-constructs/README.md)
* [**(Preview) RDS Aurora Constructs**](packages/constructs/L2/rds-constructs/README.md)
* [**(Preview) DynamoDB Construct**](packages/constructs/L2/ddb-constructs/README.md)

***

## Available MDAA Reusable Terraform Modules (Preview)

These modules are specifically designed to be compliant with standard Checkov rules. Each Terraform module will have Checkov applied at plan/deploy time. Note that these modules are managed in a separate MDAA Terraform Git Repo.

* Athena Workgroups
* S3 Datalake
* Data Science Team
* Glue Catalog Settings
* DataOps Glue Crawlers
* DataOps Glue Jobs
* DataOps Glue Workflow
* DataOps Projecs

*** 

## Using/Extending MDAA Overview

MDAA can be used and extended in the following ways:

* Configuration-driven, compliant, end to end Analytics Environments can be configured and deployed using MDAA config files and the MDAA CLI
  * Organizations with minimal IaC development and support capability or bandwidth
  * Accessible by all roles
    * No code, Yaml configurations
  * Simple to complex configurations and deployments
  * High end to end compliance assurance

* Custom, code-driven end to end Analytics Environments can be authored and deployed using MDAA reusable constructs
  * Organizations with IaC development and support capability
  * Accessible by Developers and Builders
  * Multi-language support
  * High compliance assurance for resources deployed via MDAA constructs

* Custom-developed and deployed data-driven applications/workloads can be configured to leverage MDAA-deployed resources via the standard set of SSM params which are published by all MDAA modules
  * Independantly developed in Terraform, CDK or CFN
  * Loosely coupled with MDAA via SSM Params
  * Workload/Application compliance independantly validated

![MDAA Usage and Extension](docs/MDAA-Extending.png)

## Metrics collection

This solution collects anonymous operational metrics to help AWS improve the quality and features of the solution. For more information, including how to disable this capability, please see the [implementation guide] (<https://docs.aws.amazon.com/cdk/latest/guide/cli.html#version_reporting>).
