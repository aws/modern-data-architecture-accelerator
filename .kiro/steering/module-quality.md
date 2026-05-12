---
inclusion: fileMatch
fileMatchPattern: 'packages/apps/**/README.md,packages/apps/**/sample-config*.yaml,packages/apps/**/config-schema.json'
---

# Module Quality - Steering Guide

Audit and improve module quality across MDAA app modules — covering both README documentation and sample configuration completeness. This steering file combines the README and sample config workflows into a unified process.

The standards for READMEs and sample configs are defined in CONTRIBUTING.md. This steering file provides the process for auditing and implementing those standards.

#[[file:CONTRIBUTING.md]]
#[[file:TESTING.md]]

## Scope

- **App modules**: `packages/apps/{category}/{module}-app/`
- **READMEs**: `README.md` in each module root
- **Sample configs**: `sample_configs/sample-config*.yaml`
- **Config schemas**: `lib/config-schema.json` (JSON Schema draft-07, auto-generated from TypeScript interfaces)
- **Architecture diagrams**: `packages/constructs/L3/{category}/{module-l3-construct}/docs/`

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
5. **L3 construct docs/** — verify architecture diagram exists

Do NOT rely on a static resource reference table. Discover AWS services and resources by reading the L3 construct source code — look for CDK resource instantiations, MDAA helper construct usage, and CloudFormation resource types.

### 2. Assess README

Score each module against the required structure from CONTRIBUTING.md:

| Section | Check |
|---------|-------|
| Title + description | Module name as H1, meaningful description, usage scenario sentence |
| Deployed Resources | `**Bold** - description` format, factual only, no compliance language |
| Architecture diagram | Image reference to L3 construct docs |
| Related Modules | Linked list with relationship descriptions |
| Security/Compliance | Categorized sub-bullets, standard intro paragraph |
| MDAA Config | `mdaa.yaml` wiring snippet |
| Sample config sections | All configs referenced with dual-include pattern, ordered minimal → comprehensive → variants |

#### Quality Checks

- Description is substantive, not just "CDK application to deploy {thing}"
- No compliance language in Deployed Resources (grep for "MDAA configures", "securely managed", "encrypted using")
- Sample config descriptions use user-facing language
- All `sample_configs/*.yaml` files are represented in the README

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
      "category": "readme_gap | schema_coverage | config_usability | schema_design | sample_config | jsdoc",
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

**3. Multiple resources of the same type via named maps**

When a module can deploy multiple instances of the same resource type (e.g., multiple buckets, multiple crawlers), the schema should use a named map at the top level for that resource type. This lets users define N resources with distinct names and configurations.

**4. Strong type validation**

Minimize use of `any`, `unknown`, `object` without properties, or `additionalProperties: true` without constraints. Every config property should have the tightest type possible so that schema validation catches misconfigurations before deployment. Prefer enums over free-form strings when the set of valid values is known.

**5. Fast schema validation failure**

Config errors should be caught at schema validation time (JSON Schema `required`, `enum`, `pattern`, `minLength`, `additionalProperties: false` where appropriate) rather than failing silently in construct code or at CloudFormation deployment time. If a property combination is invalid, express that constraint in the schema (`if`/`then`, `oneOf`, `dependencies`) rather than relying on runtime checks.

### Severity Classification for CI Agent

- **HIGH:** Missing README, missing comprehensive sample config, required config property with no JSDoc (users can't configure without reading source), required property that should have a default, use of `any`/`unknown`/untyped `object` in a config-exposed interface where a specific type is feasible
- **MEDIUM:** README section missing or non-conforming, schema property not exercised in any sample config, inconsistent property naming, missing template variables (hardcoded account/region), sample config missing inline documentation comments, array-with-name-property pattern where a named map would be more user-friendly, missing schema-level validation for constraints that are currently only enforced in code, `additionalProperties: true` on objects that have a known fixed set of keys
- **LOW:** Minor documentation improvements, style issues in sample config comments, enum value not exercised (but covered by other configs), weak JSDoc that restates the property name, opportunities to tighten string types to enums or patterns

### Rules for CI Agent Findings

- One finding per quality concern. Group related issues (e.g., multiple missing README sections) into one finding per category.
- Every finding must include `file` pointing to the file with the issue.
- For config usability, schema design, and JSDoc findings, include the `property` name.
- Only flag issues related to code that was CHANGED in this MR. Do not flag pre-existing quality gaps.
- For schema design findings (`schema_design` category), flag new or modified interfaces that violate the Config Schema Usability Conventions (arrays-with-name instead of maps, untyped properties, missing schema-level validation). Pre-existing patterns in unchanged code are not flagged.
- For L3 construct changes that affect the app module, check if the README's Deployed Resources and Security/Compliance sections still accurately reflect the construct's behavior.
- Order findings: HIGH first, then MEDIUM, then LOW.
- Use only ASCII characters in all string values.
