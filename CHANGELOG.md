
# Change Log

## [NEXT_RELEASE_VERSION] - NEXT_RELEASE_DATE

### New Features

#### Bedrock Builder Module

- Added **AgentCore Harnesses** via a new top-level `harnesses` property: declarative, tool-using agents (model + system prompt + tools) deployed on AgentCore, each with always-on customer-managed KMS log encryption and PII masking, CUSTOM_JWT/AWS_IAM inbound authorization, and a least-privilege scoped execution role. Additive only — harnesses are created only when the property is set. See the [module README](packages/apps/ai/bedrock-builder-app/README.md) for an overview, sample configs, and the full config surface.

#### Data Lake Module

- Added `additionalBucketKmsKeyArns` and per-bucket `additionalKmsKeyArns` to let buckets accept objects encrypted with keys the module did not create, so Glue jobs can write into a data lake split across several Data Lake modules. Both are optional; existing configs are unchanged. See the [module README](packages/apps/datalake/datalake-app/README.md#trusting-additional-kms-keys).

### Bug Fixes

- Fixed `mdaa synth` failing when `account` and/or `region` are left as `default` and no AWS credentials are resolvable, which leaves them as unresolved CloudFormation pseudo-parameters that several code paths treated as literal strings: ECR container URI parsing, cross-account SSM lookup, resource name generation, and cdk-nag suppression matching.

### Removed

- **GAIA v1 removed** (fulfilling the removal target announced in 1.7.0): the `@aws-mdaa/gaia` and `@aws-mdaa/gaia-l3-construct` packages have been deleted. Deployments must use `@aws-mdaa/gaia-v2` and `@aws-mdaa/gaia-v2-l3-construct`, a re-architected GenAI backend that is **not** a drop-in replacement — there is no in-place upgrade. See [MIGRATION_TO_V2.md](packages/apps/ai/gaia-v2-app/MIGRATION_TO_V2.md) for the migration path. **Breaking change.**

## [1.8.1] - 2026-09-14

### New Features

#### Roles Module

- Added `webidentity:` trusted principal prefix enabling OIDC web identity federation for CI/CD providers (e.g. GitLab CI/CD, GitHub Actions). See the [roles-app README](packages/apps/governance/roles-app/README.md) for trust-policy details and required scoping conditions.

### Bug Fixes

- Fixed an eval injection vulnerability in the Health Data Accelerator (HDA) starter kit's AWS Glue jobs by safely parsing job parameters as JSON

- Fixed DataZone custom blueprint template staging being denied by the domain S3 bucket's SSE-KMS policy by encrypting the template copy with the domain KMS key

## [1.8.0] - 2026-08-28

### Changed

- **Terraform config now cascades child-over-parent** (`@aws-mdaa/cli`): when `terraform` keys are set at more than one level of the config hierarchy (global, domain, environment, module), the more specific level now wins. Previously the parent level won, which was inconsistent with every other cascaded field (`context`, `tag_config_data`, `custom_aspects`, `custom_naming`, `permissions_boundary_arn`). Projects that set the same `terraform.*` key — for example `terraform.override.*` — at both a parent and a child level will resolve to the opposite value than in 1.7.0, which can retarget Terraform state; re-check those configs before deploying.

### New Features

- **`mdaa init` CLI command** — scaffold new MDAA configuration projects from starter kits with interactive prompts, or enhance existing config directories with AI steering files, JSON schemas, and module documentation. Supports Kiro, Claude Code, and GitHub Copilot out of the box. Pins `mdaa_version` in the generated `mdaa.yaml` to ensure deploy uses the same version as the schemas.

- **`mdaa upgrade` CLI command** — upgrade `mdaa_version` in an existing project and refresh all `.mdaa/` assets (schemas, docs, steering). Old version directories are pruned automatically. Usage: `npx @aws-mdaa/cli@<new-version> upgrade`.

#### CLI

- **MDAA CLI - Windows Compatibility**: All shell commands are now generated using cross-platform utilities that emit the correct syntax for both POSIX and Windows (`cmd.exe`). Added `platform-utils.ts` module and cross-platform Node.js CLI entrypoints for Windows support.

#### HealthLake Module

- New `@aws-mdaa/healthlake` module: Amazon HealthLake FHIR R4 datastore with CMK encryption, least-privilege data-access IAM role, auto-derived Glue database metadata, optional Synthea preload, and optional SMART on FHIR authorization

#### Naming

- Added the `@mdaaIncludeEnvInSsmPath` opt-in flag, which enables deploying multiple MDAA environments to the same AWS account by including `env` in SSM parameter paths and CloudFormation export names. Defaults to `false`; enabling it on an existing deployment is **not backwards compatible** — see [packages/utilities/mdaa-naming/README.md](packages/utilities/mdaa-naming/README.md) for migration steps.

#### DataOps Project Module

- **S3 Lifecycle Policies** (`@aws-mdaa/dataops-project`, `@aws-mdaa/dataops-project-l3-construct`): Added optional `lifecycleConfiguration` to the dataops-project module, enabling S3 lifecycle rules on the project bucket for automated storage-class transitions, object expiration, incomplete-multipart upload cleanup, and noncurrent-version management. Each rule targets an optional key prefix (e.g. `temp/`, `athena-results/`, `data/`) so transient or cold data can be aged to cheaper storage independently. When omitted, the project bucket has no lifecycle rules (existing behavior preserved).
- **DataOps Project — Execution Role Permission Levels** (`@aws-mdaa/dataops-project`): `createReadWriteGrantsForProjectExecutionRoles` now accepts the case-sensitive permission-level strings `read`, `write`, and `super` in addition to boolean values. Boolean `true` remains equivalent to `write` and is fully backward compatible. The new `super` level grants ALTER and DROP on tables and DROP on the database, enabling ETL jobs that replace or recreate tables to run within infrastructure-as-code.

#### DataOps Job Module

- Added an optional `lineage` section (usable on jobs and templates) that emits OpenLineage events to an Amazon DataZone / SageMaker Unified Studio domain, mirroring the Glue console's "Generate lineage events" toggle. Requires Glue 5.0+ (enforced at synth). The module grants the job execution role the lineage permission it needs unless `lineage.manageExecutionRolePolicy` is `false` — see the [module README](packages/apps/dataops/dataops-job-app/README.md#datazone-data-lineage) for the grant details and prerequisites. Existing configurations are unaffected (backwards compatible).

#### DataOps Lambda Module

- Added an optional `queues` section creating CMK-encrypted standard or FIFO queues, each with a redrive dead letter queue. Functions consume a queue via `sqsEventSources` or produce to one via `queueUrlEnvironment`, and the queue permissions each direction needs are granted for you — see the [module README](packages/apps/dataops/dataops-lambda-app/README.md#sqs-queues-and-event-sources). Existing configurations are unaffected (backwards compatible).
- `sqsEventSources` and `queueUrlEnvironment` also appear on Bedrock Builder function definitions, which reuse this module's function config type. Bedrock Builder has no `queues` section, so leaving them unset is harmless, but setting either one fails synthesis with `references undefined queue "..." ... Available queues: none`.

#### DataOps MWAA Module

- New `@aws-mdaa/dataops-mwaa` module: Amazon Managed Workflows for Apache Airflow (MWAA) deployment with enterprise security — multiple named environments per module, KMS encryption (project or dedicated key), VPC isolation with a private web server by default, and execution roles created externally in the Roles module (as with Glue Jobs)
  - All Airflow component logging enabled at INFO minimum, with each component's log group pre-created with KMS encryption and two-year retention (configurable via `logRetentionDays`, `0` for infinite) instead of MWAA's never-expire default
  - Configurable scaling (workers, web servers, schedulers), Airflow config overrides, and maintenance window; per-environment access policy for web login and CLI
  - DataOps project integration via `projectName` for shared KMS key auto-wiring and Airflow artifacts under the project bucket's `airflow/<env-name>/` prefix

#### S3 Tables Module

- New `@aws-mdaa/s3-tables` module (with `@aws-mdaa/s3-tables-l3-construct` and `@aws-mdaa/s3-tables-constructs`): declaratively provisions Amazon S3 Tables (managed Apache Iceberg storage) following the MDAA `roles → accessPolicies → tableBuckets` configuration pattern.
  - **Table buckets, namespaces, and tables**: define Iceberg table buckets, namespaces, and tables via `tableBuckets`, with per-table `columns` (keyed map), `partitions` (identity/bucket/truncate/year/month/day/hour transforms), and `sortBy`.
  - **Encryption**: mandatory KMS encryption at rest — a dedicated customer-managed key is created per bucket, or an external key can be supplied via `kmsKeyArn`. Key usage is granted only to declared role IDs.
  - **Access control**: named `accessPolicies` map reader/writer/admin permission sets to logical roles, applied at bucket scope and optionally extended (additively) per table; table grants are additive and cannot narrow bucket access. Bucket policies are deny-by-default and every bucket and table policy enforces TLS.
  - **Maintenance**: optional per-bucket `maintenance` block for Iceberg compaction (`compaction.targetFileSizeMB`), snapshot management (`snapshots.minToKeep`, `snapshots.maxAgeHours`), and unreferenced file removal (`removeUnreferenced.afterDays`, `removeUnreferenced.keepNonCurrentDays`).
  - Resource ARNs and names are exported to SSM for cross-stack discovery. Ships with minimal and comprehensive sample configs, JSON schema validation, and documentation.

#### Data Lake Module

- **Cross-Account S3 Replication** (`@aws-mdaa/datalake`, `@aws-mdaa/datalake-l3-construct`, `@aws-mdaa/s3-constructs`): Added optional `replication` to each bucket, with independent default-off `outbound` and `inbound` blocks so MDAA can manage the sending side, the receiving side, or both. Omit `replication` for unchanged behavior. See the [module README](packages/apps/datalake/datalake-app/README.md#cross-account-replication) for the per-topology ownership boundaries.
  - `outbound.replicationRole` optionally references an existing role instead of MDAA creating one, which is what allows both ends of a pair to be MDAA data lakes: the receiving end must grant the role before the sending bucket is deployed, so the role cannot be one the sending stack creates. The role must be in the source bucket's account, checked at synth when the ARN is a literal. Replication permissions are attached to the role as a managed policy, so the same code path applies to a created and a referenced role.
  - At synth, a literal `destinationKmsKeyArn` is checked to be a key in `destinationAccount` and `destinationRegion`, and `inbound.sourceAccount` is required so a mistyped `sourceReplicationRoleArn` fails the build rather than granting an unintended account.
  - `outbound.deleteMarkerReplication` (default false, matching S3) controls whether a delete here also hides the object at the destination; the replication role is granted `s3:ReplicateDelete` only when it is enabled.
- **Data Lake Parameter Sharing** (`@aws-mdaa/datalake`, `@aws-mdaa/datalake-l3-construct`, `@aws-mdaa/s3-constructs`, `@aws-mdaa/kms-constructs`): Added optional module-level `shareParametersWithAccounts`, which RAM-shares the SSM parameters published by the data lake's KMS key and buckets with the listed accounts, so a deployment in another account can resolve identifiers it cannot know in advance - a KMS key ARN contains an AWS-generated key id, and bucket names are hash-truncated past 63 characters. Shared parameters move to the Advanced tier, which RAM requires and AWS bills; omitting the field leaves every parameter Standard-tier and unshared. Both accounts must be in the same region, since a parameter is resolved in the region of the stack reading it. `MdaaBucketProps` and `MdaaKmsKeyProps` gained an optional `tier`, so those constructs can publish their parameters in a chosen tier.

#### Roles Module

- **Cross-Account Role Parameter Sharing** (`@aws-mdaa/roles`, `@aws-mdaa/roles-l3-construct`): Added optional per-role `shareParametersWithAccounts`, which RAM-shares that role's generated-role ARN and id parameters with the listed accounts, so a deployment elsewhere can reference the role without reconstructing its name - which it cannot do reliably, since MDAA truncates a name at 64 characters with a hash. Shared parameters move to the Advanced tier, which RAM requires and AWS bills; roles without the field are unaffected. Sharing exposes the ARN and id only and grants no ability to assume the role. Reader and publisher must be in the same region.

#### Athena Workgroup Module

- **S3 Lifecycle Policies** (`@aws-mdaa/athena-workgroup`, `@aws-mdaa/athena-workgroup-l3-construct`): Added optional `lifecycleConfiguration` to the athena-workgroup module, enabling S3 lifecycle rules on the workgroup results bucket. Rules without an explicit prefix are automatically scoped to the `athena-results/` prefix; rules with an explicit prefix are applied as-is. When omitted, the results bucket has no lifecycle rules (existing behavior preserved).

#### Lake Formation Settings Module

- **S3 Tables Analytics Integration** (`@aws-mdaa/lakeformation-settings`): Added optional `s3TablesIntegration` to automate the S3 Tables "Enable integration" action, creating the `s3tablescatalog` Glue catalog so S3 table buckets are queryable from AWS analytics services (Athena, Redshift, EMR, QuickSight). Opt-in, idempotent, and left in place on stack delete unless `removeOnDelete: true`.

#### QuickSight Account Module

- **Scoped Resource-Access Policies** (`@aws-mdaa/quicksight-account`, `@aws-mdaa/quicksight-account-l3-construct`): Added optional `customerManagedPolicies` to `resourceAccessRolePermissions`, allowing existing customer-managed policies to be attached to the QuickSight resource-access role (`aws-quicksight-service-role-v0`) for scoped least-privilege grants. When omitted, only the configured AWS-managed policies are attached (existing behavior preserved).

#### Audit Trail Module

- **Non-S3 Data Events** (`@aws-mdaa/audit-trail`, `@aws-mdaa/audit-trail-l3-construct`): Added optional `dataEventSelectors` to each trail, capturing CloudTrail data events for any supported `resources.type` — `AWS::BedrockAgentCore::Runtime`, `AWS::Lambda::Function`, `AWS::DynamoDB::Table` — rather than S3 only. Each entry takes a required `resourceType` plus optional `resourceArns` (prefix-matched, to control cost) and `readWriteType`; CloudTrail allows one resource type per selector, so several types means several entries. This makes the trail prerequisite for the AgentCore Runtime module's `eventBridgeAlerts` expressible in config.
- **`dataEventSelectors` is mutually exclusive with `eventSelectors`** (`@aws-mdaa/audit-trail`): the two render CloudTrail's advanced and basic selector styles respectively, and a trail accepts only one style. Setting both now fails at synth; split them across separate trails. Also set `includeManagementEvents: true` when a trail carrying data selectors should still capture control plane calls such as `UpdateAgentRuntime` — advanced selectors replace a trail's defaults outright, so it otherwise captures none.

### Data Science/AI/ML Changes

#### Bedrock Builder Module

- Added AgentCore Gateway orchestration via new top-level `gateways` and `gatewayTargets` configuration properties: deploy compliant AgentCore Gateways (MCP servers) with Lambda tool targets and REQUEST/RESPONSE interceptors, reusing the shared `lambdaFunctions` pool via `generated-function:<name>` references. Upgrade impact: additive only — created only when the new properties are set; existing configurations are unaffected.

#### Bedrock AgentCore Gateway Constructs

- Added `@aws-mdaa/bedrock-agentcore-gateway-l3-construct`: an L3 construct that deploys a compliant AgentCore Gateway with always-on customer-managed KMS encryption, CUSTOM_JWT/AWS_IAM inbound authorization, scoped execution-role policies, and a CMK-encrypted audit-log-delivery pipeline.
- Added `MdaaAgentcoreGateway` and `MdaaAgentcoreGatewayTarget` L2 constructs (`@aws-mdaa/bedrock-constructs`) for the gateway and its tool targets (Lambda tool sources with inline or S3 tool schemas).

#### Bedrock AgentCore Runtime Module

- Added optional `authorizerConfiguration.customJwtAuthorizer.cognito` to have MDAA create the Cognito user pool and app client issuing the runtime's JWTs, composing the discovery URL and audience itself. Exactly one of `discoveryUrl` or `cognito` is now required; existing configurations are unaffected. Two defaults to know before deploying: **MFA is required**, so each user registers a TOTP authenticator before their first token, and the pool is **retained** when the stack is deleted. See the [module README](packages/apps/ai/bedrock-agentcore-runtime-app/README.md#inbound-authorization).
- Added optional `networkConfiguration.vpcEndpoint` to create the AgentCore interface VPC endpoint with Private DNS, an app-SG-scoped security group, and an invoke-only endpoint policy. Opt-in; required for `enforceVpcOnly` to be satisfiable. Also corrects the documented endpoint service name from `bedrock-agent-runtime` to `bedrock-agentcore`. See the [module README](packages/apps/ai/bedrock-agentcore-runtime-app/README.md#aws-service-endpoints).
- Added optional `alarms` configuration for CloudWatch alarms on the AgentCore error-rate and throttle-count metrics, notifying an existing or module-created CMK-encrypted SNS topic, with `notificationEmails` to subscribe operators. Opt-in. See the [module README](packages/apps/ai/bedrock-agentcore-runtime-app/README.md#cloudwatch-alarms).
- Added optional `eventBridgeAlerts` configuration for EventBridge rules alerting on AgentCore CloudTrail events (auth failures, out-of-band configuration changes), with optional customer-supplied remediation. Requires a trail logging the matched events. See the [module README](packages/apps/ai/bedrock-agentcore-runtime-app/README.md#eventbridge-alerting).
- Agent spans now route to the runtime's own log group instead of the account-shared `aws/spans` group, inheriting the module's CMK encryption, retention, and PII masking. Opt out with `UNIFIED_TRACES_DESTINATION_ENABLED: 'false'`. **Upgrade impact:** requires `aws-opentelemetry-distro>=0.18.0` in the container image, and creates a new runtime version on deploy. See the [module README](packages/apps/ai/bedrock-agentcore-runtime-app/README.md#observability--tracing).

### General Changes

- **Build and versioning consolidated onto nx; `lerna` removed.** Task orchestration now uses `nx run` / `nx run-many`, workspace enumeration uses `npm query`, and the release version bump uses `semver`. `lerna.json` is deleted — **`package.json` is now the single version source of truth**. Repoint any local tooling that read the version from `lerna.json`.

### Bug Fixes

- Standardized validation of CLI config fields, giving earlier and clearer errors for malformed values. Config values passed to the CDK and Terraform commands the CLI runs are now preserved intact, so values containing spaces, quotes, or other special characters (including Terraform `-var` values, which were previously corrupted) reach those commands unchanged.
- Fixed `enforceVpcOnly` not restricting same-account SigV4 callers (1.7.0 regression): the `Allow`-only resource policy could not deny an IAM caller its identity policy already authorized, so out-of-VPC SigV4 invocation succeeded (JWT/OAuth callers were correctly blocked). The policy now adds explicit `DenyWrongVpc`/`DenyNoVpc` statements and covers all invoke variants via `bedrock-agentcore:InvokeAgentRuntime*`. Breaking change: out-of-VPC IAM invocations that previously succeeded are now denied.
- Fixed the MDAA CLI's local deploy build so it no longer triggers nx's interactive "Install Nx Console?" editor-extension prompt. When a module is built from a local checkout (e.g. via `bin/mdaa`), the build now runs with the nx daemon disabled, which suppresses the prompt without affecting build output.
- Fixed release-packaging enumerating workspaces from the installed `node_modules` tree instead of the committed lockfile, which could silently omit newly added packages from `npm pack` (and therefore from a release) when the packaging job's restored cache predated them. Enumeration now reads the lockfile and the job fails if it resolves no workspaces or produces no tarballs.
- Fixed the release version bump silently falling back to a patch increment when `VERSION_BUMP_LEVEL` was not one of `major`/`minor`/`patch`. Invalid values are now rejected, and a prerelease build additionally asserts the computed version carries the requested `-alpha`/`-beta`/`-rc` identifier.
- Fixed `installer/package-lock.json` not being version-bumped by the release scripts. The installer is a standalone package outside the npm workspace graph, so its lockfile was never updated alongside `installer/package.json` and the two drifted permanently out of sync. The bump now sets the version absolutely rather than pattern-matching the previous one, so it cannot rewrite an unrelated dependency pinned at the same version number.
- Fixed the release version bump silently skipping any package whose version had already drifted, leaving it stuck permanently. The bump now verifies every workspace package and the installer reached the new version, and fails the release if any did not.
- Fixed AWS Glue jobs created by `@aws-mdaa/dataops-job` not appearing in Amazon SageMaker Unified Studio (SMUS). SMUS associates a Glue job with its project via the `AmazonDataZoneProject` resource tag, which the module never applied. `@aws-mdaa/dataops-job` now applies that tag when the new opt-in `applySagemakerProjectTag` flag is set to `true` — so with `applySagemakerProjectTag: true`, jobs created by `dataops-job` show up in SageMaker Unified Studio under **Data analytics → Data processing jobs**. (`@aws-mdaa/dataops-project` publishes the DataZone project ID to SSM to support this.)

## [1.7.0] - 2026-07-16

### New Starter Kits

- **GenAI GAIA Chatbot** — RAG chatbot backend with document search, auth, and streaming API
- **Lakehouse Analytics** — End-to-end lakehouse spanning data lake, governance, dataops, and consumption (Athena + Redshift QuickSight data sources) with sample ETL/crawler dataops and a full deploy walkthrough
- **Minimal** — Starting point for custom configurations with base governance
- **MLOps Platform** — Automated train → deploy → monitor pipeline for ML models

### Starter Kit Changes

- Renamed `genai_accelerator` → `genai_foundation`
- Renamed `governed_lakehouse` → `datazone_governed_lakehouse`
- Standardized READMEs across all starter kits
- Removed top-level `sample_blueprints/` and `sample_configs/` directories. Equivalent examples are available in the [external sample configurations repository](https://github.com/aws-samples/sample-config-modern-data-architecture-accelerator).
- Renamed `sample_code/` → `sample_customizations/`

### New Features

#### DataOps Aurora Module

- New `@aws-mdaa/dataops-aurora` module: Aurora Serverless v2 cluster deployment with enterprise security
  - Supports multiple named PostgreSQL clusters per module (MySQL planned)
  - Config schema with top-level `postgresql` category object and named cluster maps
  - KMS encryption (project key or dedicated shared key), VPC isolation, enhanced monitoring
  - IAM database authentication, CloudWatch log exports, automatic admin password rotation
  - Per-cluster access managed policy with `rds-db:connect`, `rds:Describe*`, and Secrets Manager access
  - Top-level `dataAdminRoles` for cross-cluster admin access, per-cluster `clusterAccessRoles`

### DataOps Module Changes

#### DataOps Job Module

- Expanded the supported `workerType` values beyond `Standard`, `G.1X`, and `G.2X` to include the larger general-purpose G family (`G.4X`, `G.8X`, `G.12X`, `G.16X`) and the memory-optimized R family (`R.1X`, `R.2X`, `R.4X`, `R.8X`) for demanding and memory-intensive ETL workloads. Existing configurations are unaffected (backwards compatible). Note: `G.12X`, `G.16X`, and all R types require a compatible Glue version and regional availability; incompatible combinations surface as CloudFormation deploy-time errors rather than at synth.

### Data Science/AI/ML Changes

#### Bedrock AgentCore Runtime Module

- Fixed `GetAgentAccessToken` IAM statement to use `workload-identity/*` instead of the `hosted_agent_*` prefix so the runtime can resolve its own workload identity (name is derived from `AgentRuntimeName`)
- Added optional `allowedModelArns` configuration parameter to scope execution role Bedrock model invocation permissions to specific model ARNs for least-privilege access
- Added optional `enforceVpcOnly` configuration to restrict JWT/OAuth callers to VPC-only invocation via an auto-generated resource-based policy
- Added optional `networkConfiguration.vpcId` field (required when `enforceVpcOnly` is true) to identify the VPC for the resource policy condition
- Added new `@aws-mdaa/agentcore-shared` package for shared AgentCore construct utilities (reusable by future Gateway module)
- Added built-in log data protection: customer-managed KMS encryption and CloudWatch Data Protection PII masking are now always applied to the service-created runtime log groups on every deployment. A built-in comprehensive set of PII identifiers (email addresses, credit card numbers, SSNs, names, addresses, US phone numbers, IP addresses) is always masked. Upgrade impact: existing deployments will gain a new KMS key, a Data Protection policy, and a log-protection custom resource on next deploy.
- Added optional `dataProtection.additionalIdentifiers` configuration to mask additional AWS-managed data identifiers on top of the built-in set. This field is additive only and cannot reduce the built-in masking baseline. Breaking change: replaces the previous `dataProtection.enabled`/`dataProtection.identifiers` configuration — protection is no longer opt-in and the identifier list can no longer be narrowed. Existing configs using the old keys will be silently ignored; remove them to avoid confusion.
- Added optional `logRetentionDays` configuration to set CloudWatch Logs retention on the runtime log groups (defaults to 30 days)
- Migrated to typed `CfnRuntime`/`CfnRuntimeEndpoint` constructs for compile-time validation of property names/shapes. Logical IDs unchanged. Upgrade impact: existing runtimes will gain standard MDAA stack tags on next deploy — in-place tag update with no resource replacement.

#### Bedrock Builder Module

- Added SSM parameters and CloudFormation outputs identifying deployed resource IDs, making them discoverable for downstream consumers: Bedrock Agent (id, ARN, alias id), Aurora PgVector vector store (cluster endpoint and secret name), OpenSearch Serverless collection (id, ARN), and the OpenSearch Serverless VPC endpoints. Upgrade impact: additive only — new SSM parameters and stack outputs appear on the next deploy; no existing resources are modified.

#### RDS Constructs

- `MdaaAuroraPgVector`: the default engine version is now `16.13`, as `16.6` has reached the end of support.

### Data Analytics Changes

#### QuickSight Namespace Module

- Added an optional `enableEmailSyncing` flag (default `false`) to each federation configuration. When enabled, the SAML federation role trust policy also grants `sts:TagSession`, scoped by conditions to only the `Email` session tag. This enables QuickSight email syncing for federated users.

#### QuickSight Account and Project Modules

- Added optional `resourceAccessRolePermissions` to grant the QuickSight resource-access role (`aws-quicksight-service-role-v0`) the AWS-managed policies and S3/KMS access its data sources need; the `quicksight-account` module owns the role while `quicksight-project` attaches data-source-specific grants.
- Added optional `secretsManager` authentication for data sources in the `quicksight-project` module.

### Governance Module Changes

#### Audit Trail Module

- Added optional `eventSelectors` configuration to scope CloudTrail S3 data event capture to specific buckets and key prefixes instead of logging all S3 data events account-wide. Each selector accepts a `bucketName` (or SSM parameter reference) and an optional `objectPrefix`. When omitted, the existing behavior (capture all S3 data events) is preserved.
- Added a new `trails` configuration property accepting a map of named trail configurations. Each key becomes the trail's resource name segment, enabling multiple independent trails with separate S3 destinations, KMS keys, and event selectors in a single deployment. The existing `trail` property is now deprecated — migrate to `trails` with a key of `'s3-audit'` for equivalent behavior. Both properties can coexist during migration.

### Utility Module Changes

#### EC2 Module

- Added optional `rules` configuration to authorize additional ingress/egress rules on pre-existing (externally-owned) security groups referenced by id (supports `ssm:` references). Unlike `securityGroups`, it creates no security group; each rule renders to a standalone `SecurityGroupIngress`/`SecurityGroupEgress` resource, enabling connectivity between two security groups owned by different modules without a circular cross-stack dependency.

#### CLI

- Module deployment hook commands now resolve `{{context:<key>}}` references against the module's effective context.
- The `mdaa` CLI now validates `--domain`, `--env`, and `--module` filter values against the loaded config and fails fast with an error listing the unknown value(s) and the valid options, instead of silently matching nothing.

### Core Framework Changes

- **Naming**: Added `MdaaResourceType` enum and `withResourceType()` method to `IMdaaResourceNaming` interface, enabling custom naming modules to inject service-type abbreviations of the implementer's choosing into resource names (the abbreviations themselves are not produced by the enum). The default implementation is unchanged — no impact on existing deployments.

### Deprecations

- **GAIA v1 removal target set to v1.9.0**: `@aws-mdaa/gaia` and `@aws-mdaa/gaia-l3-construct` (GAIA v1), deprecated in favor of `@aws-mdaa/gaia-v2` and `@aws-mdaa/gaia-v2-l3-construct`, now have a firm removal target of **v1.9.0**. Previously the removal was documented only as "a future release". v1 remains published and functional for existing deployments until then and will not receive new features. See [MIGRATION_TO_V2.md](packages/apps/ai/gaia-v2-app/MIGRATION_TO_V2.md) for migration guidance.
- **Bedrock Agent module deprecation**: `@aws-mdaa/bedrock-agent-l3-construct` is deprecated, as the Amazon Bedrock Agents service will no longer be open to new customers starting on July 30, 2026. Existing customers can continue to use the service as normal. We will support similar capabilities in the next release.
- **SageMaker Ground Truth and Model Monitoring modules deprecation**: `@aws-mdaa/sagemaker-ground-truth` and `@aws-mdaa/sagemaker-model-monitoring` (apps, their `-l3-construct` L3 constructs, and the `MdaaGroundTruth`/`MdaaModelMonitor` L2 constructs) are deprecated, as SageMaker Ground Truth, Model Monitor, and Clarify entered maintenance mode on July 30, 2026 and are no longer open to new customers. This is a **non-breaking** deprecation — existing deployments continue to work. For Model Monitor/Clarify a replacement solution is targeted for the next release; Ground Truth has no managed AWS replacement. See the [Ground Truth](packages/apps/ai/sagemaker-ground-truth-app/README.md) and [Model Monitoring](packages/apps/ai/sagemaker-model-monitoring-app/README.md) module READMEs for the deprecation mechanism, replacement direction, and migration guidance.

### General Changes

- **aws-cdk-lib upgrade to 2.258.0**: `aws-cdk-lib` has been updated from 2.192.0 to 2.258.0. This version removes the `lambda.Runtime.PYTHON_3_13` enum value and upgrades it to `Runtime.PYTHON_3_14`. Any MDAA config that references `python3.13` as a Lambda runtime must be updated to `python3.13t` (thread-based) or another supported runtime (e.g., `python3.14`).
- Updated dependencies to address CVEs (`cryptography`, `requests`, `yaml`, `fast-xml-parser`, `follow-redirects`, `tmp`, `pytest`)

### Bug Fixes

- Added allowlist validation of `region` (`^[a-z0-9-]+$`) and `account` (12-digit) config values before they are interpolated into CLI shell commands, at both config-parse time (for concrete values) and after reference resolution. Dynamic references (`{{...}}`) and the `default` sentinel are unaffected.
- Fixed intermittent deployment failures caused by concurrent `AWS::DataZone::Owner` creation triggering DynamoDB transaction collisions (`Transaction cancelled ... ConditionalCheckFailed ... AlreadyExists`). `CfnOwner` resources that target the same domain unit are now chained sequentially via CloudFormation `DependsOn`, eliminating the race; owners on different domain units remain parallel. The chain order is derived from the owner construct id, so reordering a config's owner list produces no template change.
- Fixed cross-account SMUS deploy failure in DataZone v2 domain config handler due to insufficient IAM authorization after recent AWS service update
- Fixed DataOps Project cross-account resource link creation (one resource link per account)
- Fixed missing KMS encryption on Data Warehouse cluster events SNS topic
- Fixed GAIA v2 REST API missing per-method and per-user throttling
- Fixed GAIA v2 REST API pagination tokens to be opaque and versioned
- Fixed GAIA (v1) CDK synth failure caused by unsuppressed `IAMNoInlinePolicy` (NIST/HIPAA/PCI) findings on the CDK-managed S3 bucket-notifications handler for the RAG data-import upload bucket
- Fixed `AmazonBedrockKnowledgeBase` environment deployment failing with `No matching security policy of encryption type found for collection name: bedrock-ide-<env-id>` by pre-creating the AOSS encryption policy with the correct `collection/bedrock-ide-*` wildcard and tooling CMK on both the primary and associated (cross-account) accounts

## [1.6.0] - 2026-05-22

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
  - v2 is a re-architected GAIA backend (Cognito, AppSync Events, CloudFront) and is not a drop-in replacement. See [MIGRATION_TO_V2.md](packages/apps/ai/gaia-v2-app/MIGRATION_TO_V2.md) for guidance

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
- Fixed LakeFormation Settings SSO application ARN failing in Control Tower / delegated-admin IdC setups by no longer hardcoding the data platform account ID

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
