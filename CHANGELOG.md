# Change Log

## [NEXT_RELEASE_VERSION] - NEXT_RELEASE_DATE

### New Features

#### Generative AI Accelerator v2 Module

- New `@aws-mdaa/gaia-v2` app and `@aws-mdaa/gaia-v2-l3-construct` providing an authenticated GenAI chatbot platform; successor to `@aws-mdaa/gaia`
- AppSync Events API for real-time bidirectional streaming, fronted by Cognito User Pool authentication with optional external OIDC (e.g., Entra ID)
- Pluggable data source model — exactly one of Bedrock Knowledge Base RAG, direct Bedrock model invocation with streaming, or customer-provided Lambda
- Optional client and admin CloudFront UIs with custom-domain and ACM certificate support
- Chat history, feedback, and service-interruption banner backed by KMS-encrypted DynamoDB tables
- WAF protection (regional and global), VPC-attached Lambda execution, and synth-time validation of misconfigurations

#### SageMaker Ground Truth Module

- New `@aws-mdaa/sagemaker-ground-truth` app for automated, continuous data labeling pipelines
- EventBridge + SQS + Step Functions architecture for continuous S3 ingestion to batched labeling jobs
- SageMaker Feature Group integration for persisting labeled data
- Optional verification labeling job with automatic re-queue of rejected items
- Configurable EventBridge Scheduler triggers, DLQ with CloudWatch alarms

#### SageMaker MLOps Module

- New `@aws-mdaa/sagemaker-mlops` app for training, deployment, batch inference, and monitoring pipelines
- New `@aws-mdaa/sagemaker-endpoint` app for deploying SageMaker model endpoints
- Generic `buildPolicies` configuration for attaching custom IAM policies (managed policy ARNs or inline policy documents) to CodeBuild pipeline roles, with optional CDK Nag suppressions
- Registry authentication for CodeArtifact, Artifactory, GitLab, etc. is now handled entirely in user buildspecs
- Optional CodeArtifact integration alongside public npm support

#### SageMaker L2 Constructs

- Added `MdaaSageMakerProjectTemplate`, `MdaaGroundTruth`, and `MdaaModelMonitor` for ML lifecycle management

### Data Science/AI/ML Changes

#### Data Science Team Module

- Added optional MLflow tracking server configuration to the team's SageMaker Studio domain for experiment tracking
- Added per-user JupyterLab space provisioning via the new `jupyterLab` configuration

#### Bedrock AgentCore Runtime Module

- Added `enableTransactionSearch` configuration parameter to optionally skip X-Ray Transaction Search Config creation when the resource already exists
- Added `protocolConfiguration` configuration parameter for runtime protocol selection
- Removed unneeded resource policy from the runtime construct

#### RDS Constructs

- `MdaaAuroraPgVector`: engine version is now configurable via the `engineVersion` prop (default `16.6`). The default is provided for backward compatibility but is not maintained long-term — explicitly set the engine version to avoid future breakage
- `MdaaRdsServerlessCluster`: reader instance count is now configurable via the `numberOfReaderInstances` prop (default `1`)
- `BedrockKnowledgeBase` L3 construct: `engineVersion` from vector store config is now passed through to the Aurora PgVector cluster

### DataOps Module Changes

#### Data Quality Module

- Added multi-source support for rulesets — each ruleset can specify Glue, S3, or Redshift as its data source via a `source` block, with metadata published to SSM for downstream DQ evaluation jobs
- Added recommendation-based rulesets via `recommendationRunId`, delegating rule generation to Glue DQ recommendations
- Added dynamic target discovery via `dynamicTargets` for runtime dataset enumeration by DQ evaluation jobs
- Added `smusPublishing` configuration for publishing data quality metrics to SageMaker Unified Studio (DataZone)
- Added `smusAssetId` per-ruleset field for mapping DQ results to DataZone assets

#### DataOps Job Module

- Added pre-built data quality evaluation scripts (`dq-main.py`, `dq_config.py`, `smus.py`) enabling deployment of a working DQ evaluation Glue job without writing any code

#### DMS Constructs

- Added `expectedBucketOwner` support to S3 endpoint settings for cross-account bucket protection

### Data Lake Changes

- Added optional S3 Storage Lens support — enable via `storageLensEnabled`
- Added optional CORS support — configure via `corsRules`

