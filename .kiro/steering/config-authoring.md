---
inclusion: fileMatch
fileMatchPattern: '**/*.yaml,**/*.yml'
---

# MDAA Configuration Authoring Standards

When creating or editing MDAA configuration files (`mdaa.yaml`, module configs, starter kits), follow these guidelines. Full reference: #[[file:CONFIGURATION.md]].

## 1. Use dynamic references instead of hardcoded values

Never hardcode account IDs, regions, ARNs, or cross-module values. Use the dynamic reference system described in the [Dynamic References](../../CONFIGURATION.md#dynamic-references) section of CONFIGURATION.md.

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
