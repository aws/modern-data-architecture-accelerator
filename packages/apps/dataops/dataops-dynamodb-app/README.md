# DynamoDB

The Data Ops DynamoDB CDK application is used to deploy the resources required to orchestrate data operations on the data lake (primarily Glue Crawlers, Glue Jobs, Step Functions and Lambdas).

***

## Deployed Resources and Compliance Details

![Mdaa Dynamodb Architecture](../../../constructs/L3/dataops/dataops-dynamodb-l3-construct/docs/dataops-dynamodb.png)

**DynamoDB** - DynamoDB tables will be created for each table specification in the configs

* DynamoDB table configs can be handcrafted using the simple yaml files

***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          dataops-dynamodb: # Module Name can be customized
            module_path: "@aws-mdaa/dataops-dynamodb" # Must match module NPM package name
            module_configs:
              - ./dataops-dynamodb.yaml # Filename/path can be customized
```

### Module Config (./dataops-stepfunction.yaml)

[Config Schema Docs](SCHEMA.md)

### Sample DynamoDB Config

DynamoDB configs are stored under the ./dynamodb/ directory, relative to the dynamodb config. Multiple dynamodb tables can be defined in a single config file or across multiple files, as long as they have globally unique names.

```yaml

# (Required) Name of the Data Ops Project
# Name the project the resources of which can be used by this dynamodb app.
# Other resources within the project can be referenced in the dynamodb config using
# the "project:" prefix on the config value.
projectName: dataops-project-sample
# List of dynamodb definitions
tableDefinitions:
  table-complex:
    # Partition key, required
    partitionKey:
      name: pk1
      type: S
    # Sort key, optional
    sortKey:
      name: sk1
      type: S
    # if PROVISIONED will need to indicate the read and write capacities
    billingMode: PROVISIONED
    # For an item up to 4 KB, one read capacity unit (RCU) represents one strongly consistent read operation per second, or two eventually consistent read operations per second
    readCapacity: 2
    # A write capacity unit (WCU) represents one write per second for an item up to 1 KB
    writeCapacity: 1
    # a specific attribute to store the TTL expiration timestamp, see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
    timeToLiveAttribute: ttl
  table-simple:
    # Partition key, required
    partitionKey:
      name: pk1
      type: S
    # if PAY_PER_REQUEST don't indicate read/write capacity
    billingMode: PAY_PER_REQUEST
```