### Data Analytics Changes

#### Data Warehouse Module

- Added `multiAz` (multi-AZ high availability) and `backupRegion` (cross-region snapshot copy) configuration options
- Added `publicAccessBlockManagedExternally` option to skip the explicit `BlockPublicAccess` setting on S3 buckets; settable globally via CDK context (`@aws-mdaa/publicAccessBlockManagedExternally: true`) or as a per-module property
- Fixed type for `parameterGroupParams` configuration

### Governance Module Changes

#### DataZone/SMUS Modules

- Added simplified `authorizations` interface for domain and domain unit configuration, supporting `projectCreators`, `eligibleProjectMembers`, `domainUnitCreators`, `glossaryCreators`, and `environmentCreators` as a concise alternative to full `authorizationPolicies` objects
- `authorizationPolicies` and `authorizations` are now supported at the root domain level (`BaseDomainProps`), not just on individual domain units
- Domain owners (users, groups, and associated account CDK users) now automatically receive version-aware project creation authorization policies in addition to `ADD_TO_PROJECT_MEMBER_POOL`
- Deprecated `allowAllUsers`, `allowedUsers`, and `allowedGroups` on domain units in favor of `authorizations.eligibleProjectMembers` or `authorizationPolicies`. Switching from these deprecated properties requires a two-step migration: first remove the deprecated properties and deploy, then add the new configuration and redeploy. A single-step migration will produce `PolicyGrant` conflicts.

#### Account-Level Modules

- Glue Catalog, LakeFormation Settings, Macie Session, and QuickSight Account modules now create a static SSM parameter (`/account-module-lock/<module-name>`) that prevents multiple deployments of the same module to a single AWS account

#### Roles Module

- Added optional `additionalTrustedActions` for the role primary principal, allowing extra actions like `sts:TagSession` to be added to the trust policy

### Utility Module Changes

#### CLI

- Added optional permission boundary name input to apply an IAM policy as permission boundary to all IAM roles

### Deprecations

- `@aws-mdaa/gaia` and `@aws-mdaa/gaia-l3-construct` (GAIA v1) are deprecated in favor of `@aws-mdaa/gaia-v2` and `@aws-mdaa/gaia-v2-l3-construct`
  - v1 packages remain published and functional for existing deployments but will not receive new features
  - v1 packages will be removed in a future major release
  - v2 is a re-architected GAIA backend (Cognito, AppSync Events, CloudFront) and is not a drop-in replacement. See [MIGRATION_TO_V2.md](packages/apps/ai/gaia-app/MIGRATION_TO_V2.md) for guidance

### General Changes

- Every app module now includes `sample-config-minimal.yaml` and `sample-config-comprehensive.yaml` with full schema coverage, inline documentation, and template variables for portability
- All app module READMEs follow a consistent structure with architecture overview, configuration reference, and ordered sample config sections
- Replaced Jest snapshot and synth tests with CDK diff-based baseline testing across all app modules, using the CDK toolkit's semantic diff engine to detect resource changes
- Updated dependencies to address CVEs (`pyjwt`, `ts-jest`, `lodash`, `ajv`, and others)

### Bug Fixes

- Fixed IAM Policy cross-stack collision in `dataops-job` and `sm-studio-domain` caused by `BucketDeployment` adding inline policies to imported roles
- Fixed construct ID collision when multiple security groups are defined in a DataOps project
- Fixed model deploy stage IAM policy size overflow in SageMaker MLOps by separating account role responsibilities
- Fixed `MdaaSqsQueue` mis-spelled `encyption` property that prevented the explicit KMS encryption mode from being applied
- Fixed missing ECR permissions in Bedrock AgentCore Runtime when `containerUri` configuration parameter is used
- Fixed SageMaker AI Domain updates failing with "resource already exists" when only mutable settings (default user settings, domain settings) change. Note: changing immutable properties (`AuthMode`, `DomainName`, `KmsKeyId`, `VpcId`) still requires manual domain recreation
- Fixed 403 `PROJECT_CREATE_FAILED` error in same-account DataZone deployments by granting `CREATE_PROJECT` / `CREATE_PROJECT_FROM_PROJECT_PROFILE` and `ADD_TO_PROJECT_MEMBER_POOL` authorization policies to the cfn-exec role and data-admin role on the root domain unit
- Fixed DataZone SageMaker domain child stack not inheriting parent account and region, which caused failures in cross-account deployments
- Fixed DataZone environment naming to use the naming helper with `maxLength` enforcement
- Fixed unique-environment generation in SageMaker projects when the user supplies tooling
- Fixed Lambda Alias `CurrentVersion` no longer being incorrectly flagged by CDK diff baseline testing
- Fixed SageMaker endpoint construct using a non-fixed model name to avoid update conflicts

