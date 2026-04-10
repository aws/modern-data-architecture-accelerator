---
inclusion: manual
---

# Sample Config Completeness - Steering Guide

Assess and improve sample-config.yaml completeness for MDAA modules by maximizing config schema coverage. Where schema elements are mutually exclusive, create separate sample-config files with corresponding synth tests.

## Scope

- **App modules**: `packages/apps/{category}/{module}-app/`
- **Sample configs**: `sample_configs/sample-config*.yaml`
- **Config schemas**: `lib/config-schema.json` (JSON Schema draft-07, auto-generated from TypeScript interfaces)
- **Synth tests**: `test/*.synth.test.ts`

### Excluded Modules

The following modules are excluded from sample-config completeness analysis. They are not directly usable modules — they are base classes, shared libraries, or infrastructure scaffolding that other modules consume:

- `packages/apps/core/app/` — base app class; sample configs test the base class machinery, not a deployable module
- `packages/apps/core/devops/` — CI/CD pipeline scaffolding, not a user-facing module
- `packages/apps/dataops/dataops-shared-app/` — shared config parser base class for dataops modules, not independently deployable

## Process

### 1. Gather Context

For each module, read:

1. **Config schema** (`lib/config-schema.json`) — the single source of truth for all properties, types, required fields, enums, definitions, `oneOf`/`anyOf` branches, and constraints
2. **Existing sample configs** (`sample_configs/sample-config*.yaml`) — current coverage
3. **Existing synth tests** (`test/*.synth.test.ts`) — which configs are exercised

The config-schema.json contains everything needed for this analysis. Do not read TypeScript source, L3 constructs, or other code files.

Also read the **core app schema** (`packages/apps/core/app/lib/config-schema.json`) once to identify shared base properties that appear in every module's schema.

### 2. Analyze Schema Coverage

#### Exclusions

Skip the following when analyzing per-module coverage — these are inherited from the core app base config and only need coverage in the core app module itself:

- `nag_suppressions` / `MdaaNagSuppressionConfigs`
- `service_catalog_product_config` / `MdaaServiceCatalogProductConfig`
- `sagemakerBlueprint` / `MdaaSageMakerBluePrintConfig`
- Any other top-level properties that appear identically in the core app schema

Additionally, `MdaaRoleRef` only needs basic coverage (at least one each of `name`, `arn`, and `id` reference styles). Do not attempt exhaustive coverage of `MdaaRoleRef` optional fields (`immutable`, `sso`) in every module — these are covered once in a dedicated test. The `refId` field must NOT appear in any sample config — it is excluded from sample config coverage entirely.

Walk the config-schema.json and build a coverage map:

1. **Enumerate all schema paths** — every property at every nesting level, resolving `$ref` references into `definitions` to get the full property tree
2. **Classify each property**:
   - `required` vs `optional` (from the `required` array at each object level)
   - `enum` values — each enum value should appear in at least one sample config
   - `oneOf` / `anyOf` branches — these represent mutually exclusive options
   - `type` and nested structure (`object`, `array`, `string`, `number`, `boolean`)
   - Properties with `default` values — test both with and without explicit values where practical
3. **Map existing coverage** — for each schema path, check whether any existing sample-config\*.yaml exercises it
4. **Identify gaps** — schema paths with zero coverage

#### Root-Level Property Reconciliation (mandatory)

Before proceeding to recommendations, perform this mechanical check to catch overlooked properties:

1. **Extract the complete root property list** — read every key under `"properties"` at the root of config-schema.json (not inside `"definitions"`)
2. **Extract every top-level key** from each existing sample-config\*.yaml file
3. **Diff the two lists** — any root schema property not present as a top-level key in at least one sample config is a gap, unless it falls under the Exclusions above
4. **Output the diff explicitly** in the coverage report as a separate "Root-level property reconciliation" section

This catches the most common oversight pattern: optional properties with simple types (`Record<string, string>`, `object[]`, `boolean`) that have sensible defaults and produce no visible infrastructure on their own. These are easy to skip when writing configs bottom-up from "what do I need?" rather than top-down from "what does the schema expose?"

