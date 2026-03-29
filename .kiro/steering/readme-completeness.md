---
inclusion: manual
---

# Module README Completeness — Steering Guide

Assess and improve README.md quality for MDAA app modules by ensuring every module has a consistent, complete README that follows the established pattern.

## Scope

- **App modules**: `packages/apps/{category}/{module}/`
- **READMEs**: `README.md` in each module root
- **Sample configs**: `sample_configs/sample-config*.yaml`
- **Schema docs**: `SCHEMA.md` (auto-generated, already exists in most modules)
- **Architecture diagrams**: Referenced from `../../../constructs/L3/{category}/{module-l3-construct}/docs/`

## Standard README Structure

Every module README must follow this structure:

````markdown
# {Module Display Name}

{One-paragraph description of what the module deploys and its purpose.}

---

## Deployed Resources

This module deploys and integrates the following resources:

{List of each AWS resource the module creates. Each entry uses **bold** for the
resource name, followed by a dash and a factual description of what it is and
what it does. Keep descriptions factual — no compliance posture statements.}

**Resource Name** - What it is and what it does.

**Resource Name** (Optional) - What it is and what it does. Mark optional resources.

![{ModuleName}](../../../constructs/L3/{category}/{module-l3-construct}/docs/{ModuleName}.png)

### Deployed Resources rules

- Use `**Bold Name** - Description` format (not bullet lists with colons)
- Descriptions must be factual: what the resource IS and what it DOES
- Do NOT include compliance language in Deployed Resources. These belong in Security/Compliance:
  - ❌ "MDAA configures these to be private and encrypted"
  - ❌ "securely managed exclusively through Secrets Manager"
  - ❌ "encrypted using KMS key"
  - ❌ "All ingress denied by default"
  - ❌ "access granted to X roles"
- ✅ "Controls network access for cluster instances" (factual, what it does)
- ✅ "Provisioned compute used to perform replication tasks" (factual, what it is)
- Mark optional resources with `(Optional)` after the bold name
- Include ALL resources deployed by the module — cross-reference L3 construct source code

---

## Related Modules

{List of related MDAA modules with relative links to their README.md files.
Each entry states how the related module connects to or can be used with this one.}

- [Module Display Name](relative/path/to/README.md) — How this module relates or can be used together

### Related Modules rules

- Place this section AFTER Deployed Resources and BEFORE Security/Compliance Details
- Use relative paths between module READMEs (e.g., `../../datalake/datalake-app/README.md`)
- Each entry: `[Display Name](path) — one sentence explaining the relationship`
- The relationship description should explain HOW the modules connect, not just THAT they connect:
  - ✅ "Create IAM roles that can be referenced as data admin or user roles for workgroup access"
  - ✅ "Deploy data lake buckets that project jobs can read from and write to"
  - ❌ "Related data lake module" (too vague)
- Include both upstream dependencies (modules this one consumes) and downstream consumers (modules that use this one)
- Order: most closely related modules first
- Only include genuinely useful relationships — not every module needs to link to every other

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles
and CDK nag rulesets. Additional review is recommended prior to production
deployment, ensuring organization-specific compliance requirements are met.

{Categorized bullet list. Each category is a bold label followed by a colon,
with individual items as separate sub-bullets. Only include categories that
apply to the module.}

- **Encryption at Rest**:
  - {specific item}
  - {specific item}
- **Encryption in Transit**:
  - {specific item}
- **Least Privilege**:
  - {specific item}
  - {specific item}
- **Separation of Duties**:
  - {specific item}
- **Network Isolation**:
  - {specific item}
  - {specific item}

### Security/Compliance rules

- Always use the standard intro paragraph above (verbatim)
- Use these category names (only include applicable ones):
  - Encryption at Rest, Encryption in Transit, Least Privilege,
    Separation of Duties, Network Isolation, Data Protection,
    Content Safety, Logging & Audit, Compliance
- Each category has its items as SEPARATE sub-bullets (not inline text)
- This is where compliance posture statements belong — NOT in Deployed Resources
- Be specific: name the KMS key, the role, the policy, the security group behavior

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
{ module-name }: # Module Name can be customized
  module_path: '@aws-mdaa/{module-name}' # Must match module NPM package name
  module_configs:
    - ./{module-name}.yaml # Filename/path can be customized
```
````

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./{module-name}.yaml` file referenced in the MDAA config snippet above.