## [1.5.0] - 2026-03-13

### New Features

#### SageMaker Unified Studio Domain and Blueprints Module

- Added support for enabling and configuring managed blueprints
  - Added standard Tooling and LakeHouse (Glue Database) blueprint configurations, including creation of all required Tooling resources
  - Compliance-related Tooling parameter overrides (VPC connectivity, KMS encryption, role permissions) are automatically applied
- Any MDAA module can also be deployed as a custom SageMaker Unified Studio blueprint
  - Can be created from local CloudFormation templates or URLs
- Added granular authorization policies for domain units
- Streamlined domain configurations, using standard module SSM parameter lookups by default
  - Glue Catalog KMS key ARN is now optional for associated accounts; RAM-shared SSM parameter used by default

#### SageMaker Unified Studio Project Profiles and Projects Module

- Project profiles support target accounts, deployable environments, reusable environment templates, and parameter overrides
- Projects can be assigned to domain units with configurable ownership and membership
- Existing Glue databases can be imported as data sources
- Projects can be deployed in the domain account or in associated accounts

#### Glue Catalog Settings Module

- Glue Catalog KMS key SSM parameters are now automatically shared to consumer accounts via AWS Resource Access Manager (RAM)

#### Lake Formation Settings Module

- Added trusted account configuration for cross-account DataZone/SageMaker Unified Studio integration

### Governance Module Changes

#### DataZone Domain Module

- Streamlined domain configurations, using standard module SSM parameter lookups by default
  - Glue Catalog KMS key ARN is now optional for associated accounts
  - RAM-shared SSM parameter used by default
- Added granular authorization policies for domain units

### DataOps Module Changes

- All DataOps modules can now be deployed independently without a DataOps Project
  - `projectName` config parameter is now optional
  - Project resources can be directly specified in module configs when not using a DataOps Project

#### DataOps Project Module Changes

- Glue Catalog KMS key configuration now defaults to standard SSM parameter when not explicitly specified
- Glue Crawlers can be automatically created for project-created Glue Databases
- SageMaker Unified Studio projects can be created with DataOps projects
  - SMUS/DataZone data sources can be automatically created for project-created Glue Databases
  - Project admin, data engineer, and execution roles can be added as SMUS/DataZone project members

### OpenSearch Module Changes

- Added SAML-based authentication for enterprise identity federation

### Data Science/AI/ML Changes

- `BedrockKnowledgeBaseL3Construct` now creates fewer policies for `MdaaRdsDataResource`; resource manages its own policy statements internally and can be deployed independently
- Bedrock Builder data sources now publish SSM parameters identifying their IDs

### Utility Module Changes

#### SFTP Server Module

- Added optional `securityPolicyName` configuration for Transfer Family SFTP server, enabling deployment in regions that do not support FIPS security policies (e.g., eu-west-1)

### General Changes

- Added `useStaging` CLI parameter to force modules to deploy in config-defined order instead of using staging values from module packages
- Added `--cdk-out`, `--baseline`, and `--diff-out` CLI flags for comparing CloudFormation templates against stored baselines without requiring AWS deployment
- Added `!include` tag support for referencing external files in YAML configurations
- Added simplified SSM parameter scope prefixes: `ssm-org:`, `ssm-domain:`, and `ssm-env:`
- Added `blueprint:` prefix for referencing SSM parameters created by SageMaker Unified Studio blueprints
- Added variable placeholders support in predeploy and postdeploy hook commands
- CLI now validates `-d`, `-e`, and `-m` filter values upfront, including environment templates, and errors if they don't match any configured domains, environments, or modules
- Simplified installer stack by removing CodePipeline/S3 source and CodeStar ARN requirements, running `mdaa` directly from npmjs.org
- Starter kit configurations moved to [starter_kits](starter_kits); examples now on [AWS Samples](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator)
- Improved config schema documentation
- Improved README content and sample module configs
- Renamed remaining `@aws-caef` references to `@aws-mdaa`

