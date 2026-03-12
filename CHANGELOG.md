# Change Log

## [1.5.0] - 2026-03-13

### General Changes

- Fixed deployment failures in accounts with SCPs that deny `logs:DeleteRetentionPolicy` by preventing CDK's `LogRetention` custom resource from being created in stacks that use `MdaaLambdaFunction`

- SSM parameters can now be referenced using simplified scope prefixes:
  - `ssm-org:<path>` resolves to `ssm:/{{org}}/<path>`
  - `ssm-domain:<path>` resolves to `ssm:/{{org}}/{{domain}}/<path>`
  - `ssm-env:<path>` resolves to `ssm:/{{org}}/{{domain}}/{{env}}/<path>`
- SSM parameters created by SageMaker Unified Studio blueprints can be referenced using `blueprint:` prefix in configuration values
- sample configurations that help users to quickly get started are in [starter_kits](starter_kits) while the examples are now on [AWS Samples](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator)
- Users can now provide variables placeholders in the predeploy and postdeploy hook commands
- CLI now validates `-d`, `-e`, and `-m` filter values upfront and errors if they don't match any configured domains, environments, or modules
- CLI now supports !include tag to reference external files in YAML configurations
- Simplified installer stack: removed user requirements for CodePipeline/S3 source and CodeStar ARN, and replaced `npm install` with running `mdaa` from npmjs.org.
- Added baseline diff support: new `--cdk-out`, `--baseline`, and `--diff-out` CLI flags enable comparing CloudFormation templates against stored baselines without requiring AWS deployment
- Improved config schema documentation
- BedrockKnowledgeBaseL3Construct creates fewer policies for corresponding MdaaRdsDataResources; it used to attach overly permissive policy with 11 statements to them, but now MdaaRdsDataResource manages its own policy statements internally -- only 3 required, as a result it also becomes self-sufficent and can be deployed independently;

### Governance Module Changes

#### Glue Catalog Settings Module

- Glue Catalog KMS key SSM parameters are now automatically shared to consumer accounts via AWS Resource Access Manager (RAM)
  - Useful for sharing KMS Key details with DataZone/SageMaker domain associated accounts

#### Lake Formation Settings Module

- Trusted accounts can now be specified for cross-account DataZone/SageMaker Unified Studio integration
  - Enables multi-account DataZone/SageMaker Unified Studio deployments with centralized Lake Formation management

#### DataZone Domain Module

- Glue Catalog KMS key ARN is now optional for associated account configuration
  - RAM Shared SSM param will be used by default
- Granular authorization policies can be defined for domain units

#### SageMaker Unified Studio Domain and Blueprints Module

- Glue Catalog KMS key ARN is now optional for associated accounts with automatic SSM parameter lookup
  - RAM Shared SSM param will be used by default
- Standard Tooling and LakeHouse (Glue Database) blueprints can be configured
  - Tooling blueprint configuration including VPC and subnet settings must be provided for the domain account and any associated accounts
  - Compliance-related paramaters overrides (VPC connectivity, KMS Encryption, role permissions) are automatically set within code
- Additional managed blueprints can be enabled
- Any MDAA Module can be configured to deploy as a custom SageMaker Unified Studio blueprint instead of directly deploying as a Stack
- Custom SageMaker Unified Studio blueprints can also be created from local CloudFormation templates or URLs
- Granular authorization policies can be defined for domain units

#### SageMaker Unified Studio Project Profiles and Projects Module

- New module enables creation of SageMaker Unified Studio projects and project profiles
- Project profiles define target accounts, deployable environments, and parameter values/overrides
  - Reusable environment templates can be defined for use by multiple project profiles
- Projects can be created and assigned to domain units
  - Project ownership and membership can be defined for users and groups
  - Existing Glue databases can be imported as data sources into SageMaker Unified Studio projects
  - Projects can be deployed either in the domain account, or in associated accounts using appropriate project profiles

### DataOps Module Changes

#### DataOps Project Module

- Glue Catalog KMS key configuration now automatically uses standard SSM parameter when not explicitly specified
- SageMaker Unified Studio projects can now be created integrated with DataOps projects
  - External Glue databases (not created by DataOps Project) can be imported as data sources into SageMaker Unified Studio projects
  - Glue Databases created by dataops project can be automatically created as SMUS/DataZone Data Sources
  - Project admin, data engineer, and execution roles can be added as members to the SMUS/DataZone project

### Opensearch Module Changes

- Users can now use SAML-based authentication system to enable enterprise-grade identity federation to Opensearch domain

### DataOps Modules

- All DataOps Modules can now be deployed independently without a DataOps Project
  - `projectName` config parameter has been made optional
  - Where project resources were automatically used when deployed with a DataOps Project, these resources can now be directly specified in module configs

### Utility Module Changes

#### SFTP Server Module

- Added optional `securityPolicyName` configuration for Transfer Family SFTP server, enabling deployment in regions that do not support FIPS security policies (e.g. eu-west-1). Defaults to `TransferSecurityPolicy-FIPS-2020-06` for backwards compatibility.

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