#### Primary Configuration Sample

{1-2 sentence description of what this configuration demonstrates — the main
use case, what features are exercised. Written for end users.}

[sample-config.yaml](sample_configs/sample-config.yaml)

```yaml
--8<-- "sample_configs/sample-config.yaml"
```

{If the module has additional sample configs, repeat the pattern for each:}

#### {Variant Name} Configuration

{1-2 sentence description of when/why a user would choose this variant over
the primary. Explain the mutually exclusive choice or alternative use case.}

[sample-config-{variant}.yaml](sample_configs/sample-config-{variant}.yaml)

```yaml
--8<-- "sample_configs/sample-config-{variant}.yaml"
```

{Optional: additional sections like Prerequisites, Examples, Security Notes,
Important Notes — only when the module genuinely needs them.}

```

## Process

### 1. Gather Context

For each module, read:

1. **README.md** — current state
2. **Primary sample-config.yaml** — the inline YAML example should match this
3. **SCHEMA.md** — verify the link target exists
4. **L3 construct docs/ folder** — verify the architecture diagram image exists

Do NOT read TypeScript source code. The README content should be derivable from the sample config, schema, existing README, and the service/resource reference below.

### 2. Assess Each README

Score each module against these criteria:

#### Required Sections (present/absent)

| Section | Check |
|---------|-------|
| Title + description paragraph | Module name as H1, followed by a meaningful description |
| Deployed Resources | H2 section with resource list using `**Bold** - description` format, factual only (no compliance language) |
| Architecture diagram | `![...]()` image reference pointing to L3 construct docs |
| Related Modules | H2 section with linked list of related modules and relationship descriptions, placed after Deployed Resources |
| Security/Compliance Details | H2 section with categorized sub-bullet format covering encryption, network, IAM, logging |
| Configuration > MDAA Config | H3 with mdaa.yaml wiring snippet |
| Configuration > Module Config | H3 with SCHEMA.md link |
| Sample config sections | Each sample-config file has: context description with use case sentence, markdown link, and MkDocs snippet include. Section heading is `### Module Config Samples and Variants` with explanation line below. Ordered: minimal → comprehensive → variants |
| All sample configs included | Every `sample_configs/*.yaml` file is represented in the README |

#### Quality Checks

- **Description**: Is it a real description or just "{Module} CDK application is used to configure deploy {thing}"? Should explain what the module does and why you'd use it. Must end with a usage scenario sentence ("Common scenarios include..." or "Use this module when..."). For modules that are alternatives (e.g., SageMaker vs DataZone), explain when to choose each.
- **Deployed Resources list**: Does it enumerate the actual AWS resources created using `**Bold Name** - description` format? Descriptions must be factual only — no compliance posture statements (encryption enforcement, access grants, security group defaults). Those belong in Security/Compliance.
- **Security/Compliance format**: Does it use the categorized sub-bullet format (`- **Category**:` with `  - item` sub-bullets)? Each security principle item must be a separate sub-bullet, not inline text.
- **Related Modules**: Does it list related modules with relative links and relationship descriptions explaining HOW the modules connect? Placed after Deployed Resources and before Security/Compliance. For alternative modules (SageMaker vs DataZone), use "Alternative to X for Y" language.
- **No compliance in Deployed Resources**: Grep for patterns like "MDAA configures", "securely managed", "encrypted using", "ingress denied", "access granted" in Deployed Resources sections — these must be in Security/Compliance only.
- **Sample config context**: Does each sample config section have a 1-2 sentence description explaining what the config demonstrates, plus a use case sentence ("Start here when...", "Use this as a reference when...", "Choose this variant when...")? Descriptions must use user-facing language — no "enum variants", "exercises every property", "mutually exclusive", "non-excluded schema properties".
- **Sample config heading**: The section heading is `### Module Config Samples and Variants` (no filename in parentheses). Immediately below is an explanation line about copying contents into the config file.
- **Dual-include pattern**: Does each sample config have both a `[link](sample_configs/...)` for raw Markdown rendering AND a `--8<--` snippet for MkDocs rendering?
- **All configs covered**: Are all `sample_configs/*.yaml` files included? Check for missing variant configs.
- **Broken image references**: Does the architecture diagram file actually exist at the referenced path?

### 3. Produce Report

For each module, output a status line:

