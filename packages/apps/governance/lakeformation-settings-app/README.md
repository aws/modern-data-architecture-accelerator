# Lakeformation Settings

The LakeFormation Settings CDK application is used to configure an account's LakeFormation Settings, including administrator roles and default permissions for databases/tables. The LakeFormation Settings app should be deployed only once per account.

***

## Deployed Resources and Compliance Details

![LakeFormationSettings](../../../constructs/L3/governance/lakeformation-settings-l3-construct/docs/LakeFormationSettings.png)

**LakeFormation Settings** - Deployed to configure LakeFormation admins and default permissions
  
* Data Lake Administrator access granted to lakeFormationAdminRoles
* Controls default LF behaviour for IAM Allowed Principals on new Glue Databases/Tables
* IAM Allowed Principals defaults should be disabled when using LakeFormation

***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          lakeformation-settings: # Module Name can be customized
            module_path: "@aws-caef/lakeformation-settings" # Must match module NPM package name
            module_configs:
              - ./lakeformation-settings.yaml # Filename/path can be customized
```

### Module Config (./lakeformation-settings.yaml)

[Config Schema Docs](SCHEMA.md)

```yaml
# The list of Lake Formation Admin role references.
lakeFormationAdminRoles:
  - name: Admin

# If true, LakeFormation will add IAM_ALLOWED_PRINCIPALS
# permission by default to all new databases and tables.
# This results in LakeFormation deferring to IAM permissions
# which may have been granted via IAM policies directly against
# Glue catalog resources.
# If false (default), all permissions must be managed exclusively within
# LakeFormation.
iamAllowedPrincipalsDefault: true
```
