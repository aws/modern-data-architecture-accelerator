---
scope: fileMatch
globs:
  - 'packages/apps/**/README.md'
  - 'packages/apps/**/sample-config*.yaml'
  - 'packages/apps/**/config-schema.json'
  - 'packages/apps/**/lib/*-config.ts'
  - 'packages/constructs/**/README.md'
  - 'packages/utilities/**/README.md'
  - 'packages/constructs/**/docs/*.drawio'
  - 'packages/constructs/**/docs/*.png'
  - 'packages/constructs/L3/**/lib/*.ts'
---

# Module Quality - Steering Guide

Audit and improve module quality across MDAA app modules — covering both README documentation and sample configuration completeness. This steering file combines the README and sample config workflows into a unified process.

The standards for READMEs and sample configs are defined in CONTRIBUTING.md. This steering file provides the process for auditing and implementing those standards.

#[[file:CONTRIBUTING.md]] #[[file:TESTING.md]]

## Scope

- **App modules**: `packages/apps/{category}/{module}-app/`
- **READMEs**: `README.md` in each module root
- **Sample configs**: `sample_configs/sample-config*.yaml`
- **Config schemas**: `lib/config-schema.json` (JSON Schema draft-07, auto-generated from TypeScript interfaces)
- **Architecture diagrams**: `packages/constructs/L3/{category}/{module}-l3-construct/docs/`

### Excluded Modules

- `packages/apps/core/app/` — base app class, not a deployable module
- `packages/apps/core/devops/` — CI/CD pipeline scaffolding
- `packages/apps/dataops/dataops-shared-app/` — shared config parser base class

## Process

### 1. Gather Context

For each module, read:

