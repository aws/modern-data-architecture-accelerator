/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpensearchServerlessProps } from '@aws-mdaa/bedrock-knowledge-base-l3-construct';

/**
 * VPC endpoint configuration with both endpoint ID and security group ID.
 * Both fields must be provided together.
 */
export interface OpenSearchVpceConfig {
  /** The VPC endpoint ID */
  vpceId: string;
  /** The security group ID for the VPC endpoint */
  securityGroupId: string;
}

/**
 * Configuration for a VPC endpoint that needs to be created or used.
 */
export interface VpcEndpointConfig {
  /** The VPC ID where the endpoint should be created */
  vpcId: string;
  /** The subnet IDs for the VPC endpoint */
  subnetIds: string[];
  /** If provided, use this existing VPC endpoint configuration instead of creating a new one */
  existingVpce?: OpenSearchVpceConfig;
}

/**
 * Named OpenSearch Serverless vector store props - a map of store names to their configurations.
 */
export type NamedOpensearchServerlessProps = { [name: string]: OpensearchServerlessProps };

/**
 * Internal type for vector store information during validation.
 */
interface VectorStoreInfo {
  name: string;
  vpcId: string;
  subnetIds: string[];
  ossVpce?: OpenSearchVpceConfig;
}

/**
 * Checks if two vector stores have inconsistent VPC endpoint configurations.
 *
 * KB VPCE Configuration Consistency rules:
 * - All vector stores in the same VPC must use the same existing VPCE configuration
 * - Or none should specify an existing VPCE (allowing a new one to be created)
 * - Mixed configurations (some with existing VPCE, some without) are not allowed
 *
 * @param referenceStore - The reference vector store to compare against
 * @param currentStore - The current vector store being validated
 * @returns true if the stores have inconsistent VPCE configurations
 */
function hasInconsistentVpceConfig(referenceStore: VectorStoreInfo, currentStore: VectorStoreInfo): boolean {
  const referenceOssVpce = referenceStore.ossVpce;
  const currentOssVpce = currentStore.ossVpce;

  // Both undefined - consistent
  if (!referenceOssVpce && !currentOssVpce) {
    return false;
  }

  // One undefined, one defined - inconsistent
  if (!referenceOssVpce || !currentOssVpce) {
    return true;
  }

  // Both defined - check if values match
  return (
    currentOssVpce.vpceId !== referenceOssVpce.vpceId ||
    currentOssVpce.securityGroupId !== referenceOssVpce.securityGroupId
  );
}

/**
 * Validates subnet consistency across vector stores in the same VPC.
 * @param stores - Array of vector stores in the same VPC
 * @throws Error if vector stores have mismatched subnet configurations
 */
function validateSubnetConsistency(stores: VectorStoreInfo[]): void {
  const firstStore = stores[0];
  const firstSubnets = [...firstStore.subnetIds].sort().join(',');

  const hasMismatch = stores.some(store => {
    const storeSubnets = [...store.subnetIds].sort().join(',');
    return storeSubnets !== firstSubnets;
  });

  if (hasMismatch) {
    const errorDetails = stores.map(store => `  - ${store.name}: [${store.subnetIds.join(', ')}]`).join('\n');

    throw new Error(
      `Multiple vector stores are configured with the same VPC (${firstStore.vpcId}) but different subnet configurations. ` +
        `All vector stores in the same VPC must use identical subnetIds.\n\n` +
        `Vector stores in VPC ${firstStore.vpcId}:\n${errorDetails}\n\n` +
        `Please update your configuration to use the same subnet IDs for all vector stores in VPC ${firstStore.vpcId}.`,
    );
  }
}

/**
 * Validates that existing VPC endpoint configuration is complete and consistent.
 * @param stores - Array of vector stores in the same VPC
 * @throws Error if VPC endpoint configuration is incomplete or inconsistent
 */
function validateVpceConsistency(stores: VectorStoreInfo[]): void {
  const firstStore = stores[0];
  // Find all stores that have inconsistent VPCE configuration compared to the first store
  const inconsistentStores = stores.filter(store => hasInconsistentVpceConfig(firstStore, store));

  if (inconsistentStores.length > 0) {
    const errorDetails = stores
      .map(
        store =>
          `  - ${store.name}: vpceId=${store.ossVpce?.vpceId || 'none'}, sgId=${store.ossVpce?.securityGroupId || 'none'}`,
      )
      .join('\n');

    throw new Error(
      `Multiple vector stores in VPC ${firstStore.vpcId} have inconsistent existing VPC endpoint configurations. ` +
        `All vector stores in the same VPC must either all use the same existing VPC endpoint or all create a new one.\n\n` +
        `Vector stores in VPC ${firstStore.vpcId}:\n${errorDetails}\n\n` +
        `Please update your configuration to use consistent VPC endpoint settings for all vector stores in VPC ${firstStore.vpcId}.`,
    );
  }
}

/**
 * Validates vector stores in a VPC and creates the endpoint configuration.
 * @param stores - Array of vector stores in the same VPC
 * @returns VPC endpoint configuration for this VPC
 * @throws Error if validation fails
 */
function validateAndCreateVpcConfig(stores: VectorStoreInfo[]): VpcEndpointConfig {
  validateSubnetConsistency(stores);
  validateVpceConsistency(stores);
  const firstStore = stores[0];

  return {
    vpcId: firstStore.vpcId,
    subnetIds: firstStore.subnetIds,
    existingVpce: firstStore.ossVpce,
  };
}

/**
 * Validates and groups OpenSearch Serverless vector stores by VPC for shared VPC endpoint creation.
 * This pure function performs all validation logic without creating any CDK resources.
 *
 * @param ossVectorStores - Map of OpenSearch Serverless vector store names to their configurations.
 *                          The caller is responsible for filtering to only include OpenSearch Serverless stores.
 * @returns A map of VPC IDs to VPC endpoint configurations
 * @throws Error if validation fails (mismatched subnets, inconsistent VPCE config, etc.)
 */
export function validateAndGroupVpcEndpoints(
  ossVectorStores?: NamedOpensearchServerlessProps,
): Map<string, VpcEndpointConfig> {
  if (!ossVectorStores || Object.keys(ossVectorStores).length === 0) {
    return new Map<string, VpcEndpointConfig>();
  }

  // Group vector stores by VPC
  const vpcToVectorStores = new Map<string, VectorStoreInfo[]>();

  for (const [storeName, storeConfig] of Object.entries(ossVectorStores)) {
    const vpcId = storeConfig.vpcId;
    const subnetIds = storeConfig.subnetIds;
    const ossVpce = storeConfig.ossVpce;

    if (!vpcToVectorStores.has(vpcId)) {
      vpcToVectorStores.set(vpcId, []);
    }
    vpcToVectorStores.get(vpcId)!.push({
      name: storeName,
      vpcId,
      subnetIds,
      ossVpce,
    });
  }

  // For each VPC, validate consistency and prepare endpoint configuration
  return new Map(Array.from(vpcToVectorStores).map(([vpcId, stores]) => [vpcId, validateAndCreateVpcConfig(stores)]));
}
