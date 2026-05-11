import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as marketplaceModels from '../bedrock-marketplace-models.json';

/**
 * Creates a policy statement for AWS Marketplace permissions required for Bedrock model access.
 *
 * As of the removal of the Bedrock model access page, Bedrock automatically approves model usage
 * on first invocation. This requires marketplace permissions for the initial call.
 *
 * Reference: https://docs.aws.amazon.com/bedrock/latest/userguide/model-access-product-ids.html
 *
 * @returns PolicyStatement with marketplace permissions for all supported Bedrock models
 */
export function createBedrockMarketplacePermissions(): PolicyStatement {
  return new PolicyStatement({
    sid: 'AllowBedrockMarketplaceSubscription',
    effect: Effect.ALLOW,
    actions: ['aws-marketplace:ViewSubscriptions', 'aws-marketplace:Subscribe'],
    resources: ['*'],
    conditions: {
      'ForAllValues:StringEquals': {
        'aws-marketplace:ProductId': getBedrockMarketplaceProductIds(),
      },
      StringEquals: {
        'aws:CalledViaLast': 'bedrock.amazonaws.com',
      },
    },
  });
}

/**
 * Get all AWS Marketplace product IDs for Bedrock models
 */
export function getBedrockMarketplaceProductIds(): string[] {
  return Object.values(marketplaceModels);
}
