/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveModelArn } from '../lib';

describe('Utils - resolveModelArn', () => {
  const mockPartition = 'aws';
  const mockRegion = 'us-east-1';
  const mockAccount = '123456789012';

  describe('Full ARN passthrough', () => {
    test('should return valid foundation model ARN as-is', () => {
      const validFoundationModelArn =
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(validFoundationModelArn, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(validFoundationModelArn);
    });

    test('should return valid custom model ARN as-is', () => {
      const validCustomModelArn =
        'arn:aws:bedrock:us-east-1:123456789012:custom-model/anthropic.claude-3-sonnet-20240229-v1:0/abcdef123456';

      const result = resolveModelArn(validCustomModelArn, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(validCustomModelArn);
    });

    test('should return valid inference profile ARN as-is', () => {
      const validInferenceProfileArn =
        'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(validInferenceProfileArn, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(validInferenceProfileArn);
    });

    test('should return valid application inference profile ARN as-is', () => {
      const validAppInferenceProfileArn =
        'arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/my-app-profile';

      const result = resolveModelArn(validAppInferenceProfileArn, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(validAppInferenceProfileArn);
    });

    test('should handle ARNs with different partitions', () => {
      const govCloudArn =
        'arn:aws-us-gov:bedrock:us-gov-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(govCloudArn, 'aws-us-gov', 'us-gov-east-1', mockAccount);

      expect(result).toBe(govCloudArn);
    });
  });

  describe('On-demand model ID conversion', () => {
    test('should convert basic model ID to foundation model ARN', () => {
      const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should convert Amazon model ID to foundation model ARN', () => {
      const modelId = 'amazon.titan-text-express-v1';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-express-v1';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should convert Meta model ID to foundation model ARN', () => {
      const modelId = 'meta.llama2-70b-chat-v1';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/meta.llama2-70b-chat-v1';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle different partitions for model ID conversion', () => {
      const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn =
        'arn:aws-us-gov:bedrock:us-gov-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(modelId, 'aws-us-gov', 'us-gov-east-1', mockAccount);

      expect(result).toBe(expectedArn);
    });
  });

  describe('Inference profile ID conversion', () => {
    test('should convert US inference profile ID to inference profile ARN', () => {
      const inferenceProfileId = 'us.anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn =
        'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(inferenceProfileId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should convert EU inference profile ID to inference profile ARN', () => {
      const inferenceProfileId = 'eu.anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn =
        'arn:aws:bedrock:eu-west-1:123456789012:inference-profile/eu.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(inferenceProfileId, mockPartition, 'eu-west-1', mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should convert us-gov inference profile ID to inference profile ARN', () => {
      const inferenceProfileId = 'us-gov.anthropic.claude-3-haiku-20240307-v1:0';
      const expectedArn =
        'arn:aws-us-gov:bedrock:us-gov-east-1:123456789012:inference-profile/us-gov.anthropic.claude-3-haiku-20240307-v1:0';

      const result = resolveModelArn(inferenceProfileId, 'aws-us-gov', 'us-gov-east-1', mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should convert apac inference profile ID to inference profile ARN', () => {
      const inferenceProfileId = 'apac.anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn =
        'arn:aws:bedrock:ap-southeast-1:123456789012:inference-profile/apac.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(inferenceProfileId, mockPartition, 'ap-southeast-1', mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle Cohere model in inference profile', () => {
      const inferenceProfileId = 'us.cohere.command-text-v14';
      const expectedArn = 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.cohere.command-text-v14';

      const result = resolveModelArn(inferenceProfileId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle different model providers in inference profiles', () => {
      const inferenceProfileId = 'us.amazon.titan-text-express-v1';
      const expectedArn = 'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.amazon.titan-text-express-v1';

      const result = resolveModelArn(inferenceProfileId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle Meta model in inference profile', () => {
      const inferenceProfileId = 'eu.meta.llama2-70b-chat-v1';
      const expectedArn = 'arn:aws:bedrock:eu-west-1:123456789012:inference-profile/eu.meta.llama2-70b-chat-v1';

      const result = resolveModelArn(inferenceProfileId, mockPartition, 'eu-west-1', mockAccount);

      expect(result).toBe(expectedArn);
    });
  });

  describe('Error handling for invalid ARNs', () => {
    test('should throw error for invalid ARN format', () => {
      const invalidArn = 'arn:aws:bedrock:us-east-1:123456789012:invalid-resource-type/model-id';

      expect(() => {
        resolveModelArn(invalidArn, mockPartition, mockRegion, mockAccount);
      }).toThrow('Invalid Bedrock model ARN format');
    });

    test('should throw error for malformed ARN structure', () => {
      const malformedArn = 'arn:aws:bedrock:invalid-structure';

      expect(() => {
        resolveModelArn(malformedArn, mockPartition, mockRegion, mockAccount);
      }).toThrow('Invalid Bedrock model ARN format');
    });

    test('should throw error for ARN with wrong service', () => {
      const wrongServiceArn = 'arn:aws:lambda:us-east-1:123456789012:function:my-function';

      expect(() => {
        resolveModelArn(wrongServiceArn, mockPartition, mockRegion, mockAccount);
      }).toThrow('Invalid Bedrock model ARN format');
    });

    test('should throw error for generated ARN that fails validation', () => {
      // This test ensures that even generated ARNs are validated
      const modelId = 'invalid@model#id';

      expect(() => {
        resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);
      }).toThrow('Invalid Bedrock model ARN format');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string input', () => {
      expect(() => {
        resolveModelArn('', mockPartition, mockRegion, mockAccount);
      }).toThrow('Invalid Bedrock model ARN format');
    });

    test('should handle model ID with version numbers', () => {
      const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0:1';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0:1';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle model ID with hyphens and dots', () => {
      const modelId = 'amazon.titan-text-express-v1.0';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-express-v1.0';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should distinguish between inference profile and regular model with similar naming', () => {
      // Regular model that happens to start with "us" but doesn't match inference profile pattern
      const regularModelId = 'user.some-defined-model-v1:0';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/user.some-defined-model-v1:0';

      const result = resolveModelArn(regularModelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should treat model ID with unknown region prefix as regular model', () => {
      // Model ID that starts with unknown region prefix should be treated as regular model
      const modelId = 'xyz.anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/xyz.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle unknown provider in inference profile', () => {
      // Model ID with known region and any valid provider should be treated as inference profile
      const inferenceProfileId = 'us.unknown-provider.some-model-v1:0';
      const expectedArn =
        'arn:aws:bedrock:us-east-1:123456789012:inference-profile/us.unknown-provider.some-model-v1:0';

      const result = resolveModelArn(inferenceProfileId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should handle new provider in APAC inference profile', () => {
      // Test with a hypothetical new provider
      const inferenceProfileId = 'apac.newprovider.some-model-v1:0';
      const expectedArn =
        'arn:aws:bedrock:ap-southeast-1:123456789012:inference-profile/apac.newprovider.some-model-v1:0';

      const result = resolveModelArn(inferenceProfileId, mockPartition, 'ap-southeast-1', mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should treat model ID with insufficient parts as regular model', () => {
      // Model ID with only two parts should be treated as regular model
      const modelId = 'us.anthropic';
      const expectedArn = 'arn:aws:bedrock:us-east-1::foundation-model/us.anthropic';

      const result = resolveModelArn(modelId, mockPartition, mockRegion, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should convert APAC inference profile ID to inference profile ARN', () => {
      const inferenceProfileId = 'apac.anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn =
        'arn:aws:bedrock:ap-southeast-1:123456789012:inference-profile/apac.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(inferenceProfileId, mockPartition, 'ap-southeast-1', mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should treat incorrect AP prefix as regular model (should be apac, not ap)', () => {
      // Incorrect AP prefix should be treated as a regular model
      const modelId = 'ap.anthropic.claude-3-sonnet-20240229-v1:0';
      const expectedArn = 'arn:aws:bedrock:ap-southeast-1::foundation-model/ap.anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(modelId, mockPartition, 'ap-southeast-1', mockAccount);

      expect(result).toBe(expectedArn);
    });
  });

  describe('Parameter validation', () => {
    test('should work with different partition values', () => {
      const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
      const chinaPartition = 'aws-cn';
      const expectedArn = 'arn:aws-cn:bedrock:cn-north-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(modelId, chinaPartition, 'cn-north-1', mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should work with different region values', () => {
      const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
      const region = 'eu-central-1';
      const expectedArn = 'arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0';

      const result = resolveModelArn(modelId, mockPartition, region, mockAccount);

      expect(result).toBe(expectedArn);
    });

    test('should work with different account values for inference profiles', () => {
      const inferenceProfileId = 'us.anthropic.claude-3-sonnet-20240229-v1:0';
      const account = '111111111111';
      const expectedArn = `arn:aws:bedrock:us-east-1:${account}:inference-profile/us.anthropic.claude-3-sonnet-20240229-v1:0`;

      const result = resolveModelArn(inferenceProfileId, mockPartition, mockRegion, account);

      expect(result).toBe(expectedArn);
    });
  });
});