Properties at particular risk of being overlooked:

- Pass-through maps (`Record<string, string>`, `additionalProperties: {}`) — they lack nested structure that would draw attention during review
- Boolean flags with defaults — the module works identically without them
- Optional arrays of opaque objects (`object[]`) — no schema-enforced child structure to enumerate

#### Subtree Property Reconciliation (mandatory)

For every root-level property that IS present in a sample config, perform the same mechanical diff recursively on its children:

1. **Resolve the property's type** — follow any `$ref` into `definitions` to get the full object shape
2. **Enumerate all child properties** at every nesting level, building the complete subtree of schema paths
3. **Walk the corresponding YAML subtree** in the sample config and collect every key at every nesting level
4. **Diff the two trees** — any schema child path not exercised in at least one sample config is a gap
5. **Output the diff explicitly** in the coverage report as a "Subtree gaps" section, grouped by parent property

This catches the second most common oversight: a property is present at the root but only shallowly populated. Examples:

- `securityGroupIngress` present but only `ipv4` rules — missing `sg`, `prefixList` subtypes
- `databaseUsers` array has entries but omits optional child fields like `secretAccessRoles`
- `scheduledActions` present but `startTime`/`endTime` omitted from some entries
- `eventNotifications` present but only `email` — missing `severity` or `eventCategories`

The subtree diff must resolve `$ref` chains fully. A property defined as `$ref: "#/definitions/SomeType"` must be followed into `definitions.SomeType.properties` and each of those children checked recursively. Stop recursion at:

- Leaf types (`string`, `number`, `boolean`) — nothing to recurse into
- `additionalProperties` with no fixed child keys (e.g., `Record<string, string>`) — just needs at least one entry
- Circular `$ref` references — detect and skip
- CDK internal types (types whose properties are all `required` and reference CDK constructs like `Stack`, `Node`, `Connections`) — these are not config-exposed

For array properties (`type: "array"` with `items.$ref`), resolve the item type and check that at least one array entry in the sample config exercises all child properties of that item type.

### 3. Identify Mutually Exclusive Elements

Schema elements are mutually exclusive when they cannot coexist in a single valid config. Detect these purely from the schema:

- **`oneOf` / `anyOf` blocks** — different valid shapes for the same property or definition
- **`if`/`then`/`else` blocks** — conditional property requirements
- **`not` constraints** — properties that exclude each other
- **`additionalProperties: false`** combined with different `required` sets across `oneOf`/`anyOf` branches
- **Inline comments in existing sample configs** — hints like "Use maxCapacity or WorkerType. Not both." that indicate runtime exclusivity not captured in the schema

Each mutually exclusive branch needs its own sample-config file.

### 4. Produce Recommendations

For each module, output:

#### Coverage Report

```
Module: {module-name}
Schema paths total: N
Schema paths covered: M
Coverage: M/N (X%)

Root-level property reconciliation:
  Schema root properties: [list all]
  Covered in sample configs: [list all present in at least one sample-config]
  Missing: [list any not present — these are gaps]

Subtree gaps (properties present at root but with missing children):
  securityGroupIngress:
    - securityGroupIngress.sg (type: array, optional) — not exercised
    - securityGroupIngress.prefixList (type: array, optional) — not exercised
  databaseUsers[]:
    - databaseUsers[].secretAccessRoles (type: array, optional) — only in 1 of 2 entries
  scheduledActions[]:
    - scheduledActions[].startTime (type: string, optional) — missing in entry 1

Uncovered paths:
  - path.to.property (type: string, optional)
  - path.to.nested.property (type: enum[a,b,c], required)
  ...

Partially covered (e.g., not all enum values exercised):
  - path.to.enum.property: covered=[a], missing=[b,c]
```

#### Mutually Exclusive Groups

```
Group 1: projectName vs inline credentials
  - Branch A (sample-config.yaml): uses projectName
  - Branch B (sample-config-noproject.yaml): uses kmsArn, bucketName, deploymentRoleArn, securityConfigurationName

Group 2: maxCapacity vs workerType
  - Branch A: uses maxCapacity
  - Branch B: uses workerType + numberOfWorkers
```

