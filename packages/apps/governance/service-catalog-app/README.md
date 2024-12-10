# Service Catalog

The ServiceCatalog CDK application is used to deploy Service Catalog resources which can be used within a broader data environment.

## Deployed Resources and Compliance Details

![ServiceCatalog](../../../constructs/L3/governance/service-catalog-l3-construct/docs/ServiceCatalog.png)

**Service Catalog Portfolios** - Portfolios to which products can be added via the MDAA framework.

**Portfolio Principal Association** - Associates IAM Roles to a portfolio

***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          service-catalog: # Module Name can be customized
            module_path: "@aws-caef/service-catalog" # Must match module NPM package name
            module_configs:
              - ./service-catalog.yaml # Filename/path can be customized
```

### Module Config (./service-catalog.yaml)

[Config Schema Docs](SCHEMA.md)

```yaml
# List of portfolios to be created
portfolios:
  #The portfolio name
  TestPortfolio:
    # The provider Name
    providerName: "test-provider"
    # Option portfolio description
    description: "testing description"
    # List of role references to which portfolio access will be granted
    access:
      - name: Admin
```
