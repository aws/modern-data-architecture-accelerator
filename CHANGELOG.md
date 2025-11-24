# Change Log

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
