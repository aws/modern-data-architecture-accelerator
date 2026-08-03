---
scope: fileMatch
globs:
  - '**/*.yaml'
  - '**/*.yml'
---

# MDAA Configuration Authoring Standards

When creating or editing MDAA configuration files (`mdaa.yaml`, module configs, starter kits), follow these guidelines. Full reference: #[[file:CONFIGURATION.md]].

## Finding the Right Module

When you need a new capability, consult the MDAA README for the full module catalog organized by category (Governance, Data Lake, Data Ops, Analytics, AI, Utility). Each entry links to a module README with details on what it deploys and related modules.

## Creating a New Module Config

1. Read the module README for deployed resources, related modules, and sample configs
2. Start from a sample config in the module's `sample_configs/` directory. Use `sample-config-minimal.yaml` for a clean starting point or `sample-config-comprehensive.yaml` for full options
3. Read the module schema at `schemas/@aws-mdaa/<module-name>.json` for all valid properties, types, and descriptions
4. Add the module entry to `mdaa.yaml` under the appropriate domain/environment with `module_path: "@aws-mdaa/<module-name>"`
5. Create the module config yaml file with a schema directive on line 1: `# yaml-language-server: $schema=<path-to-schema>`

## Editing Existing Configs

Each config file references its JSON schema via the `# yaml-language-server: $schema=...` directive on line 1. Read that schema file to understand valid properties, required fields, types, and descriptions.

## 1. Use dynamic references instead of hardcoded values

Never hardcode account IDs, regions, ARNs, or cross-module values. Use the dynamic reference system described in the [Dynamic References](../CONFIGURATION.md#dynamic-references) section of CONFIGURATION.md.

Preferred patterns, in order:

- **SSM domain references** for values from modules in the same domain: `ssm-domain:/other_module/some_path`
- **SSM org references** for values from modules in a different domain: `ssm-org:/other_domain/other_module/some_path`
- **Context variables** for values that vary per deployment: `"{{context:vpc_id}}"`
- **Built-in variables** for org/domain/env/account/region: `"{{account}}"`, `"{{region}}"`, `"{{partition}}"`
- **CloudFormation resolve** for existing SSM parameters: `"{{resolve:ssm:/path/to/param}}"`
- **Inline composition** when building ARNs or paths: `arn:{{partition}}:kms:{{region}}:{{account}}:key/{{context:key_id}}`

Avoid: literal account IDs (`123456789012`), region strings (`us-east-1`), or copy-pasted ARNs.

## 2. Comment every configuration line

Each config property should have a YAML comment explaining what it does and why. Comments help future users understand intent, not just structure.

```yaml
# Good
# KMS key alias used to encrypt the Glue Data Catalog
catalogKeyAlias: glue-catalog-key

# Bad — no explanation
catalogKeyAlias: glue-catalog-key
```

For module entries in `mdaa.yaml`, include a comment describing the module's purpose:

```yaml
# Deploys S3 data lake buckets with three-zone layout (raw, transformed, curated)
datalake:
  module_path: "@aws-mdaa/datalake"
  module_configs:
    - ./datalake/datalake.yaml
```

## 3. Create portable, reusable config files

- Extract shared configuration into separate YAML files referenced via `module_configs` rather than inlining with `module_config_data`.
- Use `env_templates` for module sets that repeat across domains or accounts.
- Use `context` variables at the appropriate hierarchy level (global, domain, env, module) so configs work across environments without modification.
- Keep environment-specific values (account IDs, VPC IDs, subnet IDs) in `context` blocks, not in module config files.

```yaml
# Good — reusable template, environment-specific values in context
env_templates:
  common:
    modules:
      roles:
        module_path: '@aws-mdaa/roles'
        module_configs:
          - ./common/roles.yaml

domains:
  team1:
    environments:
      dev:
        account: '{{context:team1_account}}'
        template: common
```

## 4. Account-level modules

Modules marked as account-level (`@aws-mdaa/glue-catalog`, `@aws-mdaa/lakeformation-settings`, `@aws-mdaa/macie-session`, `@aws-mdaa/quicksight-account`) can only be deployed once per AWS account. Always annotate them:

```yaml
# NOTE: Account-level module — can only be deployed once per AWS account.
glue-catalog:
  module_path: '@aws-mdaa/glue-catalog'
```

If multiple domains share an account, deploy the account-level module in one domain only.

## 5. Role References

Roles are referenced using the MdaaRoleRef format:
- `name: RoleName` — simplest, expands to full ARN in deployment account
- `arn: arn:aws:iam::123456789012:role/Role` — cross-account or SSM-stored ARNs
- `id: AROA...` — immutable role ID reference
- `id: generated-role-id:my-role-name` — resolves from MDAA Roles module SSM parameters

## 6. CDK Nag Suppressions

Lines marked `# TODO: Review the below...` contain commented-out CDK Nag suppressions. Review the permissions above each suppression before uncommenting. Only uncomment suppressions you have confirmed are acceptable for your security posture.

## 7. Deploying

- `npx mdaa ls` — list stacks that will be deployed
- `npx mdaa synth` — synthesize CloudFormation templates for review
- `npx mdaa deploy` — deploy all modules
- `npx mdaa diff` — show what will change on next deploy

## 8. Adding a new config field: extend the comprehensive sample by default

When you add a new optional config field to a module, **add it to the existing comprehensive sample config** (and let its baseline regenerate) rather than creating a new standalone `sample-config-<feature>.yaml`. Most fields are purely additive (like `dataProtection`, `logRetentionDays`, `alarms`) and belong alongside the other options in the comprehensive config, which exists to demonstrate every available option together.

**Only create a new dedicated sample config when the new field is incompatible with the comprehensive sample** — i.e. it is mutually exclusive with at least one field already present there, so the two cannot coexist in one valid config. Examples in the AgentCore Runtime module: `codePath` (mutually exclusive with the comprehensive config's `containerUri`) and `enforceVpcOnly` variants. In those cases the standalone config + its own `baselineDiffTestApp` entry + baseline are required, because the branch cannot be exercised from the comprehensive config.

This complements the testing-standards rule "mutually exclusive config branches each have dedicated sample configs and tests": that rule is the *exception*, and extending the comprehensive config is the *default*. Internal mutually-exclusive branches of an otherwise-additive field (e.g. `alarms.notificationTopicArn` vs `alarms.createNotificationTopic`) are covered by L3 construct unit tests, not by separate app-level sample configs.