### Bug Fixes

- Fixed deployment failures in accounts with SCPs that deny `logs:DeleteRetentionPolicy` by preventing CDK's `LogRetention` custom resource from being created in stacks that use `MdaaLambdaFunction`
- Fixed `LogRetention` custom resource interfering with metric filters and log insights queries
- Tightened IAM permissions and added pre-deployment suppression review TODOs in starter kits

## [1.4.0] - 2026-01-30

### New Features

- Users can now add CloudWatch observability features to Lambda Functions
- New Bedrock AgentCore Runtime app enables users to create secure agentic applications with minimal MDAA configuration
- New Glue Data Quality app allows users to define and apply AWS Glue Rulesets to tables
- Improved MDAA configuration context fields by allowing lists and objects in addition to strings and numbers
- LakeFormation users can now apply Tag-Based Access Control
- Updated lodash and urllib3 package versions to address security vulnerabilities

### Bug Fixes

- Fixed cross-account LakeFormation issues when regions are not the same across accounts
- Fixed deployment failures of VPC Endpoints when bedrock builder knowledge base uses OpenSearch Serverless on different VPCs
- Fixed `jsii` issues by ensuring all packages contain jsii in its npm package tarball
- Fixed Glue job scenario where additional scripts aren't appearing in the correct configuration
- Fixed bedrock builder knowledge base bug where the number of policies per role can unnecessarily exceed the AWS limit

## [1.3.0] - 2025-11-24

### General Changes

- Updated CDK version to 2.220.0
- Updated CDK Nag to 2.37.55
- Enhanced build pipeline configuration and dependency management
- Added additional checks and automation for NPM publishing
- Improved testing framework and snapshot management
- Added architecture diagrams for resources deployed by applications
- Fixed build and test pipeline log limits issue
- Updated package-lock with missing packages
- Improved lerna version bump logic

### Bug Fixes

- Fixed TypeError with additional_stacks configuration when using map function
- Fixed cyclic dependencies issue when creating stacks in us-east-1 with additional_stacks config
- Fixed tag_config_data in governed_lakehouse sample configuration
- Added description to installer stack template
- Fixed OpenSearch missing dependency in knowledge base package.json
- Fixed JS files being incorrectly ignored in builds
- Fixed publish pipeline stage issues
- Fixed Macie TypeScript executable reference

### Governance Changes

- Enhanced Lake Formation resource link to assume first region of account from additional stacks
- Improved Lake Formation access control for multi-region deployments

### Data Science/AI/ML Changes

- Added EFS CreateFileSystem permission with encryption enforcement to SageMaker Studio Domain handler for domain creation support
- Added JupyterLab lifecycle configuration support for SageMaker Studio domains
  - JupyterLab apps now support lifecycle configurations similar to Jupyter Server apps
  - Enables custom environment setup and package installation for Studio (Latest) JupyterLab environments
  - Lifecycle configurations can include assets and commands that run when JupyterLab containers launch
- Fixed Data Science config permissions to allow data scientists to open SageMaker AI Studio
- Enhanced SageMaker AI domain with lifecycle configuration setup capabilities
- Improved GAIA Aurora PGVector RAG engine configuration

## [1.2.0] - 2025-10-08

### General Changes

- Enhanced CI/CD pipeline with cornerstone publishing and improved test coverage
- Added Python testing framework integration to CI/CD pipelines
- Improved documentation generation and configuration object documentation
- Enhanced release management with proper versioning and prerelease handling
- Added support for issue and merge request templates
- Improved build processes with better dependency management
- Enhanced error handling and validation across modules
- Added support for testing published NPM packages
- Improved Docker command handling in CI/CD processes

### Security Changes

- Enhanced PCI compliance with additional CDK Nag ruleset validation
- Improved security documentation with consolidated SECURITY.md
- Enhanced AppSec review compliance and findings resolution
- Strengthened KMS encryption actions to remove unnecessary wildcards
- Added Bedrock Guardrail for PII removal capabilities
- Improved least privilege principles for DataZone policies

### Governance Changes

- Enhanced DataZone module with domain units support and improved version handling
- Added Identity Center (IdC) support in Lake Formation settings
- Improved SageMaker Catalog module compatibility with DataZone changes
- Enhanced cross-account lambda invocation samples
- Added Macie session support for account-level deployment
- Improved governance category organization of modules

