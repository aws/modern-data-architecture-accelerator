# DataZone

The DataZone CDK application is used to configure and deploy DataZone Domains and associated resources such as environment blueprints.

---

## Deployed Resources and Compliance Details

![datazone](../../../constructs/L3/governance/datazone-l3-construct/docs/DataZone.png)

- **DataZone Domain** - A DataZone Domain

- **KMS CMK** - A KMS CMK specific to each domain created

- **Domain Execution Role** - An IAM Role used by DataZone. This role is specific to the domain.

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
datazone: # Module Name can be customized
  module_path: '@aws-caef/datazone' # Must match module NPM package name
  module_configs:
    - ./datazone.yaml # Filename/path can be customized
```

### Module Config (./datazone.yaml)

[Config Schema Docs](SCHEMA.md)

```yaml
# The arn of the KMS key used to encrypt the glue catalog in this account
glueCatalogKmsKeyArn: test-glue-catalog-key-arn
# List of domains to create
domains:
  # domain's name (must be unique)
  test-domain:
    # Arns for IAM roles which will be provided to the projects's resources (IE bucket)
    dataAdminRole:
      name: Admin
    # Required - Description to give to the domain
    description: DataZone Domain Description

    # Optional - Type of SSO (default: DISABLED): DISABLED | IAM_IDC
    singleSignOnType: DISABLED

    # Optional - How Users are assigned to domain (default: MANUAL): MANUAL | AUTOMATIC
    userAssignment: MANUAL

    # Optional - Additional accounts which will be associated to the domain
    associatedAccounts:
      # A friendly name for the associated account
      associated-account-name:
        # The AWS account number fo the associated account.
        # Note, this also needs to be configured as an "additional_account" on the MDAA module within mdaa.yaml
        account: '1234567890'
        # The arn of the KMS key used to encrypt the glue catalog in this associated account
        glueCatalogKmsKeyArn: test-associated-glue-catalog-key-arn
        # Optional -Admin users which will be added from the associated account for this domain.
        # These users will be able to administer the domain from within the associated account
        adminUsers:
          # A friendly name for the associated account admin
          associated-account-admin-name:
            # The user type. One of IAM_ROLE or SSO_USER
            userType: IAM_ROLE
            # The role reference (required for userType IAM_ROLE )
            role:
              arn: associated-account-admin-role-arn
```