```

Module: {module-name}
Status: GOOD | NEEDS_WORK | MISSING_README
Missing sections: [list]
Quality issues: [list]

`````

Group modules by status for easy prioritization.

### 4. Implement Fixes

When fixing READMEs:

#### For modules missing README entirely
Create a new README following the standard structure. Derive content from:
- The sample-config.yaml comments for the description and config documentation
- The config-schema.json for the deployed resources list (what resource types does the schema configure?)
- The module's package.json for the correct npm package name
- Include all sample configs using the dual-include pattern

#### For modules with non-conforming structure
Restructure to match the standard pattern while preserving any genuinely useful extra content (prerequisites, examples, security notes) as additional sections after the standard sections.

#### Converting inline YAML to dual-include pattern
Replace any hardcoded YAML blocks in the Module Config section with the dual-include pattern. For each sample config file in `sample_configs/`:

1. Add a descriptive H4 heading (e.g., `#### Primary Configuration Sample`, `#### Standalone Configuration (No Project)`)
2. Write 1-2 sentences of context explaining what this config demonstrates
3. Add a markdown link: `[sample-config.yaml](sample_configs/sample-config.yaml)`
4. Add a fenced code block with the MkDocs snippet include:

````markdown
```yaml
--8<-- "sample_configs/sample-config.yaml"
```
`````

This gives users two access paths:

- In raw Markdown (GitHub/GitLab): they see the link and can click through to the file
- In MkDocs rendered docs: the file content is inlined automatically

#### Common variant naming conventions

- `sample-config.yaml` → "Primary Configuration Sample" — the main/default use case
- `sample-config-noproject.yaml` → "Standalone Configuration (No Project)" — direct resource references instead of project auto-wiring
- `sample-config-saml.yaml` → "SAML Authentication Configuration"
- `sample-config-codepath.yaml` → "Local Code Path Configuration" — building from source instead of pre-built image
- `datazone-sample-config.yaml` → "DataZone Integration Configuration"
- `sagemaker-sample-config.yaml` → "SageMaker Integration Configuration"
- `simple-sample-config.yaml` → "Minimal Configuration" — bare minimum required properties

#### For missing architecture diagrams

If the L3 construct docs/ folder doesn't exist or doesn't contain the expected image, add the image reference as a comment placeholder:

```markdown
<!-- Architecture diagram not yet available -->
```

Do NOT create fake diagram references that would produce broken images.

#### For weak descriptions

Rewrite the opening paragraph to explain:

1. What AWS resources the module provisions
2. What use case or capability it enables
3. Any key security/compliance features

Keep it to 1-3 sentences. Don't pad with marketing language.

Never refer to modules as "CDK applications" — they are configurable modules. Avoid phrases like "This {X} CDK application is used to configure deploy {Y}". Instead, lead with what the module does: "Deploys {resources} for {purpose}."

### 5. Validate

After implementing changes:

1. **Structure check** — every README has all required sections
2. **YAML parity** — inline YAML matches primary sample-config.yaml
3. **Link check** — SCHEMA.md exists, image file exists (or is properly commented out)
4. **No broken markdown** — headings, code fences, and image references are well-formed

## AWS Services and Resources by Module

This reference lists the AWS services used and resources deployed by each module. Use this to write accurate "Deployed Resources and Compliance Details" sections. Resources come from three layers: direct CDK L1/L2 constructs in the L3 construct, MDAA helper constructs (e.g., `@aws-mdaa/kms-constructs` → KMS Key + Alias), and composed L3 sub-constructs.

Common resources created by MDAA helpers (not repeated per module below unless noteworthy):

- `kms-constructs` → KMS Key + Key Alias + Key Policy
- `s3-constructs` → S3 Bucket + Bucket Policy (encrypted, versioned, access-logged)
- `iam-constructs` / `iam-role-helper` → IAM Roles + Managed Policies + Policy Statements
- `lambda-constructs` → Lambda Function + Log Group + Execution Role
- `ec2-constructs` → Security Groups + Ingress/Egress Rules
- `sns-constructs` → SNS Topic + Topic Policy + Subscriptions
- `sqs-constructs` → SQS Queue + Queue Policy
- `cloudwatch-constructs` → CloudWatch Log Groups + Metric Filters
- `custom-constructs` → Custom Resource Lambda (for API calls not natively supported by CloudFormation)

### AI

#### bedrock-agentcore-runtime-app

- **Amazon Bedrock AgentCore**: Runtime, Runtime Endpoint
- **Amazon ECR**: Docker image asset (built and pushed at deploy time)
- **AWS IAM**: Execution Role, Managed Policy (ECR access, CloudWatch Logs, X-Ray, Bedrock model invocation, AgentCore workload identity)
- **Amazon CloudWatch Logs**: Log Group for runtime logs
- **AWS SSM Parameter Store**: Runtime ARN, Runtime ID, Endpoint ARN/ID

#### bedrock-builder-app

- **Amazon Bedrock**: Agent, Agent Alias, Agent Action Group, Knowledge Base, Data Source, Guardrail, Guardrail Version
- **AWS KMS**: Encryption keys for agent and knowledge base resources
- **Amazon OpenSearch Serverless**: Collection, Access Policy, Security Policy (when used as KB vector store)
- **Amazon RDS**: Aurora Serverless cluster (when used as KB vector store)
- **AWS Lambda**: Action group executor functions, KB custom transformation functions
- **Amazon S3**: Knowledge base data source bucket
- **AWS IAM**: Agent execution role, KB execution role, Lambda execution roles
- **Amazon CloudWatch Logs**: Log groups for Lambda functions
- **Amazon EC2**: Security groups for VPC-bound resources

#### bedrock-settings-app

- **AWS KMS**: Encryption key for audit logs
- **Amazon S3**: Audit log bucket (when S3 logging enabled)
- **Amazon CloudWatch Logs**: Log Group (when CloudWatch logging enabled)
- **AWS IAM**: Bedrock logging service role + managed policy
- **AWS Lambda**: Custom resource to configure Bedrock model invocation logging settings

#### data-science-team-app

- **Amazon SageMaker**: Studio Domain (via sm-studio-domain sub-construct), User Profiles
- **Amazon Athena**: Workgroups (via athena-workgroup sub-construct)
- **Amazon S3**: Team data buckets, SageMaker storage bucket
- **AWS KMS**: Encryption keys for S3 and SageMaker resources
- **AWS IAM**: Team execution roles, SageMaker execution roles
- **AWS Lake Formation**: Data permissions for team roles
- **AWS Lambda**: Custom resource functions

#### gaia-app

- **Amazon API Gateway**: REST API with WAF integration
- **Amazon Cognito**: User Pool, Identity Pool
- **Amazon DynamoDB**: Application tables
- **Amazon S3**: Application storage buckets
- **AWS Lambda**: Application functions with event sources
- **Amazon SQS**: Message queues
- **Amazon SNS**: Notification topics
- **AWS Step Functions**: Orchestration state machines
- **Amazon RDS**: Aurora Serverless database
- **Amazon ECS**: Container services
- **AWS Batch**: Batch compute environments
- **Amazon Kendra**: Search index
- **AWS KMS**: Encryption keys for all data stores
- **AWS WAFv2**: Web ACL, IP Set, Logging Configuration
- **Amazon Route 53**: DNS records
- **AWS Certificate Manager**: TLS certificates
- **Amazon CloudWatch Logs**: Log groups for all compute resources
- **Amazon ECR**: Docker image assets
- **AWS IAM**: Service roles for all components

#### sm-notebook-app

- **Amazon SageMaker**: Notebook Instance, Lifecycle Configuration
- **Amazon S3**: Notebook storage bucket
- **AWS KMS**: Encryption key for notebook and S3
- **Amazon EC2**: Security Group for notebook instance
- **AWS IAM**: Notebook execution role

#### sm-studio-domain-app

- **Amazon SageMaker**: Studio Domain, User Profiles, Managed Policies
- **Amazon S3**: Studio storage bucket
- **AWS KMS**: Encryption key for Studio and S3
- **Amazon EC2**: Security Groups for Studio domain
- **AWS IAM**: Studio execution roles, user profile roles
- **AWS Lambda**: Custom resource functions

### Analytics

#### datawarehouse-app

- **Amazon Redshift**: Cluster (with encrypted storage, VPC-bound)
- **Amazon Redshift**: Event Subscription, Scheduled Actions
- **Amazon S3**: Audit logging bucket
- **Amazon SNS**: Event notification topic + subscriptions
- **AWS KMS**: Encryption key for cluster and S3
- **Amazon EC2**: Security Group for cluster access
- **AWS IAM**: Cluster IAM roles, managed policies
- **AWS Secrets Manager**: Admin credentials secret

#### opensearch-app

- **Amazon OpenSearch Service**: Domain (VPC-bound, encrypted, with fine-grained access control)
- **AWS KMS**: Encryption key for domain data at rest
- **Amazon CloudWatch Logs**: Log Groups (application, audit, index slow, search slow logs)
- **Amazon EC2**: Domain Security Group
- **Amazon Route 53**: CNAME record (when custom endpoint enabled)
- **AWS Certificate Manager**: TLS certificate (when custom endpoint enabled)
- **Amazon SNS**: Event notification topic + subscriptions
- **AWS IAM**: Data admin roles, service-linked role reference
- **SAML Authentication**: Optional SSO integration configuration

#### quicksight-account-app

- **Amazon QuickSight**: Account configuration, VPC Connection
- **Amazon EC2**: Security Group for VPC connection
- **AWS IAM**: QuickSight service roles, managed policies
- **AWS Lambda**: Custom resource for QuickSight API operations

#### quicksight-namespace-app

- **Amazon QuickSight**: Namespace, Group, Group Membership
- **Amazon EventBridge**: Scheduled rule for namespace sync
- **AWS IAM**: QuickSight roles, managed policies
- **AWS Lambda**: Custom resource for QuickSight namespace operations

#### quicksight-project-app

- **Amazon QuickSight**: Data Sources, Datasets, Analyses, Dashboards, Templates
- **AWS IAM**: QuickSight project roles, managed policies
- **AWS Lambda**: Custom resource for QuickSight project operations

### Core

#### bootstrap

- **AWS CloudFormation**: Bootstrap stack (CDK bootstrap resources)
- **Amazon S3**: CDK staging bucket
- **AWS IAM**: CDK deployment roles

#### devops

- **AWS CodePipeline**: CI/CD pipeline
- **AWS CodeBuild**: Build projects
- **Amazon S3**: Pipeline artifact bucket
- **AWS KMS**: Encryption key for pipeline artifacts
- **AWS IAM**: Pipeline and build roles

#### app (core)

- Base application construct — no direct AWS resources. Provides shared configuration and naming for all other modules.

### Data Lake

#### athena-workgroup-app

- **Amazon Athena**: Workgroup(s) with query result encryption
- **Amazon S3**: Query results bucket
- **AWS KMS**: Encryption key for query results and S3
- **AWS IAM**: Workgroup access roles

#### datalake-app

- **Amazon S3**: Data lake buckets (encrypted, versioned, with lifecycle rules and inventory)
- **AWS KMS**: Encryption keys for each bucket
- **AWS Glue**: Catalog Database(s)
- **AWS Lake Formation**: Data location registrations
- **AWS IAM**: Bucket access roles, data admin roles
- **AWS Lambda**: Custom resource for bucket policy management

### DataOps

#### dataops-project-app

- **Amazon S3**: Project bucket (scripts, artifacts, temp data)
- **AWS KMS**: Project encryption key
- **Amazon SNS**: Notification topic for job/crawler events + subscriptions
- **AWS Glue**: Databases, Connections, Classifiers, Security Configuration
- **AWS Lake Formation**: Tags, Tag Associations, Principal Permissions, Settings
- **Amazon Athena**: Project workgroup (via sub-construct)
- **Amazon EC2**: Security Groups for Glue connections
- **Amazon DataZone**: Project, Environment (when DataZone integration enabled)
- **AWS IAM**: Data engineer roles, data admin roles, project execution roles, deployment role
- **AWS SSM Parameter Store**: Project resource references

#### dataops-crawler-app

- **AWS Glue**: Crawler(s) with schedule and target configuration
- **Amazon EventBridge**: Crawler state change rules (for notifications)
- **Amazon SNS**: Notification topic (failure alerts)

#### dataops-dashboard-app

- **Amazon CloudWatch**: Dashboard(s) with metric, text, and log insights widgets
- **AWS SSM Parameter Store**: Cross-module metric references

#### dataops-data-quality-app

- **AWS Glue**: Data Quality Ruleset(s)
- **AWS SSM Parameter Store**: Ruleset metadata

#### dataops-databrew-app

- **AWS Glue DataBrew**: Dataset(s), Profile Job(s), Recipe(s), Recipe Job(s), Project(s), Schedule(s)
- **AWS IAM**: DataBrew execution roles

#### dataops-dms-app

- **AWS DMS**: Replication Instance, Replication Task, Replication Subnet Group, Endpoints (source/target)
- **Amazon EC2**: Security Group for replication instance
- **AWS KMS**: Encryption key for replication
- **AWS Secrets Manager**: Endpoint credentials
- **AWS IAM**: DMS service roles

#### dataops-dynamodb-app

- **Amazon DynamoDB**: Table(s) with encryption, point-in-time recovery
- **AWS KMS**: Encryption key for tables

#### dataops-job-app

- **AWS Glue**: Job(s) with script deployment, Security Configuration
- **Amazon S3**: Script/artifact storage
- **Amazon EventBridge**: Job state change rules (for notifications)
- **Amazon SNS**: Notification topic (failure alerts)
- **Amazon CloudWatch Logs**: Log Groups for Glue jobs
- **AWS KMS**: Encryption key for job outputs
- **AWS IAM**: Glue execution roles

#### dataops-lambda-app

- **AWS Lambda**: Function(s) with VPC configuration, layers, environment variables
- **Amazon CloudWatch Logs**: Log Groups + Metric Filters
- **Amazon EventBridge**: Scheduled invocation rules
- **Amazon EC2**: Security Groups (when VPC-bound)
- **AWS KMS**: Encryption key for function environment variables
- **AWS IAM**: Lambda execution roles

#### dataops-nifi-app

- **Amazon EKS**: Cluster with Helm chart deployment (Apache NiFi)
- **Amazon EFS**: File System + Access Points (NiFi persistent storage)
- **Amazon EC2**: Security Groups, VPC configuration
- **AWS KMS**: Encryption keys for EFS and secrets
- **AWS Certificate Manager (Private CA)**: Certificate Authority, Certificates (NiFi TLS)
- **AWS Secrets Manager**: NiFi credentials
- **Amazon Route 53**: DNS records for NiFi endpoints
- **AWS IAM**: EKS service accounts, node roles

#### dataops-shared-app

- Shared configuration construct — resolves project references (bucket, KMS key, SNS topic, deployment role, security configuration) from SSM parameters. No direct AWS resources created.

#### dataops-stepfunction-app

- **AWS Step Functions**: State Machine(s) with definition
- **Amazon EventBridge**: Scheduled execution rules, state change notification rules
- **Amazon CloudWatch Logs**: Log Groups for execution logging
- **AWS KMS**: Encryption key for state machine data
- **AWS IAM**: Step Functions execution roles

#### dataops-workflow-app

- **AWS Glue**: Workflow(s), Trigger(s) (scheduled, on-demand, conditional)
- **Amazon EventBridge**: Workflow state change rules (for notifications)
- **AWS KMS**: Encryption key for workflow resources
- **AWS IAM**: Workflow execution roles

### Governance

#### audit-app

- **Amazon S3**: Audit bucket (encrypted, versioned, with inventory and lifecycle)
- **AWS KMS**: Encryption key for audit bucket
- **AWS Glue**: Audit catalog database
- **AWS IAM**: Audit access roles

#### audit-trail-app

- **AWS CloudTrail**: Trail (S3 data events, optional management events)
- **Amazon S3**: Trail log delivery (references existing audit bucket)
- **AWS KMS**: References existing audit KMS key

#### datazone-app

- **Amazon DataZone**: Domain, Domain Units, Environment Blueprints, Environment Profiles
- **AWS KMS**: Encryption key for DataZone domain
- **Amazon S3**: DataZone domain bucket
- **AWS RAM**: Resource shares for cross-account blueprint access
- **AWS IAM**: DataZone service roles, provisioning roles
- **AWS Lambda**: Custom resource for DataZone API operations
- **AWS Service Catalog**: Portfolio (for blueprint provisioning)
- **AWS Lake Formation**: Settings configuration

#### glue-catalog-app

- **AWS Glue**: Data Catalog encryption settings
- **Amazon Athena**: Federated Data Catalog(s)
- **AWS KMS**: Encryption key for Glue Catalog
- **AWS RAM**: Resource shares for cross-account catalog access
- **AWS Lambda**: Custom resource for catalog operations
- **AWS SSM Parameter Store**: Catalog configuration references

#### lakeformation-access-control-app

- **AWS Lake Formation**: Principal Permissions, Database grants, Table grants
- **AWS Glue**: Database references

#### lakeformation-settings-app

- **AWS Lake Formation**: Data Lake Settings, Service-Linked Role configuration
- **AWS IAM**: Lake Formation admin roles
- **AWS Lambda**: Custom resource for Lake Formation API operations

#### macie-session-app

- **Amazon Macie**: Session (with finding publishing frequency and status)

#### roles-app

- **AWS IAM**: IAM Roles with trust policies, managed policy attachments, inline policies, permission boundaries

#### sagemaker-app

- **Amazon DataZone**: Domain, Domain Units, Environment Blueprints, Environment Profiles
- **AWS KMS**: Encryption key for domain
- **Amazon S3**: Domain bucket
- **AWS RAM**: Resource shares
- **AWS IAM**: Domain roles, provisioning roles
- **AWS Lambda**: Custom resource functions

#### sagemaker-project-app

- **Amazon DataZone**: Project(s), Project Profile(s), Environment(s), Data Source(s)
- **AWS RAM**: Resource shares for environment templates
- **AWS Lake Formation**: Access control grants for data sources

#### service-catalog-app

- **AWS Service Catalog**: Portfolio(s), Portfolio Principal Associations
- **AWS IAM**: Portfolio access role associations

### Utility

#### datasync-app

- **AWS DataSync**: Agent(s), Location(s) (S3, NFS, SMB, Object Storage), Task(s)
- **Amazon EC2**: Security Group with DataSync-specific ingress rules
- **AWS KMS**: Encryption key for DataSync logs
- **Amazon CloudWatch Logs**: Log Group for task execution logs
- **AWS Secrets Manager**: Credentials for SMB/Object Storage locations
- **AWS IAM**: DataSync service roles

#### ec2-app

- **Amazon EC2**: Instance(s), Key Pair(s), Security Group(s) with ingress/egress rules
- **AWS KMS**: Encryption key for EBS volumes and Secrets Manager
- **AWS Secrets Manager**: Key pair private key storage
- **AWS CloudFormation**: cfnInit bootstrap configurations
- **AWS IAM**: Instance profiles, instance roles

#### eventbridge-app

- **Amazon EventBridge**: Custom Event Bus(es), Event Archive(s), Bus Resource Policy
- **AWS IAM**: Event bus access policies for principals

#### m2m-api-app

- **Amazon API Gateway**: REST API with stages, methods, integrations
- **Amazon Cognito**: User Pool, Resource Server, App Client(s)
- **AWS Lambda**: API handler function(s)
- **AWS WAFv2**: Web ACL, IP Set, Logging Configuration
- **AWS KMS**: Encryption key for API and Cognito resources
- **Amazon CloudWatch Logs**: API Gateway access logs, Lambda log groups
- **AWS IAM**: API execution roles, Lambda roles

#### sftp-server-app

- **AWS Transfer Family**: SFTP Server with VPC endpoint configuration
- **Amazon EC2**: Security Group, Elastic IP(s) (when internet-facing)
- **AWS IAM**: Transfer Family service roles

#### sftp-users-app

- **AWS Transfer Family**: User(s) with SSH key and home directory mapping
- **AWS IAM**: User access roles with S3 scoped-down policies

## Known Issues (Current State)

### Modules missing README

- `core/bootstrap`
- `core/devops`
- `dataops/dataops-shared-app`

### Modules with non-standard README structure

- `ai/bedrock-agentcore-runtime-app` — completely different format, no standard sections, no SCHEMA.md link, no MDAA Config snippet, no architecture diagram
- `dataops/dataops-dashboard-app` — tutorial-style format, missing standard sections (Deployed Resources, MDAA Config, SCHEMA.md link)
- `dataops/dataops-data-quality-app` — missing architecture diagram image, missing SCHEMA.md link, but otherwise decent content

### Modules with missing architecture diagrams (no L3 construct docs/)

- `ai/bedrock-agentcore-runtime-app` — `<!-- TODO -->` added to README
- `dataops/dataops-dashboard-app` — `<!-- TODO -->` added to README
- `dataops/dataops-data-quality-app` — `<!-- TODO -->` added to README

### Modules with broken architecture diagram path (fixed)

- `governance/service-catalog-app` — was pointing to `governance/` instead of `utility/` L3 construct path (corrected)

## Anti-Patterns

### Developer language in sample config descriptions

```markdown
<!-- ❌ Developer-facing language about schema internals -->

