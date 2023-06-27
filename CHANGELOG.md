# Changelog

## 0.38.0

### Analytics Changes

* Added IP Address Restrictions to QuickSight Account module
* Added VPC Connection provisioning to QuickSight Account module

## 0.37.0

### General Changes

* Upgraded CDK to 2.85.0
* Upgraded CDK Nag to 2.27.35
* Removed unneeded dependency on aws-sdk in QuickSight module causing NPM vulnerability warning
* Added AWS Solutions SAST and Publishing Checks to CI/CD
  * Standardized licensing headers on all source files
  * Updated CONTRIBUTING, CODE_OF_CONDUCT, and NOTICE documentation
  * Added standard CDK metrics collection info to README

### Utility Changes

* Modified EC2 instance construct to enforce Instance Metadata Service v2 (Required by latest CDK Nag NIST/HIPPA Rulesets)
* Added CfnInit capability to EC2 Module
* Config references will now be resolved in Ec2 Userdata

### Data Science Changes

* Modified Studio Lifecycle Config names to use contents hash, resulting in content changes producing a new Lifecycle Config
  * The old Lifecycle Config will be deleted only if not currently in use (enforced by SageMaker API)
  * Allows modifications to Lifecycle Configs without deleting all active Apps/Containers
* Studio Lifecycle Config contents are now Base64 encoded on the Cfn side, after all references/tokens have been resolved
  * This allows references to be used within Lifecycle Config script contents
* Fixed issue where Studio Domain update could silently fail
* Added Lifecycle Config Assets to SageMaker Notebooks
* Aligned Lifecycle Config syntax between Studio and Notebooks

## 0.36.0

### General Changes

* Modified code-base for portability across multiple (non-commercial) AWS Partitions
  * Partition is dynamically determined by destination region
  * Partition literal value will now be added to all resources, replacing partition references where they exist
* Modified CAEF L2 S3 Bucket Construct to ensure Bucket Policy is retained upon stack deletion
* Added '-o' flag to CAEF Cli, which will force each CAEF module to write its effective config to console after effective config is computed
  * Config contents will have been merged across all config files and config objects
  * All config references will have have been resolved
  * CloudFormation Tokens may still be present in effective config, as these are resolved at deployment time by the CloudFormation Service

### Documentation Changes

* Added sample config/architecture for complex Data Lake w/Fine Grained Access Control (via LakeFormation)
* Added sample config/architecture for Data Science platform
* General sample config/architecture and documentation cleanup and standardization across the code base
* Improvements to generated Mkdocs

### Data Science Changes

* Streamlined SageMaker Job permissions in Data Science Team managed policies
* Resolved bug with Data Science Team Athena WG managed policy name when not using verbatim policy names
* Created SageMaker Studio (and Data Science Team) LifeCycle Asset functionality
  * Allows staging of assets co-located with CAEF config to be staged in Domain/Team bucket and copied into SageMaker Studio App containers for inclusion in Lifecycle Configs
* Modified Data Science Team Athena WG to use the team bucket for Athena results (instead of a separate bucket)

### Data Ops Changes

* Resolved bug with dropped failure notifications for DataOps modules to SNS due to missing policy stagement
* Exposed additional function parameters for timeout, environment, memory/storage size in DataOps Lambda function properties
  * These were previously only available under "additionalFuctionProps"
  * "additionalFuctionProps" has been removed

### Utility Changes

* Added Machine to Machine API (m2m-api) module to facilitate Data Lake interactions via API Gateway and S3 Presigned URLs
  * Currently supports an upload API to facilitate uploads of data to the data lake from external entities
  * Authorization is provided by Cognito App Integrations

## 0.35.0

### Documentation Changes

* CAEF now uses mkdocs to produce static HTML documentation pages
  * This documentation is a direct rendering of the markdown documentation already in the repo, including CAEF overview, sample architectures/configs, detailed module descriptions, compliance information, and configuration options
  * Documentation is pre-rendered to HTML, and is navigatable and searchable
  * Documentation zip package includes documentation for both current and previous CAEF versions (currently back to 0.32)
    * Version can be selected from the top bar of the page
    * Latest version is selected by default
  * Can either be hosted on any static webserver, or accessed locally from filesystem