1. **README.md** — current documentation state
2. **Config schema** (`lib/config-schema.json`) — source of truth for all properties
3. **Existing sample configs** (`sample_configs/sample-config*.yaml`) — current coverage
4. **L3 construct source** (`packages/constructs/L3/{category}/{module}-l3-construct/lib/`) — discover deployed AWS resources and compliance controls from the code
5. **L3 construct docs/** — verify the architecture diagram exists and is current per "Architecture Diagram Currency" below

Do NOT rely on a static resource reference table. Discover AWS services and resources by reading the L3 construct source code — look for CDK resource instantiations, MDAA helper construct usage, and CloudFormation resource types.

### 2. Assess README

Score each module against the required structure from CONTRIBUTING.md:

| Section                | Check                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Title + description    | Module name as H1, meaningful description, usage scenario sentence                           |
| Deployed Resources     | `**Bold** - description` format, factual only, no compliance language                        |
| Architecture diagram   | Image reference to L3 construct docs                                                         |
| Related Modules        | Linked list with relationship descriptions                                                   |
| Security/Compliance    | Categorized sub-bullets, standard intro paragraph                                            |
| MDAA Config            | `mdaa.yaml` wiring snippet                                                                   |
| Sample config sections | All configs referenced with dual-include pattern, ordered minimal → comprehensive → variants |

#### Quality Checks

- Description is substantive, not just "CDK application to deploy {thing}"
- No compliance language in Deployed Resources (grep for "MDAA configures", "securely managed", "encrypted using")
- Sample config descriptions use user-facing language
- All `sample_configs/*.yaml` files are represented in the README

#### Written for a first-time reader, not for the MR

A module README is read by someone adopting the module at a release boundary. They did not see the MR that produced it, the alternatives considered, or the defects fixed along the way. Text that only makes sense with that context confuses them.

Flag README prose that:

- **Narrates the development process** — "we initially used X but switched to Y", "this was only discovered by testing against a live account", "pinned by a regression test", "verified across 12 services". The resulting fact is what the reader needs; how it was established is not.
- **Argues against an alternative the reader never saw** — "do not set X, it replaces the derived default" reads as a warning about a trap when the reader has no idea anyone set X. State what the property does and when to use it.
- **Repeats a rationale as emphasis.** A caveat stated once informs; the same warning restated four or five times reads as relitigating a bug the reader never hit. Keep it where a reader must act on it.
- **Contradicts the code it documents.** README assertions about behavior go stale when the code changes and nothing checks them. Verify each claim about validation, defaults, or failure modes against the current construct source — a README that states a limitation the code no longer has is worse than one that omits it.

A constraint the reader must respect belongs in the README. The investigation behind it does not belong anywhere — not in the README, and not relocated into a code comment. See "Document the constraint, not the investigation" in `developer-code-documentation.md`, which applies the same standard to comments and JSDoc.

This mirrors the CHANGELOG rule in `review-documentation.md` ("entries are release notes, not design documents"), applied to module READMEs.

### 3. Assess Sample Config Coverage

#### Schema Coverage Exclusions

Skip these inherited base properties — they only need coverage in the core app module:

- `nag_suppressions` / `MdaaNagSuppressionConfigs`
- `service_catalog_product_config` / `MdaaServiceCatalogProductConfig`
- `sagemakerBlueprint` / `MdaaSageMakerBluePrintConfig`

`MdaaRoleRef` only needs basic coverage (one each of `name`, `arn`, `id` styles). The `refId` field must NOT appear in any sample config.

#### Root-Level Property Reconciliation

1. Extract every key under `"properties"` at the root of config-schema.json
2. Extract every top-level key from each sample-config file
3. Diff — any root schema property not in at least one sample config is a gap

#### Subtree Property Reconciliation

For every root-level property that IS present, recursively diff its children against the schema:

1. Resolve `$ref` chains into `definitions` to get the full object shape
2. Enumerate all child properties at every nesting level
3. Walk the YAML subtree and collect every key
4. Diff — any schema child path not exercised is a gap

Stop recursion at leaf types, `additionalProperties` with no fixed keys, circular refs, and CDK internal types.

#### Mutually Exclusive Elements

Detect from the schema: `oneOf`/`anyOf` blocks, `if`/`then`/`else`, `not` constraints, and inline config comments. Each branch needs its own sample config file.

#### Comment Length and Schema Duplication

Sample configs are commented per `user-config-authoring.md` §2, but a comment that restates the config interface's JSDoc creates a second copy of the canonical description — one that goes stale the next time the schema changes and nothing checks it.

Flag any sample-config comment that:

- **Runs beyond ~4 lines for a single property.** Length is the symptom, not the defect — use it to find the ones worth reading, then judge the content.
- **Paraphrases the JSDoc.** Compare against the property's description in `config-schema.json`. If the comment carries the same facts in the same order, cut it to the actionable sentence and point at `SCHEMA.md`.
- **Explains why a default was chosen**, names a threat model or compliance control, or cites a dependency version floor. That belongs in the JSDoc and the module README.
- **Warns against a property absent from this file.** Same failure as the README rule in "Written for a first-time reader" — it reads as a warning about a trap the reader has no context for.

The test: a config author reads this to decide what to set. Text that instead justifies the module's design is in the wrong file. This is the sample-config counterpart to "Written for a first-time reader, not for the MR" above, and to "Document the constraint, not the investigation" in `developer-code-documentation.md`.

### 4. Produce Report

```
Module: {module-name}

README Status: GOOD | NEEDS_WORK | MISSING_README
  Missing sections: [list]
  Quality issues: [list]

Sample Config Coverage: M/N (X%)
  Root-level gaps: [list]
  Subtree gaps: [grouped by parent]
  Partially covered enums: [list]
  Mutually exclusive groups: [list]
  Over-long / JSDoc-duplicating comments: [file:line — property]
```

### 5. Implement Fixes

#### README Fixes

- For missing READMEs: create from scratch using L3 construct source to discover deployed resources
- For non-conforming structure: restructure to match the standard, preserving useful extra content
- For weak descriptions: rewrite to explain what the module deploys, what use case it enables
- For missing diagrams: add `<!-- Architecture diagram not yet available -->` placeholder
- Never refer to modules as "CDK applications"

#### Sample Config Fixes

- Add missing properties to existing configs where compatible
- Cut comments that duplicate the JSDoc or carry design rationale down to the actionable sentence, pointing at `SCHEMA.md` for the rest — do not delete the comment entirely, since every property still needs one
- Create new `sample-config-{variant}.yaml` for mutually exclusive branches
- Follow all standards from CONTRIBUTING.md (naming, template variables, inline docs, role refs, cross-module refs)
- Create corresponding synth, snapshot, and diff baseline tests for every new config
- Update README to reference new configs with dual-include pattern

### 6. Validate

1. `npm run test` in the affected package — all tests pass
2. `npm run lint` — no linting errors
3. Every README has all required sections
4. Every `sample_configs/*.yaml` is referenced in README
5. Every sample config has synth, snapshot, and diff baseline tests
6. No hardcoded account IDs, regions, or partitions in sample configs

## Anti-Patterns

### Minimal config that doesn't deploy the core resource

A minimal config that only deploys supporting infrastructure (KMS keys, IAM roles) without the module's namesake resource is a bug.

### Incomplete comprehensive config

If the schema exposes a property and it's not mutually exclusive with the config's choices, it belongs in the comprehensive config. "It works without it" is not a reason to omit it.

### Separate configs for non-exclusive properties

Only create separate config files for mutually exclusive elements. Optional properties that are compatible with the primary config belong in the comprehensive config.

### Shallow coverage

A property present at the root but only shallowly populated is a gap. Exercise nested properties to full depth.

### Compliance language in Deployed Resources

Encryption enforcement, access grants, and security group defaults belong in Security/Compliance, not Deployed Resources.

## Execution Model

For cross-module audits, use a sub-agent per module. Each module's analysis and implementation is independent — delegate via `invokeSubAgent` with `general-task-execution`.

## Module Paths

- Apps: `packages/apps/{ai,analytics,core,datalake,dataops,governance,utility}/*-app/`
- L3 Constructs: `packages/constructs/L3/{category}/{module}-l3-construct/`

## CI Agent Usage

This section is used by the automated Module Quality CI agent. When invoked by the agent,
Kiro receives the README, config schema, sample configs, config interface, L3 construct source,
and code diff for a single app module, and must produce structured JSON findings.

### JSON Output Schema

Write findings to `{output_file}` as a JSON object. No preamble, no markdown fences, no explanation
outside the JSON. The file must contain ONLY valid JSON.

```json
{
  "overall_risk": "HIGH | MEDIUM | LOW",
  "summary": "One paragraph summarizing the module's quality posture.",
  "findings": [
    {
      "risk": "HIGH | MEDIUM | LOW",
      "category": "readme_gap | readme_audience | schema_coverage | config_usability | schema_design | sample_config | jsdoc",
      "file": "path/to/file",
      "property": "propertyName (if applicable, empty string otherwise)",
      "detail": "What's wrong and what should be done."
    }
  ]
}
```

### Config Schema Usability Conventions

When reviewing config interfaces and generated schemas, check for these user-friendliness conventions:

**1. Named object maps over arrays with name properties**

Prefer `Record<string, T>` (renders as `additionalProperties` in JSON Schema) over `Array<T & { name: string }>`. Named maps let users reference resources by key in YAML, avoid ordering issues, and make diffs cleaner.

Bad (array with name property):

```yaml
buckets:
  - name: raw-data
    encryption: true
  - name: processed
    encryption: true
```

Good (named map):

```yaml
buckets:
  raw-data:
    encryption: true
  processed:
    encryption: true
```

**2. Top-level extensibility**

Module configs should allow new top-level schema elements for new resource types without breaking changes. The schema should be structured so adding a new resource category is additive — a new top-level key — rather than requiring changes to existing structures.

**3. Multiple named resources as the default pattern**

Modules should be designed to deploy multiple named instances of their primary resource type. Singular config objects (`clusterConfig: {...}`) that only support one resource instance are a design defect — the L3 construct should iterate over a named map and create N resources. Use plural top-level keys: `clusters:`, `instances:`, `buckets:`, etc.

This applies to all primary resources a module manages. Supporting infrastructure that is genuinely shared (e.g., a single KMS key, a single VPC reference) can remain singular, but the core resources the user is deploying should always use named maps.

Bad (singular object — limits to one resource):

```yaml
clusterConfig:
  engineVersion: '1.3.2.1'
instanceConfig:
  instanceType: db.r5.large
```

Good (named maps — supports multiple resources):

```yaml
clusters:
  my-cluster:
    engineVersion: '1.3.2.1'
instances:
  writer:
    instanceType: db.r5.large
  reader:
    instanceType: db.r5.large
```

**4. Strong type validation**

Minimize use of `any`, `unknown`, `object` without properties, or `additionalProperties: true` without constraints. Every config property should have the tightest type possible so that schema validation catches misconfigurations before deployment. Prefer enums over free-form strings when the set of valid values is known.

**5. Fast schema validation failure**

Config errors should be caught at schema validation time (JSON Schema `required`, `enum`, `pattern`, `minLength`, `additionalProperties: false` where appropriate) rather than failing silently in construct code or at CloudFormation deployment time. If a property combination is invalid, express that constraint in the schema (`if`/`then`, `oneOf`, `dependencies`) rather than relying on runtime checks.

**6. Safe defaults for optional booleans**

An optional boolean config property should default (when omitted) to the safer, more restrictive behavior — secure-by-default. A flag that weakens a security or isolation control when left unset is a usability and compliance hazard; either default it to the protective value or make the protective behavior unconditional.

**7. Property naming conventions**

- Use camelCase for all config properties — never snake_case (snake_case is only acceptable for values passed verbatim to AWS APIs as parameter keys, e.g., Neptune cluster parameter names)
- Include units in property names when the value represents a measurement: `backupRetentionDays` not `backupRetentionPeriod`, `queryTimeoutMs` not `queryTimeout`, `volumeSizeGb` not `volumeSize`
- Drop redundant suffixes like `Config` from config property names: `securityGroup` not `securityGroupConfig`, `bulkLoader` not `bulkLoaderConfig` (the fact that it's configuration is already implied by being in a config file)

**8. Use MDAA Role Refs for IAM principal references**

When a config property accepts IAM principal ARNs (for granting access, specifying execution roles, or listing read principals), use MDAA Role Ref format (`MdaaRoleRef[]`) rather than raw ARN string arrays. Role Refs support `name:`, `arn:`, `id:`, `generated-role-id:`, and `ssm:` prefixed values, providing flexibility and consistency with other MDAA modules.

Bad (raw ARN array):

```yaml
ssmReadPrincipals:
  - arn:aws:iam::123456789012:role/my-role
```

Good (MDAA Role Refs):

```yaml
ssmReadPrincipals:
  - name: my-role
  - arn: arn:{{partition}}:iam::{{account}}:role/other-role
```

**9. Shared infrastructure properties belong inside resource configs**

Properties that describe the deployment target (VPC ID, subnet IDs, security group IDs) should be nested inside the resource config that uses them, not floating at the app config root level. When a module supports multiple named resources, each resource may need different network configuration. Shared base properties that genuinely apply to all resources in the module can use a top-level `network:` or similar named section.

Bad (flat at root — doesn't scale to multiple resources):

```yaml
subnetIds: [subnet-1, subnet-2]
vpcId: vpc-123
clusterConfig:
  engineVersion: '1.3.2.1'
```

Good (nested inside resource config):

```yaml
clusters:
  my-cluster:
    engineVersion: '1.3.2.1'
    vpcId: vpc-123
    subnetIds: [subnet-1, subnet-2]
```

**10. No regional service-availability gating in construct code**

Do not add `govcloudMode`, `regionMode`, or similar boolean/enum flags that gate features based on assumed regional service availability. Regional service availability is a moving target maintained by AWS, not something to encode in construct logic. If a resource type isn't available in a region, CloudFormation will fail with a clear error at deploy time — which is better than a stale code-level gate that incorrectly blocks a now-available service or silently skips resources the user expects.

### Severity Classification for CI Agent

- **HIGH:** Missing README, missing comprehensive sample config, required README section missing (Deployed Resources, Security/Compliance, MDAA Config), required config property with no JSDoc (users can't configure without reading source), required property that should have a default, use of `any`/`unknown`/untyped `object` in a config-exposed interface where a specific type is feasible, README states a behavior the construct source contradicts (a limitation the code no longer has, a validation it does not perform, a default it does not apply)
- **MEDIUM:** README section non-conforming (wrong format, compliance language in Deployed Resources), README prose written for the MR rather than a first-time reader (narrates the development process, argues against an alternative the reader never saw, or repeats one rationale as emphasis), schema property not exercised in any sample config, sample config not referenced in README, inconsistent property naming, missing template variables (hardcoded account/region), sample config missing inline documentation comments, sample config comment that duplicates the property's JSDoc or explains design rationale rather than what to set (see "Comment Length and Schema Duplication"), array-with-name-property pattern where a named map would be more user-friendly, missing schema-level validation for constraints that are currently only enforced in code, `additionalProperties: true` on objects that have a known fixed set of keys, singular config object pattern (`clusterConfig`) where a named map (`clusters:`) should support multiple resources, property names missing units (`queryTimeout` instead of `queryTimeoutMs`), redundant `Config` suffix on property names, raw ARN arrays where MDAA Role Refs should be used, infrastructure properties (VPC/subnets) at root level instead of nested in resource config, regional service-availability gating flags (`govcloudMode`), `.drawio` modified without re-exporting its sibling `.png`, MR introduces a resource type the module's architecture diagram does not depict
- **LOW:** Missing architecture diagram, `.png` modified without a corresponding `.drawio` change, missing Related Modules section, style issues in sample config comments, enum value not exercised (but covered by other configs), weak JSDoc that restates the property name, opportunities to tighten string types to enums or patterns

### Rules for CI Agent Findings

- One finding per quality concern. Group related issues (e.g., multiple missing README sections) into one finding per category.
- Every finding must include `file` pointing to the file with the issue.
- For config usability, schema design, and JSDoc findings, include the `property` name.
- Only flag issues related to code that was CHANGED in this MR. Do not flag pre-existing quality gaps.
- For schema design findings (`schema_design` category), flag new or modified interfaces that violate the Config Schema Usability Conventions (arrays-with-name instead of maps, untyped properties, missing schema-level validation). Pre-existing patterns in unchanged code are not flagged.
- For L3 construct changes that affect the app module, check if the README's Deployed Resources and Security/Compliance sections still accurately reflect the construct's behavior.
- Order findings: HIGH first, then MEDIUM, then LOW.
- Use only ASCII characters in all string values.

## Architecture Diagram Currency

Each L3 construct's diagram is a pair: an editable `docs/{module}.drawio` source and an exported `docs/{module}.png` that the app and construct READMEs embed. Only the PNG is rendered to readers, so a `.drawio` edited without re-exporting leaves the published diagram silently wrong.

When auditing architecture diagrams, verify these patterns:

### Source and export stay in sync

A changed `docs/*.drawio` must have its sibling `docs/*.png` regenerated in the same change. A binary PNG appears in a diff as `Binary files ... differ` — that is the signal it was re-exported.

A `.png` that changes with no corresponding `.drawio` change means the export has no reproducible source, unless the module has no `.drawio` at all.

Editor metadata alone changes nothing visible and needs no re-export. Treat a `.drawio` change as metadata-only when it is confined to the `<mxfile>` element's `host=`, `agent=`, `version=`, `etag=`, or `modified=` attributes. A change to any `value=`, geometry, style, or to the set of `mxCell` elements is visible and does require re-export.

### The diagram depicts the module's resources

Adding, removing, or re-wiring AWS resources in an L3 construct — a new resource type, a new trigger or event source, a new queue, table, or role — should be reflected in the diagram. Judge against what the diagram depicts, read from its labels (`grep -o 'value="[^"]*"' <module>.drawio`).

Resources that a component-level diagram would not show are out of scope: log groups, metric filters, nag suppressions. A module with no `docs/` directory has a missing diagram, which is a separate finding rather than a currency failure.

## Config Schema Design Quality Checks

When auditing config schemas for quality, verify these patterns:

### Named Maps for Multi-Instance Resources

Modules that deploy multiple instances of the same resource type should use `{ [name: string]: Props }` maps, not arrays. Check that:

- The map key is used as the resource identifier (not a separate `name` property inside the object)
- Comprehensive configs include at least 2 entries to demonstrate the multi-instance pattern
- Minimal configs include exactly 1 entry with only required properties

### Top-Level Category Objects

Modules supporting multiple resource variants (e.g., PostgreSQL and MySQL) should use top-level category objects rather than a discriminator field. Check that:

- Each category has its own typed interface with variant-specific properties
- Categories are optional top-level keys (adding a new variant is additive, not breaking)
- Sample configs demonstrate at least one category fully

### Shared vs Per-Instance Resources

Verify that shared resources (KMS keys, VPCs, IAM roles) are resolved once and reused across instances, not duplicated per instance. Common patterns:

- A single KMS key for all clusters/tables in the module
- Project KMS key auto-wired via `projectName` + `kmsArn`
- Security groups created per instance (since they have instance-specific port/ingress rules)

### DataOps Project Integration

For modules under `packages/apps/dataops/`, verify:

- Config interface extends `MdaaDataOpsConfigContents`
- Config parser extends `MdaaDataOpsConfigParser`
- `projectName` is optional — module works standalone with its own resources
- When `projectName` is set, shared resources (KMS key, bucket, etc.) are auto-wired from SSM