Exercises every non-excluded schema property at full depth.
Covers both deploymentMode enum variants.
Mutually exclusive with the DataZone integration path.

<!-- ✅ User-facing language about what the config does -->

Covers all available configuration options using the SageMaker integration path.
Supports both ON_CREATE and ON_DEMAND deployment modes.
Uses Amazon DataZone for data governance instead of SageMaker Unified Studio.
```

### Compliance language in Deployed Resources

```markdown
<!-- ❌ Compliance posture in Deployed Resources -->

**DMS Replication Instance** - Provisioned compute which will be used to perform
replication tasks. MDAA configures these to be private and encrypted.

**DMS Endpoint** - Source and target data sources. MDAA configures endpoint
credentials to be securely managed exclusively through AWS Secrets Manager.

<!-- ✅ Factual descriptions only — compliance details in Security/Compliance -->

**DMS Replication Instance** - Provisioned compute used to perform replication tasks.

**DMS Endpoint** - Source and target data sources from/to which data will be migrated.
```

### Inline compliance items instead of sub-bullets

```markdown
<!-- ❌ Inline text after category label -->

- **Encryption at Rest**: All data encrypted with KMS key, buckets use SSE-KMS

<!-- ✅ Each item as a separate sub-bullet -->

- **Encryption at Rest**:
  - All data encrypted with customer-managed KMS key
  - Buckets configured to require KMS encryption