### Data Science Changes

* Data Science Team SageMaker policy permission updates for Feature Groups, Endpoints, CloudWatch logs and Tags
* Split Data Science Team sm-write policy into 2 in order to stay within policy size limits

### Analytics Changes

* Modified QuickSight Namespace project to retain email address of users moved from default to specific namespace

### Data Ops Changes

* Modified Data Ops Project security groups to add a self-referencing rule (required to be used with Glue Connections)
* Modified Data Ops Job failure notifications to include "TIMEOUT" and "STOPPED" states in addition to "FAILED"
* Improved integration between DataOps project and Lakeformation, fixing a race condition in cross account resource link grants.

## 0.34.0

### Data Science Changes

* Resolve SageMaker Studio Domain Update issue when removing/updating Lifecycle Configs

### Data Ops Changes

* Update DataOps Project LF Grants to accept list of tables
* Update DataOps S3 EventBridge config to accept multiple bucket names and multiple prefixes

### Utility Changes

* Introduced EC2 KeyPair creation to EC2 module. These KeyPairs can be bound to created Instances, with their private key material stored in a Secret
  * The previous "keyName" config parameter has been changed to "existingKeyPairName", in order to specify an existing Key Pair on an instance
* Modifid EC2 KMS Key behaviour. The same key is now used to encrypt multiple instances in a deployment. Custom existing keys can still be specified per instance.
* Added required adminRoles config parameter to EC2 module. These roles will be granted access to the KMS keys and KeyPair/Secrets created by the module
* Added Custom Resource to Ec2 L2 Construct which ensures all Instance volumes are encrypted with the proper KMS key.
  * This protects against scenarios where an unencrypted AMI deploys unencrypted volumes not managed via the config.
  * AMI volumes can be forced to be encrypted by accounting for each (by device name) in Instance config

## 0.33.0

### Utility Changes

* Added EventBridge L2/L3 Constructs and App allowing custom EventBuses to be created
* Modified shared Boto3 layer (under QuickSight Account and LakeFormation Settings) to use zip packaging
* Re-implemented CAEF Custom Resource Construct in order to avoid IAM race condition in AWSCustomResource
  * Currently in use by SageMaker Studio Domain/Data Science Team apps

### DataOps Changes

* Added DLQ for all DataOps Lambda Functions, with configurable retry parameters
* Added optional vpcConfig to DataOps Lambda Functions
* Tightened permissions for service access (EventBridge, CloudWatch Logs) to DataOps Project KMS key
* Refactored DataOps Lambda and DataOps Workflow integration with EventBridge
  * Moved s3EventBridgeRules under 'eventBridge' config object
  * Added ability to configure EventBridge to Target retry parameters
  * Removed previously hardcoded default retry parameters, now defaulting to underlying CDK defaults
* Added ability to define generic EventBridge rules in DataOps Lambda and Workflow
* Added EventBridge integration to DataOps StepFunctions
* Refactored DataOps StepFunctions to use L2 Constructs
* Allow DataOps Lambda to use an existing Security Group when VPC bound
* Added ability for DataOps project to create a security group for use across DataOps resources such as Lambda functions and Glue connections
* Added ability to create and use Lambda layers in DataOps Lambda
* Fixed missing DataAdmin usage permissions on Data Lake KMS Key

### Analytics Changes

* Added configurable RedShift cluster event notifications (software updates, cluster activies, scheduled actions) to SNS topic + email subscriptions
* Added configurable OpenSearch cluster event notifications (software updates, cluster activies) to SNS topic + email subscriptions
* Fixed missing DataAdmin usage permissions on Warehouse KMS Key

### Data Lake Changes

* Forced LF Access Control Grants to deploy in sequence (using dependsOn) to avoid hitting LakeFormation rate limits
  * Also impacts DataOps project LF grants