#### Proposed Changes

For each gap:

1. **If the property is compatible with an existing sample-config** — add it to that config
2. **If the property is mutually exclusive with existing config content** — propose a new `sample-config-{variant}.yaml`
3. **For each new sample-config file** — propose a corresponding synth test

### 5. Implement Changes

#### Sample Config Files

- Follow existing naming convention: `sample-config-comprehensive.yaml` (primary comprehensive), `sample-config-minimal.yaml` (minimal), `sample-config-{variant}.yaml` (alternatives for mutually exclusive branches)
- **Naming is strict**: all sample config files MUST match the pattern `sample-config-minimal.yaml`, `sample-config-comprehensive.yaml`, or `sample-config-{variant}.yaml`. Names like `advanced-config.yaml`, `basic-config.yaml`, `sample-config.yaml` (without suffix), or `{variant}-sample-config.yaml` are not allowed.
- **Every module MUST have both** `sample-config-minimal.yaml` and `sample-config-comprehensive.yaml`. The minimal config demonstrates the simplest valid deployment that satisfies the module's core use case. The comprehensive config exercises every compatible non-excluded property at full depth.
- Every sample-config file must start with a header comment block written for end users (these configs are exposed via README as reference examples). For the primary config: describe the module's purpose and what this configuration demonstrates. For variant configs: explain the use case and when a user would choose this approach over the primary.
- Use template placeholders: `{{region}}`, `{{account}}`, `{{partition}}` for ARNs and region-specific values
- **YAML quoting rule for template variables**: When a `{{...}}` template variable is the entire value (e.g., `account: {{context:account-2}}`), it MUST be single-quoted (`account: '{{context:account-2}}'`) because YAML interprets a bare `{{` at the start of a value as a flow mapping. When `{{...}}` appears inside a longer string (e.g., `arn:{{partition}}:...`), quoting is optional but recommended for consistency. Never insert spaces inside template braces — `{{ region }}` is invalid, use `{{region}}`.
- **Account IDs**: Use `{{account}}` for the primary deployment account in all ARNs and account references. For cross-account references where a different account is needed (e.g., `additional_stacks`, `associatedAccounts`, `sourceAccount`, `destinationAccount`, `targetAccount`, `fromAccount`), use `{{context:account-2}}` for the first cross-account, `{{context:account-3}}` for a second, etc. Hard-coded 12-digit account IDs (e.g., `222222222222`) should never appear in sample configs — always use template variables. In test files (snapshot/synth/diff tests), set `'account-2': '222222222222'` and `'account-3': '333333333333'` in the CDK context. Never use `111111111111` in `additional_stacks` — these are always cross-account references.
- **ARN partition and region**: Always use `arn:{{partition}}:` (never `arn:aws:`). Always use `{{region}}` for region segments (never `us-east-1` or other hardcoded regions). No hard-coded partition, region, or account values should appear anywhere in sample configs. The only exception is ECR container URIs where the full URI is a single opaque string.
- Use realistic but clearly test-oriented values (e.g., `test-bucket`, `test-key-id`)

##### Comprehensive Config Completeness Rule

The primary sample config (typically `sample-config.yaml` or `sample-config-comprehensive.yaml`) must include every non-excluded root-level schema property that is compatible with the config's chosen branch of any mutually exclusive groups. "Comprehensive" means 100% coverage of compatible properties — not "most" or "as many as practical."

Specifically, the comprehensive config must contain:

- All required properties (obviously)
- All optional properties that are compatible with the other properties in the file
- All optional nested child properties within included parent objects, to maximum depth
- At least one entry for every optional array property, with all child properties populated
- At least one entry for every optional map/record property, with realistic key-value pairs
- Both `true` and `false` for boolean properties where practical (use `true` in comprehensive, test `false` in minimal or variant)
- Every enum value exercised across the set of sample configs (comprehensive should use the most common/default value; variants cover the rest)

If a property exists in the schema, is not excluded, and is not mutually exclusive with the comprehensive config's choices — it must be present. A missing compatible property in the comprehensive config is a bug.