### Data Lake Changes

- Enhanced multi-region support for MDAA module deployment
- Improved Athena workgroup configurations
- Enhanced S3 bucket lifecycle policy management
- Added support for unique bucket naming with UUID suffixes
- Improved Lake Formation role permissions for bucket write access

### DataOps Changes

- Added support for Scala Glue ETL jobs
- Enhanced DynamoDB app module with new functionality
- Improved DMS module with bug fixes and enhanced endpoint configurations
- Added support for external library references in Glue jobs
- Enhanced DataOps Lambda module with scope override options
- Improved Nifi module with Kubernetes version updates and registry integration
- Added support for custom EventBridge rule inputs
- Enhanced Step Function orchestration blueprints
- Improved Glue workflow timeout handling
- Added continuous log groups for Glue jobs
- Enhanced DataOps project module with improved database and role grant handling

### Data Science/AI/ML Changes

- Enhanced Bedrock Builder module with improved Knowledge Bases and Guardrails support
- Added OpenSearch Serverless Vector DB support
- Enhanced Aurora Serverless Vector DB with sizing parameters
- Improved model invocation logging configuration
- Added support for inference profile endpoint IDs
- Enhanced Bedrock region configuration and resource dependencies
- Improved GenAI Accelerator (GAIA) with v2 enhancements
- Added support for Bedrock Agent deployment independence
- Enhanced knowledge base resyncing functionality based on S3 sources
- Improved SageMaker Studio experience with new default settings
- Added support for custom parsing strategies and chunking configuration

### Data Analytics Changes

- Enhanced Redshift Data Warehouse with support for actual AWS node types
- Added support for Redshift cluster creation from existing snapshots
- Improved QuickSight IP address restrictions
- Enhanced OpenSearch domain configurations

### Core/Utility Changes

- Enhanced EC2 module with improved security group configurations
- Improved SFTP Transfer Family server and user management
- Enhanced EventBridge module with better event bus policy handling
- Added DataSync improvements for data movement services
- Enhanced Lambda layer builds with specific Python runtime support
- Improved CDK asset builds with Docker fallback to pip

## [1.1.0] - 2025-08-15

### General Changes

- Bumped CDK to latest version (2.201.0)
- Bumped CDK Nag to latest version (2.37.1)
- Updated dependencies to resolve security vulnerabilities (aws-cdk-lib, langchain, pydantic, urllib3, opensearch-py, boto3)
- Added multi-region support for MDAA module deployment
- Added deployment hooks functionality
- Enhanced lambda layers to be buildable for specific Python runtimes
- Added snapshot testing for packages and installer
- Improved ESLint configuration and code quality
- Added account-level module duplication checks
- Fixed various build issues and improved error handling
- Updated solution manifest and installer stack template
- Added python unit test framework
- Added validation of service names to ensure conformance with regex requirements

### Security Changes

- Fixed KMS ENCRYPT_ACTIONS to remove unnecessary wildcards
- Ensured DataZone policies follow least privilege principles
- Added Bedrock Guardrail for PII removal

### Governance Changes

- Enhanced DataZone module with domain units support and version regression fixes
- Improved SageMaker Catalog module compatibility with DataZone changes
- Added support for cross-account lambda invocation samples
- Added verbatim feature to role names

### Data Science/AI/ML Changes

- Added GenAI Accelerator v2 as a sample package
- Added Health Data Accelerator (HDA) as a sample package
- Enhanced Bedrock Builder module with Knowledge Bases and Guardrails support
- Added functionality for resyncing knowledge bases based on S3 sources
- Extended DataSource parsing strategies and chunking configuration
- Added Aurora Serverless Vector DB sizing parameters
- Fixed Bedrock region configuration and resource dependencies

### DataOps Changes

- Added support for Scala Glue ETL jobs
- Added continuous log groups for Glue jobs
- Added new DynamoDB app module
- Fixed DMS module bugs and improved module ordering
- Added option to override scope within DataOps Lambda L3 construct
- Improved Iceberg-compliant catalog database names handling
- Fixed role reference cascading updates to dependent resources
- Allow user to request creation of necessary service roles for DMS

## [1.0.0] - 2025-04-24

### General Changes

- Initial General Availability (GA) release

