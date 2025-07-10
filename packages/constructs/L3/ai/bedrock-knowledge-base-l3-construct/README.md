# Bedrock Knowledge Base L3 Construct

This construct provides a high-level abstraction for creating Amazon Bedrock Knowledge Bases with vector storage and data sources.

## Features

- **Knowledge Base Creation**: Creates Bedrock knowledge bases with vector configurations
- **Vector Store Management**: Automatic Aurora PostgreSQL vector database setup
- **S3 Data Sources**: Support for multiple S3 data sources with ingestion configurations
- **Vector Ingestion**: Advanced parsing and chunking strategies
- **Auto-Sync**: Optional Lambda-based automatic synchronization with S3 changes
- **IAM Management**: Automatic creation of required IAM policies and roles
- **Logging**: CloudWatch log group setup with delivery configuration

## Usage

```typescript
import { BedrockKnowledgeBaseL3Construct } from '@aws-mdaa/bedrock-knowledge-base-l3-construct';

const knowledgeBase = new BedrockKnowledgeBaseL3Construct(this, 'MyKB', {
  kbName: 'my-knowledge-base',
  kbConfig: {
    role: kbExecutionRole,
    vectorStore: 'my-vector-store',
    embeddingModel: 'amazon.titan-embed-text-v2:0',
    s3DataSources: {
      documents: {
        bucketName: 'my-docs-bucket',
        prefix: 'documents/',
        enableSync: true
      }
    }
  },
  vectorStoreConfig: {
    vpcId: 'vpc-12345',
    subnetIds: ['subnet-1', 'subnet-2']
  },
  kmsKey: myKmsKey,
  roleHelper: roleHelper,
  naming: naming
});
```

## Configuration Options

### Knowledge Base Properties
- `role`: Execution role for the knowledge base (required)
- `vectorStore`: Reference to vector store configuration (required)
- `embeddingModel`: Embedding model ID or ARN (required)
- `s3DataSources`: Map of S3 data source configurations
- `vectorFieldSize`: Optional vector field size override
- `supplementalBucketName`: Optional supplemental storage bucket

### Vector Store Properties
- `vpcId`: VPC where the vector store will be deployed (required)
- `subnetIds`: Subnet IDs for the vector store (required)
- `port`: Optional database port (default: 5432)
- `engineVersion`: Optional Aurora PostgreSQL version
- `minCapacity`: Optional minimum Aurora Capacity Units
- `maxCapacity`: Optional maximum Aurora Capacity Units

### S3 Data Source Options
- `bucketName`: S3 bucket name (required)
- `prefix`: Optional S3 prefix filter
- `enableSync`: Enable automatic sync on S3 changes
- `vectorIngestionConfiguration`: Advanced parsing and chunking options

### Vector Ingestion Configuration
- **Parsing Strategies**:
  - `BEDROCK_DATA_AUTOMATION`: Automated multimodal parsing
  - `BEDROCK_FOUNDATION_MODEL`: Custom foundation model parsing
- **Chunking Strategies**:
  - `FIXED_SIZE`: Fixed token-based chunking
  - `HIERARCHICAL`: Parent-child chunking
  - `SEMANTIC`: Meaning-based chunking
  - `NONE`: No chunking

## IAM Permissions

The construct automatically creates IAM policies with permissions for:
- Embedding model invocation
- Vector database access
- S3 data source access
- KMS key usage
- Data source synchronization
- CloudWatch logging

## Dependencies

- `@aws-mdaa/cloudwatch-constructs`
- `@aws-mdaa/dataops-lambda-l3-construct`
- `@aws-mdaa/ec2-constructs`
- `@aws-mdaa/iam-constructs`
- `@aws-mdaa/iam-role-helper`
- `@aws-mdaa/kms-constructs`
- `@aws-mdaa/l3-construct`
- `@aws-mdaa/rds-constructs`
- `@aws-mdaa/construct`
- `aws-cdk-lib`
- `constructs`