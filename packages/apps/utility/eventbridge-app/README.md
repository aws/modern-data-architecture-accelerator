# EventBridge

> **Note:** This documentation is also available in a rendered format [here](https://aws.github.io/modern-data-architecture-accelerator/packages/apps/utility/eventbridge-app/index.html).

Deploys Amazon EventBridge custom event buses with automatic event archiving, configurable retention periods, and resource-based policies for cross-principal event publishing. Use this module when you need a custom event bus for decoupling data pipeline components, routing S3 notifications, or enabling event-driven communication between services.

---

## Deployed Resources

This module deploys and integrates the following resources:

- **EventBridge Custom Event Buses**: Custom event buses with optional principal-based access policies. Event archive is automatically created for each bus with configurable retention period.

![EventBridge](../../../constructs/L3/utility/eventbridge-l3-construct/docs/EventBridge.png)

---

## Related Modules

- [Lambda Functions](../../dataops/dataops-lambda-app/README.md) — Deploy Lambda functions that can be triggered by EventBridge rules on custom event buses
- [Step Functions](../../dataops/dataops-stepfunction-app/README.md) — Step Functions can be triggered by EventBridge rules for event-driven orchestration
- [Data Lake](../../datalake/datalake-app/README.md) — Data lake buckets can publish S3 EventBridge notifications to custom event buses

---

## Security/Compliance Details

This module is designed in alignment with MDAA security/compliance principles and CDK nag rulesets. Additional review is recommended prior to production deployment, ensuring organization-specific compliance requirements are met.

- **Least Privilege**:
  - Each event bus can be configured with a resource policy granting PutEvent access to specific IAM ARNs or AWS service principals
  - Only explicitly listed principals can publish events

---

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
eventbridge: # Module Name can be customized
  module_path: '@aws-mdaa/eventbridge' # Must match module NPM package name
  module_configs:
    - ./eventbridge.yaml # Filename/path can be customized
```

### Module Config Samples and Variants

Copy the contents of the relevant sample config below into the `./eventbridge.yaml` file referenced in the MDAA config snippet above.

#### Minimal Configuration

Deploys a single custom event bus with no optional properties. Start here for a basic custom event bus that other modules can publish events to.

[sample-config-minimal.yaml](sample_configs/sample-config-minimal.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/utility/eventbridge-app/sample_configs/sample-config-minimal.yaml"
```

#### Comprehensive Configuration

Includes multiple event buses with all optional fields and both principal types (IAM ARN and AWS service). Start here when evaluating all available options for event bus policies, archive retention, and cross-principal access.

[sample-config-comprehensive.yaml](sample_configs/sample-config-comprehensive.yaml)

```yaml
# Contents available via above link
--8<-- "target/docs/packages/apps/utility/eventbridge-app/sample_configs/sample-config-comprehensive.yaml"
```

---

[Config Schema Docs](SCHEMA.md)
