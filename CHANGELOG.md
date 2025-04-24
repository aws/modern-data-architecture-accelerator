# Change Log

## [1.0.0] - 2025-04-24

### General Changes

- Initial General Availability (GA) release

## [0.47.0] - 2025-04-23

### General Changes

- Bumped CDK to latest (2.190.0)
- Fixed issue with platform-specific NX libraries limiting portability

## [0.46.0] - 2025-04-17

### General Changes

- Bumped CDK to latest (2.188.0)
- Applied ESLint across codebase
- Prepped for open source release
- Hardened MDAA CLI to better handle errors in child processes (Lerna builds and CDK)
- Added NodeJs version check >= 0.22 to MDAA CLI
- Modified Lambda layer asset builds to use CDK Assets with Docker, and fall back to Pip if Docker is unavailable
- Standardized Lambda logging
- Added AWS Solution details to deployed CloudFormation stack descriptions

### Security Changes

- Modified all CDK Nag suppressions to indicate if they originate in code (with source file/line number) or from config

### Governance Changes

- Added SageMaker Governance module with support for SageMaker Catalog domain creation

## [0.45.0] - 2025-03-18

### General Changes

- Bumped CDK dependency to latest version (2.181.1)
- Bumped CDK Nag to latest version (2.35.25)
- Bumped build/test tooling (including Lerna, NX, Jest, JSII) to latest versions
- Bumped Lambda runtime versions to latest (Python: 3.13) for all MDAA-deployed Lambda functions
- Added @mdaaLookupSSMValues context flag, which will force MDAA to perform early SSM parameter lookup, providing earlier detection of SSM-related configuration errors
- Removed all sample data from repo, replaced with instructions on obtaining sample data from public repos
- Removed all binary zip contents from repo, replaced with docker-based builds
  - MDAA requires Docker command to be locally available in order to build Lambda layers (in the Lambda module), as well as for the GAIA module
- Added Prettier/ESLint validation for MDAA CLI package
  - Will be gradually expanded across the codebase in future versions

### Security Changes

- Added CDK Nag ruleset evaluation for PCI-DSS compliance
  - PCI-DSS Ruleset compliance is now validated for all MDAA executions
- Updated security-related documentation, including adding SECURITY.md, as well as L2 construct-level compliance details

### Governance Changes

- Added ability to configure IAM Identity Center integration in LakeFormation Settings module
- Added expanded support for DataZone (Preview)
  - Only DataZone domains are created in the DataZone module (Preview)
  - Domains can now be associated to multiple accounts
  - Standard DataZone blueprint support has been removed, and replaced with functionality in DataOps project.

### DataOps Changes

- DataZone Projects, Environments, Subscription Targets, and DataSources, can now be created in the DataOps Project module
  - A DataZone Project can be created per DataOps Project, and will be created with in a DataZone domain created by the DataZone module
  - A DataZone Custom Environment and subscription target will be created per DataZone project, pointing at DataOps project resources
  - A DataZone Data Source may be created per Glue Database within the DataOps project, allowing for publishing of data assets within each database

## [0.44.0] - 2025-01-24

### General Changes

- Fixed bug with eventbridge app for conflicting eventbus policy statement ids

## [0.43.0] - 2024-12-13

### General Changes

- MDAA CLI will now automatically attempt to find MDAA module packages in locally cloned source code when running from within a cloned repo
  - Use of the `-l` flag is no longer necessary
  - When running the CLI from an NPM package, MDAA packages will also be installed and executed from NPM
  - Any specification of a package version on the `cdk_app`/`module_path` mdaa.yaml module config parameter will trigger package installation from NPM, even when running CLI from source code. For example:
    - `cdk_app: "@aws-caef/audit@<npm_version>"`
    - `cdk_app: "@aws-caef/audit@latest"`
    - `module_path: "@aws-caef/audit@<npm_version>"`
    - `module_path: "@aws-caef/audit@latest"`
- (Preview) - Added Terraform support to MDAA CLI. This allows MDAA to orchestrate Terraform modules in addition to the existing CDK-based MDAA Modules.
  - Requires Terraform CLI to be on the PATH, as well as Pip (for installing Checkov)
  - Orchestrated Terraform Modules will automatically be scanned by standard Checkov policies
  - Deprecated `cdk_app` module configuration parameter in mdaa.yaml, replaced with `module_path`
  - Deprecated `app_configs` module configuration parameter in mdaa.yaml, replaced with `module_configs`
  - Deprecated `app_config_data` module configuration parameter in mdaa.yaml, replaced with `module_config_data`
  - Added various Terraform-based implementations of common MDAA modules, managed in a separate Git repo