* Fixed missing DataAdmin usage permissions on Dataops Project KMS Key

### Data Science Changes

* Adjust Data Science Team SageMaker permissions

## 0.32.0

### General Changes

* Optimized installation of NPM packages during CAEF execution, reducing duplication of installs across multiple modules using same versions
* Added ability to filter for multiple domains/envs/modules via the -d/e/m flags by specifying comma separated values
* Added ability to specify custom naming and aspect modules per domain/env/module
* Added ability to reference environment variables within configs using {{env_var:<SOME_ENV_VAR_NAME>}} syntax
* Cleaned up stdout/logging from CAEF CLI
* Moved cdk.out directory under the CAEF working direction (default .caef_working/)
* Added ability for CAEF to use a locally-installed aws-cdk package
  * If a local install is available (in the local directory), it will be used.
  * Otherwise a global install will be used
* Added ability for CAEF modules to generate resources via stacks deployed to multiple accounts in addition to primary deployment account
  * Used to support cross-account deployments of resources in support of cross account LakeFormation grants
  * Additional accounts must be specified on a per-module basis using 'additional_accounts' config

### Analytics Changes

* Resolved packaging issue with Quicksight L2 constructs
* Tighted permissions for Quicksight Namespace user creation lambda
* Made startTime/endTime optional for DataWarehouse scheduled actions
* Added masterArn to DataWarehouse user secret contents for rotation purposes

### DataLake/DataOps Changes

* Added functionality to streamline LakeFormation cross account grants
* Both LakeFormation Access Control and DataOps Project modules can now:
  * Create LF grants for cross-account principals
  * Create Resource Links in cross accounts pointing at Glue Database resources in local account
  * Grant access to Resource Links in cross accounts for cross account principals
* DataOps Project provides a streamlined config syntax to quickly grant database-level access for Project-managed Glue databases
* LF Access Control allows for more complex configuration scenarioes

### Data Science Changes

* Refactored and refined Data Science team permissions
  * (Re)introduced a separate guardrails policy
  * Introduced a team policy for access to non-SageMaker team resources

### Utility Changes

* Fixed issue with Self-Referencing ingress/egress rule in EC2 Security Group

## 0.31.0

### General Changes

* Global refactoring of Security Group code to use a common L2 construct, providing more consistent configuration syntax and behaviour across the code base
* New general security group features:
  * Added general ability to reference prefix lists in Security Group ingress/egress rules across multiple modules
  * Added support for all protocols, port ranges across multiple modules
* Updated sample configs for compatibility with latest code

### Analytics Changes

* Merged in a preview of the OpenSearch module
* Merged in a preview of the QuickSight Account module
* Merged in a preview of the QuickSight Namespaces module
* Merged in a preview of the QuickSight Project module
* Removed auditLoggingSourceAccount from DataWarehouse module config schema

### Data Science Changes

* Added LifeCycle configs to Studio Domain/Data Science Team
* Streamlined policy definitions between Studio Domain/Data Science Team

### Utility Changes

* Merged in preview of the DataSync module
* Added OsType prop to EC2 module
* Added direct configuration of AMI ID to EC2 Module
* Added EC2 Security Group L2 Construct for reuse across the codebase

### Development Changes

* Improved test coverage across codebase

## 0.30.0

### General Changes

