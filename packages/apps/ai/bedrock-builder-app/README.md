# Bedrock Builder

The Bedrock Builder CDK application is used to configure and deploy a secure Bedrock Agent, Knowledge bases and associated resources.

***

## Deployed Resources and Compliance Details

![bedrock-builder](../../../constructs/L3/ai/bedrock-builder-l3-construct/docs/bedrock-builder.png)

* **Bedrock Agent**: Deploys Amazon Bedrock Agent(s) to streamline workflows and/or automate repetitive tasks using Foundational Models
* **Bedrock Execution Policy**: Allows Bedrock Agent Role to access Knowledge Base, Foundational Model and Bedrock Guardrails.
* **Agent Execution Role**: Bedrock Execution Policy will be attached to the External Agent Role. This role should have Bedrock Service as a Trusted Principal. 
* **Agent KMS Key**: Encrypt Agent resources with the KMS Key. One will be generated if a KMS key is not provided as part of Agent Configuration
* **Lambdas**: (Optional) Allows you to generate Lambda Layer, Lambda Function or both, which can be associate with Agent Action Group. (*Refer: [MDAA DataOps-LambdaFunctions](../../dataops/dataops-lambda-app/README.md)*)
  * **Lambda Layers** - Lambda layers which can be used in Lambda functions (inside or outside of this config)
  * **Lambda Functions** - Lambda function(s) for Agent Action Group(s)
    * May be optionally VPC bound with configurable VPC, Subnet, and Security Group Paramters

    * Can use an existing security group (from Project, for instance), or create a new security group per function
    * If creating a per-function security group:

      * All egress allowed by default (configurable)
      * No ingress allowed (not configurable)
* **Action Group(s)**: Create Agent Action group for Bedrock Agent. It allows you to either use an existing Lambda function (by providing its ARN directly) or create a new one as part of the agent configuration. The `generated-function:` prefix tells the system to use the Lambda that was created from the configuration rather than looking for an existing function ARN

* **Bedrock Guardrail**: (Optional) If Bedrock Guardrail is mentioned in the configuration, the Agent will be associate with Bedrock Guardrail. 
  
  *Bedrock execution policy will also be updated to allow `ApplyGuardrail` permission on the provided `GuardrailID`*



***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          bedrock-builder: # Module Name can be customized
            module_path: "@aws-caef/bedrock-builder" # Must match module NPM package name
            module_configs:
              - ./bedrock-builder.yaml # Filename/path can be customized
```

### Module Config (./bedrock-builder.yaml)

[Config Schema Docs](SCHEMA.md)

```yaml
# List of admin roles which will be provided access to agent resources (like KMS/Bucket)
dataAdminRoles:
  - name: "Admin"

# Execution Role for Bedrock Agent
# Role should have necesasry permissions to other serivces/resources created outside of Agent Configuration
# Some customer managed execution policies will be added this role
# If external resources use KMS key to encrypt/decrypt, then necesary KMS key permissions should be provided to this role
# If you're using KnowledgeBases, Refer https://docs.aws.amazon.com/bedrock/latest/userguide/kb-permissions.html
bedrockAgentExecutionRole: 
    id: generated-role-id:agent-execution-role

# (Optional) List of Lambda functions. Agent will be able to invoke these functions based on the action group(s)
# Lambda function will hold the business logic. Bedrock agent will pass necessary parameters
# You have option to define the lambda(s) as part of Agent configuration, where these functions will be deployed before creating the Agent action groups.
# OR, you can provide lambda ARN if there is any existing one that you'd like the action group to use. 
lambdaFunctions:
  functions:
    - functionName: test-agent-lambda
      description: "This is lambda function for Bedrock Agent Action group: test-agent/test-action-group"
      srcDir: ./lambda/src
      handler: test_function.lambda_handler
      runtime: python3.13
      roleArn: generated-role-arn:agent-lambda-role  # OR provide SSM parameter like "ssm:/path/to/agent-lambda-role/arn"
      layerArns:
        # Provide an existing lambda layer
        AWSLambdaPowertoolsPythonV3-python312-x86_64: arn:aws:lambda:us-east-1:{{account}}:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:3


# Bedrock Agent Configuration
agents:
  test-agent-01:
    foundationModel: "amazon.titan-text-premier-v1:0"
    # Instructions that tell the agent what it should do and how it should interact with users
    instruction: |
      You are an agent that can handle various tasks related to insurance claims, including looking up claim 
      details, finding what paperwork is outstanding. Only send reminders if you have been 
      explicitly requested to do so. If an user asks about your functionality, provide guidance in natural language 
      and do not include function names on the output.

    # (Optional parameters)
    description: "This is a Test Agent with Action Group"
    agentAliasName: "test-alias"
    # Specifies whether to automatically update the DRAFT version of the agent after making changes to the agent
    autoPrepare: true                     # Default: false
    
    # The number of seconds for which Amazon Bedrock keeps information about a user's conversation with the agent
    idleSessionTtlInSeconds: 400
    # Configuration information for a guardrail that you use with the Converse operation
    guardrailConfiguration:
      guardrailIdentifier: "<guardrail-id>"
      guardrailVersion: "<guardrail-version>"
    actionGroups:
      - actionGroupName: "test-action-group"
        description: "This is a Test Action Group"
        actionGroupExecutor:
          # Option 1: Provide ARN of an existing Lambda
          # Option 2: Provide reference to Lambda function which will be generated via Configuration. refer them by generatedFunction:<function-name>
          lambda: generated-function:test-agent-lambda   # OR arn:aws:lambda:{{region}}:{{account}}:function:existing-lambda-function
        apiSchema: 
          # (Optional) 
          # 1. 'payload': Provide JSON/YAML formatted payload defining the OpenAPI schema for Action Group
          # 2. 'openApiSchemaPath': (local) relative path to YAML file
          # 3. OR 's3': Provide details about s3 object containing OpenAPI schema for Action Group
          openApiSchemaPath: ./api-schema/test-automation-open-api.yaml

  test-agent-02:
    foundationModel: "anthropic.claude-v2:1"
    instruction: |
      You are an agent that can handle various tasks related to insurance claims, including looking up claim 
      details, finding what paperwork is outstanding, and sending reminders. Only send reminders if you have been 
      explicitly requested to do so. If an user asks about your functionality, provide guidance in natural language 
      and do not include function names on the output.
    description: "This is a Test Agent with Knowledge Base"
    autoPrepare: true                     
    knowledgeBases:
      - description: "This is a Test Knowledge Base"
        knowledgeBaseId: "<kb-id>"        
```