- Modified MDAA CLI to write cdk.out to separate paths per module
  - This resolves a conflict where concurrent MDAA CLI executions would collide
- Adjusted automatically created resource tags to accurately capture MDAA CDK app name
  - Backwards compatability can be maintained for specific modules by setting the context value `@aws-mdaa/legacyCdkAppTags` to true
  - This context value is used only on resources (such as Ec2 Launch Templates) where changing tag values results in resource recreation
- Bumped to latest CDK Lib version (1.164.1)
- Removed use of variant package dependency versions

### Data Lake Changes

- (Preview) Added Terraform implementation of Glue Catalog Settings module (in separate MDAA Terraform Repo)
- (Preview) Added Terraform implementation of S3 Datalake module (in separate MDAA Terraform Repo)
- (Preview) Added Terraform implementation of Athena module (in separate MDAA Terraform Repo)

### Data Science/AI/ML Changes

- (Preview) Added Bedrock Builder module, with initial support for Bedrock Agents
- GAIA
  - Changed to cheaper default instance type for SageMaker endpoints
  - Added ability to invoke Bedrock Agents
  - Added support for interacting with Bedrock Knowledge Bases
  - Assorted bug fixes and security enhancements
  - Refactor Bedrock adapter to be based on Converse API
  - Added additional code override configurations
- (Preview) Added Terraform implementation of Data Science Team module (in separate MDAA Terraform Repo)

### DataOps Changes

- Added sample DataOps Blueprints under `./sample_blueprints`
  - These are sample DataOps module configurations which can be added to existing MDAA deployments for common DataOps tasks such as:
    - Basic Glue Crawler
    - Glue ETL Workflow from S3 into Redshift
    - Cron-Schedued Glue ETL job to transform CSV into Parquet
    - EventBridger-triggered Lambda ETL function to transform small CSV into Parquet
    - DataOps orchestration via Step Functions
- (Preview) Added Terraform implementation of Glue Crawler module (in separate MDAA Terraform Repo)
- (Preview) Added Terraform implementation of Glue ETL module (in separate MDAA Terraform Repo)
- (Preview) Added Terraform implementation of Glue Project module (in separate MDAA Terraform Repo)
- (Preview) Added Terraform implementation of Glue Workflow module (in separate MDAA Terraform Repo)

### Analytics Changes

- DataWarehouse - Added ability for Redshift clusters to be created from an existing Snapshot
- DataWarehouse - Added config param `redshiftManageMasterPassword` to push Admin credentials management into Redshift service

## [0.42.0] - 2024-08-20

### General Changes

- Renamed 'CAEF' to 'MDAA' (Modern Data Architecture Accelerator)
  - This is mostly a cosmetic change within the code
    - Only cosmetic changes will be made to deployed resources, including Tag names
    - Legacy 'caef\_' tag names can be maintained using `"@aws-mdaa/legacyCaefTags": true` context flag
  - A `./bin/caef` symlink points to the renamed MDAA CLI (`./bin/mdaa`)
  - MDAA CLI will now look for an `mdaa.yaml` or a `caef.yaml`
- Added capability for MDAA environment templates to be used across multiple environments, dramatically reducing the amount of configuraiton content required per environment
  - Named environment templates are defined under `env_templates` either at the global or domain levels
    - Environment templates defined at the global level may be used across all environments within the config
    - Environment templates defined within a domain may only be used within the domain
  - Environment templates can define all values for an environment and can be referenced by multiple environments by name using the `template` environment property
    - Config scalar values defined in the template can be overridden within the specific environment
    - Config objects and lists, such as module lists, will be concatenated between template and environment configs
- Added capability for MDAA to create its own Pipelines
  - Added `devops` global config section to `mdaa.yaml`
  - Multiple pipelines can be configured, each deploying their own domains/envs/modules from the config
  - A single module may be deployed only by a maximum of one pipeline
  - Currently expects CodeCommit to be source repo for both MDAA Configs and MDAA Source Code
  - Support for other repos will be added in next release
- Added MDAA Module package names and `mdaa.yaml` module config snippets into all module READMEs
- Added generated MDAA Module config schema docs to all module READMEs
  - Future release will improve schema documentation quality