* Introduced 'immutable' flag on all config role references. This flag is used in Constructs to determine if a role permissions can be updated or not (IE if it's an SSO role)
* Modified config transformer to apply transformation to config keys in some situations
  * This allows references to be made in config keys which are used for resource names, etc
* Moved Service Catalog Product config from module section of caef.yaml into the module/app config itself 
* Moved Nag Suppressions By Path config from module section of caef.yaml into the module/app config itself 
* Resolved issue with nested references in config (IE ssm:/{{org}}/some/path)

### Data Science Changes

* Modified Data Science Team app and constructs to expect an externally-provisioned Team Execution Role (typically provisioned by roles module). This further consolidates role/permissions definitions into the Roles module.
* Changed 'dataScientistRoles' to 'teamUserRoles' in Data Science Team config 
* Modified Data Science Team module to leverage new 'immutable' flag on role references
* Introduced 'verbatimPolicyNamePrefix' to Data Science Team allowing the naming for policy names to overridden when necessary
* Implemented SageMaker Notebook Lifecycle configurations to allow Notebook instance customization on creation or startup

### Data Lake Changes

* Removed 'resultsBucketOnlyRoles' config from Athena Workgroup module (replaced by using immutable flag on athenaUsersRoles)
* Modified Athena Workgroup module to leverage new 'immutable' flag on role references
* Introduced 'verbatimPolicyNamePrefix' to Athena Workgroup allowing the naming for policy names to overridden when necessary
* Modified LakeFormation Settings module to set cross account grants version to '3'

### Data Ops Changes

* Fixed DataBrew default stage configuration to ensure it deploys after DataOps Project (on which it often depends)

### Development Changes

* Added NX build/test caching to repo in order to optimize subsequent lerna run build/test executions
* Added Boto3 Lambda Layer contstruct to L2 Lambda package, to provide a reusable layer containing the latest Boto3 version


## 0.29.0

* Modified Data Science Team module to allow provisioning of per-team SageMaker Studio Domains
* Modified Studio Domain construct to set ExecutionRoleIdentityConfig to USER_PROFILE_NAME, improving auditability of user interactions with AWS services from within SageMaker Studio
* Added ability to add additional Role Trust Policy actions to role definitions in Roles module
* Added keypair to EC2 Module
* Modified CAEF repo to use NPM Workspaces
* Removed execution role definitions from DataWarehouse module. These should instead be defined in the Roles module, and referenced by DataWarehouse module
* Added CloudWatch LogGroup L2 Construct

## 0.28.0

* Added configuration for StepFunction Log Group Retention
* Removed logic granting SSM Param access to roles granted access to Redshift user secrets
* Standardized App config parser class names
* Various bug fixes related to config parsing and reference resolution

## 0.27.0

* Added DataOps StepFunctions app and constructs
* Updated CDK version to current latest 2.54.0
* Added ability to grant roles access to Secrets generated for Redshift credentials
* Standardized naming of L3 Construct Props
* Modified DataBrew package names to match convention

## 0.26.0

* Fix issues with bootstrap behaviour

## 0.25.0

* Added ServiceCatalog integration, allowing any CAEF module to be optionally deployed as a Service Catalog Product instead of directly into account
* Added QuickSight Shared Folders and Permissions module
* Extended QuickSight Accounts module to create QS Account Sub via Custom Resource
* Extended QuickSight NameSpaces modules to automatically add Namespace users to predefined groups
* Added Preview EC2 Module and Constructs
* Added Preview Glue DataBrew Module and Constructs, supporting creation of Recipes and Jobs
* Added bytesScannedCutoffPerQuery config to Athena Workgroups
* Allow IAM roles generated by Roles module to specify Assume Role Trust policy to a specific Arn
* Allow IAM roles generated by Roles module to specify Assume Role Trust policy conditions
* Allow existing KMS key to optionally be specified for SageMaker Notebook encryption (otherwise one will continue to be generated)
* Allow custom_aspects to be specified at all levels of the CAEF config, allowing for custom_aspects to be applied globally, per domain, per env, and per module
* Refactoring to cleanup boilerplate code for CAEF apps and Constructs
* Added -u parameter to CAEF CLI to allow specifying the CAEF module version ('caef_version' in config files) on the command line
* Continued improvements to test coverage (now globally over 78% lines covered)

## 0.24.0

* Modified roles module to allow existing customer managed policies to be added (by name) to generated roles
* Modified roles module to allow policies to be generated with verbatim names (required for SSO permission set integration)
* Fixed bug in Dataops Project when multiple databases with LF grants were configured

## 0.23.0

* Added SageMaker Notebook L2/L3 Constructs and App/Module
* Added SageMaker Studio Custom SecurityGroup Ingress/Egress
* Added S3 LifeCycle configurations to DataLake module
* DataOps Project now optionally creates Lake Formation grants for project databases
* LakeFormation Access now uses newer CfnPrincipalPermissions L1 construct instead of CfnPermissions
* QuickSight Namespace module now adds namespace users to a number of predefined groups for ease of permissions management
* Modified CAEF CLI to now use './.caef_working' as a temporary working directory instead of './npm'
  * Configurable via the -w flag
  * Also added -x flag which will automatically wipe any previously installed packages from this directory
* Refactored Stacks into L3 Constructs in preparation for Service Catalog Integration
  * Added {{param}} config reference, which will create a CFN Param under the hood (for Service Catalog deployments)
* Switched SSM config references to use non-versioned CDK SSM Params instead of dynamic references
  * This should resolve the "last modified date does not match with the last modified date of the retrieved parameters" errors
* Various Data Science Team bug fixes
* Fixed issue with multiNode logic in Warehouse module (was always multiNode true)
* Fixed issue when specifying semantic versioning of custom naming module
* Fixed issue with ssm: actions being interpreted as SSM config references in PolicyDocument statement actions
* Moved configuration samples into ./samples/configuration location in repo
* Incorporated SonarQube into CI/CD process, resulting in improved test coverage and code quality

## 0.22.0

* DataOps Projects now create an SNS topic to which all jobs and crawlers will send failure notifications.
  * SNS topic can currently be configured with email address subscribers
* Modified config schemas to make more use of named objects vs arrays, to provide better config merging behaviour
  * Affected configurations are:
    * DataLake
    * Roles
    * Data Warehouse
    * SFTP Users
  * README sample configs have been updated for all affected modules.

## 0.21.0

* Glue workflows now sets StartOnCreation property to 'true' automatically if the Trigger State=ACTIVATED

## 0.20.0

* Resolved ConcurrentModificationException when many triggers add to the same workflow
* 'caef destroy' will now attempt to destroy stacks in reverse order of creation.

## 0.19.0

* Added warehouseBucketUserRoles to Warehouse App to allow non-admin access to Warehouse bucket to be granted
* Moved job and crawler monitoring event bridge rules to job and crawler apps (from Workflow app)
  * An EventBridge rule will now be created per job/crawler

## 0.18.0

* Modify DataWarehouse to not create secret rotation if rotationDays is 0
  * Note that this triggers a CDK Nag which needs to be suppressed (see below)
* Add nag_suppressions config to modules in caef.yaml
  * Suppressions currently supported by path, which should be available in Nag error message
* Add app_config_data and tag_config_data to caef.yaml, allowing for tags and Caef module/CDK App config object data to be directly specified in CAEF
* Refactored/Renamed CAEF App Configs to use ConfigParser terminology, in preparation for larger future refactoring
* Fixed issue with DataOps Workflow and Scheduled Triggers
* Refactored and cleaned up code smells from SonarQube
* Added ability to configure Redshift snapshot retention period

## 0.17.0

* Resolve deployment role naming issue with DataOps Project

## 0.16.0

* Added global/domain/module caef_version configuration param to allow CAEF version to specified at various locations in the CAEF config
* Removed the CAEF version from the caef_cdk_app tag to reduce CDK diff churn during CAEF upgrades/deployments
* Fixed issue where CDK Custom Providers (LF, QuickSight, etc) would produce function names > 64 chars
* Fixed issue where multiple federations in a Data Warehouse config would create a naming conflict
* Region and Account can now be referenced in CAEF configs as '{{region}}' and '{{account}}'. These will automatically be replaced at Synth time
* Improved Dynamic Reference docs
* Added custom CDK aspects to CAEF configuration. These are dynamically injected at CAEF execution time similar to custom naming implementations.

## 0.15.0

* Replace 'Ecosystem' with 'Environment' across CAEF codebase.

## 0.14.0

* Fix dependency issue between LF Locations and LF Grants in DataLake Stack
* Modify DataWarehouse to generate scheduled action starttime in future if required
* Modify DataLake to always add bucket allow statement even if DefaultDeny is false
* Modify DataLake to accept defaultDeny configuration per bucket instead of per access policy

## 0.13.0

* Added LF Data Location grants to Data Lake Stack, based on configured Lake Formation Resource Locations. Specified roles will be granted access to create catalog resources in the specified location.
* Added RedShift user and secret creation to DataWarehouse App/Stack, allowing for non-admin users to be managed by CAEF configuration. A secret will be created containing the credentials for each user, with configurable rotation.
* Added -h (help) flag to CAEF cli, which will print available cli flags and exit
* Added -r (role) flag to CAEF cli, which will pass the specified role arn to the -r flag of the underlying CDK command. This allows deployment to be conducted using non-default roles.

## 0.12.0

* Lock CDK version (currently 2.29.0)
  * Resolves compatability issue introduced by <https://github.com/aws/aws-cdk/pull/20911>
* Added public IP support to SFTP Server
* Added Data Science Team App and Stack

## 0.11.0

Dependency cleanup

## 0.10.0

### Configuration Changes

* Support for specification of additional context values in caef.yaml at the org, domain, env, or module level.
* Context values from caef.yaml can be referenced in individual CAEF module/app configs:
  * {{org}} - resolves to the org name
  * {{domain}} - resolves to the domain name
  * {{env}} - resolves to the env name
  * {{module_name}} - resolves to the module name
  * {{context:< some context key >}} - resolves to the additional context value in caef.yaml
* CFN dynamic references are mostly supported in CAEF module/app configs:
  * {{resolve:< service >:< some key >}} - is passed through to the CloudFormation template. This allows referencing things like secrets ,etc, in CAEF configs without storing the secrets in the config itself.
  * Example: {{resolve:ssm:< some ssm path >}}
* Both context and CFN dynamic references can be referenced inline in config values, and should always be quoted:
  * some-config-key: “{{context:some-context-key}}”
  * some-config-key: “somestring-{{context:some-context-key}}-somemorestring”

### Compliance Changes

* CAEF now automatically applies the HIPAA CDK Nag Ruleset
  * This is in addition to the existing NIST 800-53 R5 and AWS Solution Rulesets
  * CDK Nag executes automatically as part of any caef synth, diff, deploy command and will halt deployment if security issues are encountered.
* Fixed CDK Nag Aws-Solutions-L1 (Lambda runtime) for CAEF custom resources
* Pinned CDK Nag to current latest version to prevent unexpected nags due to new rules in the future

### Functional Changes

* Lake Formation Settings app added to manage LF admins and default permissions for databases/tables
* Default CAEF tags now added to all resources with org/domain/env/module_name and cdk app/version

### Extensibility Changes

* CAEF config-driven apps were separated from their CDK stacks, allowing for reusability of CAEF stacks in custom applications
  * All stacks are JSII compliant and include Python bindings.
  * Stacks are now in separate packages with a ‘-stack’ suffix
  * There is now a clear separation between CAEF app config concepts and stacks, which are Props-driven in alignment with the rest of the CDK codebase

* Added JSII-produced cross language bindings (currently for Python) for all CAEF reusable constructs and stacks
  * PIP packages are automatically published to CodeArtifact for prerelease (CAEF Dev) and releases (CAEF Delivery)
  * Updated README with more info on how to Build On/Extend CAEF

### Structural Changes

* The CAEF deploy package (formerly @aws-caef/caef-deploy) has been renamed to ‘@aws-caef/cli’
  * This better aligns with conventions used in similar AWS codebases
  * You’ll want to uninstall ‘@aws-caef/caef-deploy’, then install ‘@aws-caef/cli’

* The repo structure has been slightly reorganized, but CAEF App packages names all remain the same
* More Stack/App refactoring to fix an issue with using cross stack references
