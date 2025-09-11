# Design Document

## Overview

This design outlines the migration strategy for optimizing the GAIA L3 construct's lambda layer architecture. The solution converts the Model Interface Request Handler (the only Lambda function using langchain-community) to a container deployment while removing langchain-community from the commonLayer. This approach enables upgrading langchain-community without hitting AWS Lambda's 250MB layer size limit.

## Architecture

### Current Architecture
```
All Lambda Functions
    ↓
commonLayer (includes langchain-community + other deps)
    ↓ 
250MB limit constraint
```

### Target Architecture
```
Non-Langchain Functions          Model Interface Request Handler
    ↓                               ↓
commonLayer                    Container Image
(without langchain)            (with upgraded langchain-community)
    ↓                               ↓
Optimized size                 No size constraints
```

## Components and Interfaces

### 1. Updated commonLayer

**Purpose**: Provide shared dependencies for functions that don't use langchain

**Dependencies** (from current requirements.txt, excluding langchain packages):
```
aws_xray_sdk==2.12.1
boto3==1.35.63
numpy==1.26.4
cfnresponse==1.1.2
aws_requests_auth==0.4.3
requests-aws4auth==1.2.3
opensearch-py==3.0.0
psycopg2-binary==2.9.9
pgvector==0.3.1
pydantic==2.7.4
urllib3==2.5.0
beautifulsoup4==4.12.3
requests==2.32.4
pyjwt==2.8.0
cryptography==44.0.1
attrs==23.1.0
defusedxml==0.7.1
```

**Functions using this layer**:
- api-handler (REST API)
- aurora-pgvector workspace creation
- workspace deletion  
- data import upload-handler
- website crawling workflow
- secrets rotation function

### 2. Container-based Function

**Model Interface Request Handler Container**:
- **Base Image**: AWS Lambda Python base image
- **Function Path**: `lib/model-interfaces/langchain/functions/request-handler/`
- **Key Langchain Usage**: Chat models, chains, memory, prompts, callbacks
- **Container requirements.txt**:
```
# All commonLayer dependencies
aws_xray_sdk==2.12.1
boto3==1.35.63
numpy==1.26.4
cfnresponse==1.1.2
aws_requests_auth==0.4.3
requests-aws4auth==1.2.3
opensearch-py==3.0.0
psycopg2-binary==2.9.9
pgvector==0.3.1
pydantic==2.7.4
urllib3==2.5.0
beautifulsoup4==4.12.3
requests==2.32.4
pyjwt==2.8.0
cryptography==44.0.1
attrs==23.1.0
defusedxml==0.7.1

# Langchain dependencies (upgraded versions)
langchain-community>=0.4.0
langchain-aws>=0.3.0
langchain-core>=0.4.0
openai>=1.0.0
```

### 3. Layer Construction Changes

**Layer Class Updates**:
- Modify `lib/layer/index.ts` to reference updated requirements.txt
- Remove langchain-related dependencies from `lib/shared/layers/common/requirements.txt`
- Maintain same interface and construction pattern

**Shared Class Updates**:
- Update `lib/shared/index.ts` to continue providing commonLayer
- Ensure backward compatibility for existing layer consumers
- No changes to powerToolsLayer or pythonSDKLayer

## Data Models

The existing CDK constructs will be updated to use AWS Lambda's container image support instead of defining new data models. Container functions will use the same configuration patterns as existing lambda functions but with `code: lambda.Code.fromEcrImage()` instead of layers.



## Error Handling

### Migration Validation
- **Pre-migration checks**: Verify all langchain imports are identified
- **Dependency validation**: Ensure no missing dependencies in new layer
- **Function testing**: Validate each function works with new deployment method

### Runtime Error Handling
- **Container startup failures**: Implement retry logic and proper error logging
- **Layer dependency issues**: Clear error messages for missing dependencies
- **Backward compatibility**: Graceful handling of configuration mismatches



## Testing Strategy

### Unit Testing
- **Layer construction**: Test new commonLayer builds successfully
- **Container building**: Verify container images build with correct dependencies
- **Function isolation**: Test each function works independently

### Integration Testing  
- **API functionality**: Verify REST API functions work with updated layer
- **Model inference**: Test Model Interface Request Handler works in container
- **Cross-function communication**: Ensure functions can still interact properly



### Deployment Testing
- **Basic functionality**: Verify functions work correctly after migration
- **Error monitoring**: Check for any runtime errors or deployment issues

## Implementation Phases

### Phase 1: Core Migration (Priority)
1. Remove langchain dependencies from existing `lib/shared/layers/common/requirements.txt`
2. Create Dockerfile for Model Interface Request Handler
3. Update CDK construct to deploy Model Interface Request Handler as container
4. Test basic functionality works

### Phase 2: Documentation (Post-Migration)
1. Update documentation and deployment guides
2. Document decision criteria for layers vs containers