```

### Missing Related Modules section

```markdown
<!-- ❌ No Related Modules section — users can't discover connected modules -->

## Configuration

...

<!-- ✅ Related Modules between Security/Compliance and Configuration -->

## Related Modules

- [Data Lake](../../datalake/datalake-app/README.md) — Deploy data lake buckets
  that project jobs can read from and write to
- [Roles](../../governance/roles-app/README.md) — Create IAM roles for data
  engineer, execution, and data admin access

---

## Configuration

...
```

### Vague relationship descriptions

```markdown
<!-- ❌ Too vague — doesn't explain HOW they connect -->

- [Data Lake](../../datalake/datalake-app/README.md) — Related data lake module

<!-- ✅ Explains the specific relationship -->

- [Data Lake](../../datalake/datalake-app/README.md) — Deploy data lake buckets
  that project jobs can read from and write to
```

### Boilerplate descriptions

```markdown
<!-- ❌ Generic, references CDK, says nothing useful -->

# Foo

This Foo CDK application is used to configure deploy Foo resources

<!-- ✅ Explains what and why, no CDK reference -->

# Foo

Provisions encrypted S3 buckets with access policies, lifecycle rules,
and cross-account sharing for a governed data lake on AWS.
```

### Hardcoded YAML instead of dual-include

````markdown
<!-- ❌ Hardcoded YAML that drifts from the actual sample config -->

```yaml
someProperty: old-value
anotherProperty: stale
```
````

<!-- ❌ Only a link, no inline rendering in MkDocs -->

[sample-config.yaml](sample_configs/sample-config.yaml)

<!-- ❌ Only a snippet, no link for raw Markdown viewers -->

```yaml
--8<-- "sample_configs/sample-config.yaml"
```

<!-- ✅ Both link AND snippet, with context -->

#### Primary Configuration Sample

Demonstrates the full-featured setup with project integration,
encryption, and notification configuration.

[sample-config.yaml](sample_configs/sample-config.yaml)

```yaml
--8<-- "sample_configs/sample-config.yaml"
```

````

### Missing variant configs

```markdown
<!-- ❌ Only showing the primary config when the module has a noproject variant -->
<!-- Users who don't use DataOps projects never see the standalone config -->

<!-- ✅ Every sample-config file in sample_configs/ gets its own section -->
````

### Inventing extra sections unnecessarily

```markdown
<!-- ❌ Adding "Architecture", "How It Works", "FAQ" sections with thin content -->
<!-- just to make the README look longer -->

<!-- ✅ Only add extra sections when there's genuinely useful content -->
<!-- (prerequisites, SAML setup, deployment ordering, etc.) -->
```

## Module Paths

Apps: `packages/apps/{ai,analytics,core,datalake,dataops,governance,utility}/*/`

L3 Constructs (for diagram references): `packages/constructs/L3/{category}/{module-l3-construct}/docs/`