When a module has a `sample-config-comprehensive.yaml` and a `sample-config-minimal.yaml`:

- **comprehensive** = every compatible property at full depth
- **minimal** = only required properties (plus enough optional properties to deploy the module's core resource if all properties are optional), demonstrating the simplest valid config that satisfies the module's core use case

**Minimal config core resource rule**: The minimal config must always deploy the module's primary/core resource, even if that resource's property is optional in the schema. A minimal config that only deploys supporting infrastructure (KMS keys, S3 buckets, IAM roles) without the module's namesake resource is a bug. For example:

- `ec2-app` minimal must include at least one `instances` entry
- `bedrock-builder-app` minimal must include at least one `agents` entry
- `quicksight-project-app` minimal must include at least one `sharedFolders` entry
- `dataops-databrew-app` minimal must include at least one `jobs` entry
- `sagemaker-project-app` minimal must include at least one `projects` entry
- `data-science-team-app` minimal must include `studioDomainConfig`

If the module uses a different naming convention (e.g., just `sample-config.yaml` as the primary), rename it to `sample-config-comprehensive.yaml` — the `sample-config.yaml` name without a suffix is deprecated.

#### Inline Documentation

Every property line in a sample-config must have a preceding comment derived from the `description` field in config-schema.json. This makes sample configs self-documenting and useful as reference examples.

Rules:

- Only optional properties get a `# (Optional)` prefix. Required is implied — no prefix needed.
- Follow with a concise description pulled from the schema's `description` for that property (resolve `$ref` to get descriptions from `definitions`)
- If the schema has `enum` values, append them: `(enum: gp2, gp3, io1, io2, sc1, st1, standard)`
- If the property has a `default`, append it: `(default: value)`
- Wrap comment lines at 100 characters. If a comment exceeds 100 chars, break it across multiple `#` lines.
- Place the comment on the line immediately above the property it documents
- For nested objects, document both the parent key and child properties

#### Role References in Sample Configs

Role references (`MdaaRoleRef`) appear throughout sample configs. Follow these rules:

- **Prefer `name:` or `arn:` over `id:`** — name and ARN are lower friction for users. Raw role IDs (e.g., `AROA...`) are harder to find and understand.
- **Only use `id:` in the datalake-app sample configs** as a reference example of all three styles. All other modules should use `name:` or `arn:`.
- **`generated-role-id:` is acceptable everywhere** — it's a convenient shorthand for MDAA-generated roles.
- **`ssm:` prefixed values are acceptable everywhere** — they're portable across environments.
- **Add a CONFIGURATION.md reference comment** once per file, above the first role reference property:
  ```yaml
  # See CONFIGURATION.md for role reference options (name, arn, id).
  ```
  This comment appears only once per file, not on every role ref.
- **Do not use developer-facing language** in README descriptions about role refs. Avoid "enum variants", "MdaaRoleRef styles", "id-style resolution". Instead use the actual values: "by name", "by ARN", "using role IDs for stable references".

#### Cross-Module Resource References

When a config value points to a resource typically created by another MDAA module or external infrastructure, add a two-line comment after the property description:

1. `# Often created by {source}.` — identifies where the resource comes from
2. `# Example SSM: ssm:/{path}` — shows the SSM parameter path pattern for portability

Sources use one of two patterns:

- **MDAA modules**: `# Often created by the {Module Name} module.`
- **External infrastructure**: `# Often created by your VPC/networking stack.`

SSM path patterns use one of two formats:

- **MDAA module resources**: `ssm:/{{org}}/{{domain}}/<descriptive_module_name>/{resource_path}`
  - `{{org}}` and `{{domain}}` are MDAA template variables that resolve to the current org/domain at deploy time
  - The module name placeholder is descriptive: `<datalake_module_name>`, `<roles_module_name>`, `<sagemaker_module_name>`, `<sftp_server_module_name>`
  - Resource path segments use `<angle_bracket>` placeholders: `<zone_name>`, `<role_name>`, `<domain_name>`
- **External resources**: `ssm:/path/to/{resource_type}` (e.g., `ssm:/path/to/vpc/id`)

Example:

```yaml
# VPC ID for cluster deployment
# Often created by your VPC/networking stack.
# Example SSM: ssm:/path/to/vpc/id
vpcId: vpc-testvpc

# S3 bucket name for data storage
# Often created by the Data Lake module.
# Example SSM: ssm:/{{org}}/{{domain}}/<datalake_module_name>/bucket/<zone_name>/name
locationBucketName: some-bucket-name

# IAM role ARN for job execution
# Often created by the Roles module.
# Example SSM: ssm:/{{org}}/{{domain}}/<roles_module_name>/role/<role_name>/arn
executionRoleArn: arn:{{partition}}:iam::{{account}}:role/my-role
```

Rules:

- Add these comments to **all** sample configs (minimal, comprehensive, and variants) — not just minimal
- Only annotate values that reference external resources (VPC IDs, subnet IDs, security group IDs, KMS key ARNs, bucket names, role ARNs, server IDs, domain config SSM params)
- Do NOT annotate module-internal values (instance types, port numbers, CIDR blocks, boolean flags, enum values, schedule expressions)
- Do NOT annotate values that already use `ssm:/` prefix — they're already portable
- Add the comment once per property, after the description comment

Example:

```yaml
# Sample config for the EC2 module.
# Provisions key pairs, security groups with ingress/egress rules,
# and EC2 instances with block devices and cfnInit bootstrapping.

# (Optional) Map of key pair names to key pair configurations. Private keys
# stored in Secrets Manager.
keyPairs:
  # Key pair with default settings
  test-key-pair: {}
  # Key pair with custom KMS encryption
  test-key-pair2:
    # (Optional) KMS key ARN to encrypt the key pair's private key in
    # Secrets Manager.
    kmsKeyArn: 'arn:{{partition}}:kms:{{region}}:{{account}}:key/test-key'

# (Optional) Map of security group names to security group configurations
securityGroups:
  sg1:
    # ID of the VPC in which to create the security group
    vpcId: vpc-testvpc
    # (Optional) Inbound traffic rules
    ingressRules:
      # Rules for IPv4 CIDR-based ingress
      ipv4:
        # IPv4 CIDR block to allow traffic from
        - cidr: 10.0.0.0/28
          # Port number to allow
          port: 443
          # IP protocol (enum: tcp, udp)
          protocol: tcp
```

#### Synth Tests

Each sample-config file must have a corresponding synth test. Follow the established pattern:

```typescript
test('SynthTest - {variant description}', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
    module_configs: './sample_configs/sample-config-{variant}.yaml',
  };
  const app = new { ModuleApp }({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
```

- Import the correct App class from `../lib/{module}`
- Match the test naming style of existing tests in the file
- If the existing synth test file uses `Template.fromStack()` assertions, add relevant assertions for the new config variant

#### Snapshot Tests

Each sample-config file must have a corresponding snapshot test using `snapShotTestApp` (app-level snapshot). Do NOT use `snapShotTest` (single-stack snapshot) — `snapShotTestApp` is a strict superset that captures all stacks including cross-account stacks. Use only `snapShotTestApp` with `Create.appProvider`.

Snapshot tests do NOT need per-test `addSnapshotSerializer` calls for `CONFIG:` path masking or `TemplateURL` masking. These are handled centrally:

- `CONFIG:` paths are normalized to relative paths at the source in `MdaaNagSuppressions.addConfigResourceSuppressions()` via `path.relative(process.cwd(), path.resolve(configFilePath))`
- `TemplateURL` values are replaced with `"REPLACED-TEMPLATE-URL"` by `maskTemplateUrls()` in the shared `snapShotTestApp` function
- `MDAA:` source locations already have `LINE:COL` masking at the source

Only add custom snapshot serializers for module-specific concerns (e.g., `isS3BucketWithSuffix` in sagemaker-app, `refresh` object in sagemaker-project-app).

#### README Integration

Every sample-config file must be referenced in the module's README.md. When adding, renaming, or removing sample configs, update the README to match.

The sample config section uses the heading `### Module Config Samples and Variants` (no filename in parentheses — the filename is mentioned in the explanation text below the heading).

Immediately after the heading, include this explanation line (substituting the actual filename from the module's MDAA Config snippet):

```
Copy the contents of the relevant sample config below into the `./module-name.yaml` file referenced in the MDAA config snippet above.
```

Each config then gets a subsection with:

1. An `####` heading describing the variant
2. A 1-2 sentence description of what the config demonstrates and when to use it, plus a use case sentence ("Start here when...", "Use this as a reference when...", "Choose this variant when...")
3. A markdown link: `[filename.yaml](sample_configs/filename.yaml)`
4. A fenced code block with MkDocs snippet include: `--8<-- "target/docs/packages/apps/{category}/{module}/sample_configs/filename.yaml"` (always use the full `target/docs/` path, never a relative `sample_configs/` path)

Config sections in the README must be ordered: minimal first, then comprehensive, then variant configs. This gives new users the simplest entry point first.

##### Description Language Rules

Sample config descriptions in the README must be written for end users, not developers:

- **Do NOT use**: "enum variants", "exercises every property", "non-excluded schema properties", "at full depth", "mutually exclusive with"
- **DO use**: actual values ("ON_CREATE and ON_DEMAND deployment modes"), practical language ("covers all available options"), user-facing scenarios ("when your organization uses SSO")
- **Minimal configs**: "Start here for..." or "Use this as a starting point when..."
- **Comprehensive configs**: "Use this as a reference when you need full control over..."
- **Variant configs**: "Choose this variant when..." or "Use this approach when..."
- **Noproject configs**: "Use this when deploying outside of a DataOps project, providing infrastructure references directly."
- Keep descriptions derived from the YAML file's header comment — they should stay in sync

##### Module Description (Top of README)

The description paragraph at the top of each README (after the title and note line, before the first `---`) should include a usage scenario sentence at the end: "Common scenarios include..." or "Use this module when you need to...". For modules that are alternatives to each other (e.g., SageMaker vs DataZone), explain when to choose each one.

When renaming a config file (e.g., `sample-config.yaml` → `sample-config-comprehensive.yaml`), update all references in the README, synth test, and snapshot test.

### 6. Validate

After implementing changes:

1. **Schema validation** — ensure each sample-config is valid against config-schema.json
2. **Synth test passes** — run `npx jest {test-file} --no-coverage` from the module directory
3. **No regressions** — existing tests still pass
4. **Coverage improvement** — re-run the coverage analysis to confirm gaps are closed
5. **README references** — every sample-config file in `sample_configs/` is referenced in README.md with the dual-include pattern (link + `--8<--` snippet), ordered minimal → comprehensive → variants

## Prioritization

When working across multiple modules, prioritize:

1. Modules with the lowest current coverage percentage
2. Modules with mutually exclusive branches that have no separate sample-config
3. Required properties that are uncovered (these indicate the sample config may not be exercising core functionality)
4. Enum properties with partial value coverage

## Anti-Patterns

### Minimal config that doesn't deploy the core resource

```yaml
# ❌ ec2-app minimal with only adminRoles — deploys KMS key but no EC2 instance
adminRoles:
  - name: Admin

# ✅ ec2-app minimal that actually deploys an EC2 instance
adminRoles:
  - name: Admin
securityGroups:
  my-sg:
    vpcId: vpc-testvpc
instances:
  my-instance:
    securityGroup: my-sg
    vpcId: vpc-testvpc
    subnetId: subnet-testsubnet
    availabilityZone: '{{region}}a'
    instanceType: t3.medium
    amiId: ami-test
    instanceRole:
      name: instance-role
    blockDevices:
      - deviceName: '/dev/sda1'
        volumeSizeInGb: 32
        ebsType: gp3
    osType: linux
```

### Incomplete "comprehensive" config

```yaml
# ❌ Comprehensive config that skips optional properties because "it works without them"
# parameterGroupParams, workloadManagement, and other optional properties omitted
# because the cluster deploys fine without them

# ✅ Comprehensive means ALL compatible properties present
# If the schema exposes it and it's not mutually exclusive, it belongs here
parameterGroupParams:
  max_concurrency_scaling_clusters: '1'
  enable_case_sensitive_identifier: 'true'
workloadManagement:
  - query_group: 'test-group'
    memory_percent_to_use: 50
    query_concurrency: 5
```

### Duplicating configs unnecessarily

```yaml
# ❌ Creating a separate config just because a property is optional
# sample-config-with-timeout.yaml — only differs by adding timeout: 60

# ✅ Add optional properties to the primary sample-config.yaml
# Separate configs are only for mutually exclusive elements
```

### Shallow coverage

```yaml
# ❌ Only testing top-level keys with minimal nesting
securityGroups:
  sg1:
    vpcId: vpc-test

# ✅ Exercise nested properties: ingressRules, egressRules, all rule types
securityGroups:
  sg1:
    vpcId: vpc-test
    ingressRules:
      ipv4:
        - cidr: 10.0.0.0/28
          port: 443
          protocol: tcp
    egressRules:
      prefixList:
        - prefixList: pl-test
          description: test prefix list
          protocol: tcp
          port: 443
      ipv4:
        - cidr: 10.0.0.0/28
          port: 443
          protocol: tcp
      sg:
        - sgId: sg-test
          port: 5432
          protocol: tcp
```

### Missing synth test for new config

```typescript
// ❌ Adding sample-config-variant.yaml without a synth test
// The config is never validated during CI

// ✅ Every sample-config-*.yaml has a corresponding synth test
```

## Execution Model

Use a sub-agent per module. Each module's analysis and implementation is independent, so delegate each module to its own `general-task-execution` sub-agent via `invokeSubAgent`.

### Sub-Agent Delegation

1. **Discover modules** — list all `*-app/` directories under `packages/apps/{ai,analytics,core,datalake,dataops,governance,utility}/`
2. **Read the core app schema once** — `packages/apps/core/app/lib/config-schema.json` — and pass the list of core base properties as context to each sub-agent so they know what to exclude
3. **Invoke one sub-agent per module** — each sub-agent receives:
   - The module path (e.g., `packages/apps/analytics/datawarehouse-app/`)
   - The core base property exclusion list
   - The full instructions from this steering guide (or a reference to it)
   - Context files: the module's `lib/config-schema.json` and existing `sample_configs/sample-config*.yaml`
4. **Each sub-agent independently**:
   - Reads the module's config-schema.json and sample configs
   - Performs the root-level property reconciliation
   - Analyzes full schema coverage
   - Identifies mutually exclusive groups
   - Produces the coverage report
   - Implements changes to sample configs and synth tests
   - Validates with `getDiagnostics` and `npx jest`
5. **Collect results** — after all sub-agents complete, summarize the overall coverage improvements

### Sub-Agent Prompt Template

When invoking each sub-agent, use a prompt like:

```
Analyze and improve sample-config completeness for the module at {module_path}.

Follow the sample-config-completeness steering guide. Key rules:
- Config-schema.json is the single source of truth — do not read TypeScript source
- Exclude these core base properties: {exclusion_list}
- The comprehensive sample config must include EVERY compatible non-excluded property
- Perform root-level property reconciliation: diff schema root properties against sample config top-level keys
- For mutually exclusive schema branches, create separate sample-config-{variant}.yaml files
- Every sample-config file needs a corresponding synth test
- Validate: getDiagnostics on changed files, then run npx jest {test-file} --no-coverage from the module directory

Output a coverage report, then implement all changes.
```

### Parallelization Notes

- Sub-agents are independent — no module depends on another module's sample configs
- The only shared input is the core app schema exclusion list, which should be computed once upfront
- If a module has no gaps (100% coverage already), the sub-agent should report that and exit without changes
- If running many modules, batch them in groups to avoid overwhelming the system — 3-5 concurrent sub-agents is a reasonable limit

## Module Paths

Apps: `packages/apps/{ai,analytics,core,datalake,dataops,governance,utility}/*-app/`

Excluded: `core/app`, `core/devops`, `dataops/dataops-shared-app` (see Excluded Modules above)

Schemas (centralized): `schemas/@aws-mdaa/*.json`