- Addressed a number of new NPM vulnerabilities and security nags
- Fixed bug with MDAA CLI not allowing spaces in path containing the CAEF codebase in local mode
- Updated CDK version to 2.147.0 globally
- Updated sample config Deployment guides to use local mode flag (-l)
- Fixed bug with "@aws-caef/legaceParamScope" context flag
- Added support for appending arbirary CDK params to MDAA CLI which will be passed to CDK CLI directly

### Data Science/AI/ML Changes

- GAIA - Switched FalconLite container to PyTorch 0.9.3
- GAIA - Updated GAIA Documentation

### DataOps Changes

- Exposed `databaseName` into DMS Endpoint Config

### Utility Changes

- Fixed an issue with `accessRoleArn` in Sftp Users config

## [0.41.0] - 2024-04-29

### Governance Changes

- Added DataZone module in Preview
  - Allows provisioning of DataZone Domains and Environment Blueprints
- Added Macie Sessions module in Preview
  - Allows provisioning of account-wide Macie Sessions
- Moved governance related modules under a 'governance' package directory

### Data Science/AI/ML Changes

- Added the Generative AI Accelerator (GAIA) module in Preview
  - Provides a compliant Generative AI workspace backend, allowing both experimentation and production Generative AI capabilities
  - Supports pluggable LLM models (including BedRock and SageMaker hosted models)
  - Supports Kendra and RDS Aurora RAG engine backends
  - Supports pluggable backend processing functions
- Added permissions to allow use of new SageMaker Studio Spaces feature in SM Studio and Data Science Team modules
  - Added support for 'studioWebPortal' configuration on SM Studio, which forces use of SM Spaces instead of SM Studio Classic
  - Newly created SM Studio Domains will automatically use Spaces
- Moved all DataScience/AI/ML modules under ./packages/ai from ./packages/data-science

### Data Ops Changes

- Added Docker support to DataOps Lambda module
- Added support for DataOps Glue Jobs to reference additional libraries placed next to the job script
- Improved compatability of DataOps Nifi module with LZA, fixing various issues
- Added automatic creation of EC2 management node to DataOps Nifi Module, preconfigured with KubeCTL and access to manage the EKS cluster
- Updated CDK version for Glue to match aws-cdk-lib

### Data Lake Changes

- Fixed issue with Data Lake Lifecycle policy configurations using wrong object transition values
- Added missing write permission on Data Lake LakeFormation roles so they can be used to write to the Data Lake
- Added missing Glue Catalog Resource Policy permissions, improving cross account LakeFormation support
- Added "kmsKeyConsumerAccounts" to Glue Catalog module, allowing permissions to KMS key to be added independently of catalog permissions

### Analytics Changes

- Updated CDK version for Redshift to match aws-cdk-lib

### General Changes

- Reorganized DEPLOYMENT documentation to emphasize MDAA local mode (-l) as the preferred approach
  - Local mode (introduced 0.40) avoids requiring MDAA npm packages to be published to an NPM repo
- Added functionality to allow referencing of roles by IAM Identity Center/SSO permission set name.
  - Adding 'sso: true' to a role ref will treat the role name as the name of an IAM Identity Center permission set name
  - The role will be resolved by searching for the 'AWSReservedSSO\_' role created for that permission set within the account by IAM Identity Center
  - SSO roles will be automatically treated as immutable
- Fixed issue with "@aws-mdaa/enableUniqueBucketNames" not account for prefix in max bucket name length
- Added boto version 1.33.13 to boto lambda layers, and set as default
- Enhance MDAA CLI to print current (installed) version
- Surfaced config schemas in ./schemas under the repo root. All compiled schemas are placed here for convenience, to be used by YAML editors.
  - Schemas also published as '@aws-mdaa/schemas' NPM package
- Fixed various NPM Dependency CVEs through overrides
- Fixed a number of SSM Parameter constructs to be appropriately scoped
  - The legacy scoping can be retained by setting the "@aws-mdaa/legacyParamScope" global context value
- Bumped CDK to latest version (2.132.1)
- Bumped CDK NAG to latest version (2.28.27)
- Bumped JSII to latest version (5.4.0)
- Added support for higher/sibling directory relative paths to MDAA configs processor ("../< some-path >")
  - MDAA configs can now reference source code, config files, and assets outside of the config directory/repo itself

### L2 Construct Changes

- Added DynamoDB L2 Constructs
- Added RDS Aurora L2 Constructs

## [0.40.0] - 2023-12-01

### General Changes

