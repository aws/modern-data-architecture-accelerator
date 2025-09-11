# Implementation Plan

- [x] 1. Update commonLayer to remove langchain dependencies
  - Remove langchain-community and langchain-aws from `lib/shared/layers/common/requirements.txt`
  - Keep all other dependencies (boto3, opensearch-py, psycopg2, etc.)
  - _Requirements: 1.1, 3.2_

- [x] 2. Create Dockerfile for Model Interface Request Handler
  - Create Dockerfile in `lib/model-interfaces/langchain/functions/request-handler/`
  - Use AWS Lambda Python base image
  - Copy function code and install dependencies
  - _Requirements: 4.1, 2.2_

- [x] 3. Create requirements.txt for Model Interface Request Handler container
  - Create requirements.txt with commonLayer deps + langchain-community + langchain-aws + langchain_core
  - Include upgraded langchain versions (>=0.4.0)
  - _Requirements: 4.1, 1.1_

- [x] 4. Update Model Interface CDK construct to use container deployment
  - Modify `lib/model-interfaces/langchain/index.ts` to use container image instead of layers
  - Replace layer-based lambda function with container-based function
  - Maintain same environment variables and IAM permissions
  - _Requirements: 4.1, 4.3, 6.1, 6.2, 6.3_

- [x] 5. Test updated commonLayer builds successfully
  - Verify layer builds without langchain dependencies
  - Confirm layer size is reduced and under limits
  - Test layer can be used by non-langchain functions
  - _Requirements: 3.1, 3.3_

- [x] 6. Test Model Interface Request Handler container works correctly
  - Build and test container locally
  - Verify all langchain functionality works with upgraded versions
  - Test container deployment in CDK
  - _Requirements: 4.2, 1.2_

- [x] 7. Validate all existing functionality remains intact
  - Test API endpoints still work correctly
  - Test model inference works correctly
  - Verify no breaking changes in function interfaces
  - _Requirements: 1.2, 6.3_