- Added local execution mode for MDAA CLI. This allows direct execution of MDAA from cloned MDAA repo.
  - No NPM publishing or installation of MDAA packages required.
  - All modules will be built and executed from the local source code.
  - MDAA config must not specify a MDAA version. Whatever is cloned/checked out from the MDAA repo will be used.
- Updated CDK to latest version (2.126.0)
- Update CDK Nag to latest version (2.27.142)
- Added "@aws-mdaa/enableUniqueBucketNames" CDK context feature flag, which, when set to true, results in a unique prefix being automatically added to all S3 bucket names.
  - Unique prefix is based on stack id, so is stable across stack updates
  - Helps ensure global bucket name uniqueness, and protects against predictable bucket names
  - Can be set in global, domain, env, and per module context

### Data Ops Changes

- Added preview DataOps Database Migration Service (DMS) module
  - Supports Replication Instance-based replication tasks
  - Supports endpoint credentials either via Secrets Manager or via AWS Role
- Added preview DataOps Nifi cluster module running on EKS Fargate
  - Allows deployment of multiple secured Nifi Clusters on a single EKS cluster, along with a preconfigured and integrated Nifi Registry
  - Allows configuration of Nifi and Registry permissions through MDAA
  - Allows integration of Nifi Auth with SAML IDP such as IAM Identity Center
- Resolved issue with hardcoded Glue job timeouts in Glue Workflows
- Added support for EventBridge Rule cron scheduling expressions to DataOps Lambda, Glue Workflow, and StepFunction modules
- Added support for static EventBridge target input to be statically defined
- Resolved race condition in DataOps Project/LakeFormation grants
  - May require recreation of LF Grants previously created through DataOps project

### Utility Changes

- Added preview generated managed policies to Roles module providing base permissions for Data Admins, Data Scientists, and Data Engineers
  - Added 'basePersona' config to generated roles, accepting one of "data-admin"| "data-engineer" | "data-scientist"
  - Generated policies appropriate for the basePersona will be automatically added to the generated role
- Added preview reusable compliant constructs for EKS Fargate clusters
- Added preview reusable compliant constructs for ECS Tasks and Services

## [0.39.0] - 2023-07-18

### Utility Changes

- Modified EC2 Cfn-Init to use inline fdile content in Cfn templates as a workaround to Asset resource naming collisions.

## [0.38.0] - 2023-07-17

### General Changes

- Updated codebase for compatibility with JSII 5.x
- Pruned dependencies causing NPM vulnerability warnings

### Analytics Changes

- Added IP Address Restrictions to QuickSight Account module
- Added VPC Connection provisioning to QuickSight Account module

### Data Science Changes

- Added FilterLogEvents to Data Science Team Read Policy

### Datalake Changes

- Resolved issue with LakeFormation Settings module which prevented LF Settings from deleting cleanly
  - NOTE: Deployment will replace the original LF settings custom resource, which will fail to delete with the following non-fatal error: "Received response status [FAILED] from custom resource. Message returned: Error: put_data_lake_settings() only accepts keyword arguments."
  - After first deployment, the old custom resource will be removed and the error no longer encountered.

### Utility Changes

- Updated m2m-api module to support multi-part uploads.

## [0.37.0] - 2023-07-14

### General Changes

- Upgraded CDK to 2.85.0
- Upgraded CDK Nag to 2.27.35
- Removed unneeded dependency on aws-sdk in QuickSight module causing NPM vulnerability warning
- Added AWS Solutions SAST and Publishing Checks to CI/CD
  - Standardized licensing headers on all source files
  - Updated CONTRIBUTING, CODE_OF_CONDUCT, and NOTICE documentation
  - Added standard CDK metrics collection info to README

### Utility Changes

- Modified EC2 instance construct to enforce Instance Metadata Service v2 (Required by latest CDK Nag NIST/HIPPA Rulesets)
- Added CfnInit capability to EC2 Module
- Config references will now be resolved in Ec2 Userdata

### Data Science Changes

- Modified Studio Lifecycle Config names to use contents hash, resulting in content changes producing a new Lifecycle Config
  - The old Lifecycle Config will be deleted only if not currently in use (enforced by SageMaker API)
  - Allows modifications to Lifecycle Configs without deleting all active Apps/Containers
- Studio Lifecycle Config contents are now Base64 encoded on the Cfn side, after all references/tokens have been resolved
  - This allows references to be used within Lifecycle Config script contents
- Fixed issue where Studio Domain update could silently fail
- Added Lifecycle Config Assets to SageMaker Notebooks
- Aligned Lifecycle Config syntax between Studio and Notebooks
