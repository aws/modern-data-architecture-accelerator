/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateAndGroupVpcEndpoints, NamedOpensearchServerlessProps } from '../lib/vpc-endpoint-validator';

describe('validateAndGroupVpcEndpoints', () => {
  it('should return empty map when ossVectorStores is undefined', () => {
    const result = validateAndGroupVpcEndpoints(undefined);
    expect(result.size).toBe(0);
  });

  it('should return empty map when ossVectorStores is empty', () => {
    const result = validateAndGroupVpcEndpoints({});
    expect(result.size).toBe(0);
  });

  it('should group vector stores by VPC correctly', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1', 'subnet-2'],
        standbyReplicas: 'ENABLE',
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1', 'subnet-2'],
        standbyReplicas: 'ENABLE',
      },
    };

    const result = validateAndGroupVpcEndpoints(ossVectorStores);
    expect(result.size).toBe(1);
    expect(result.get('vpc-123')).toEqual({
      vpcId: 'vpc-123',
      subnetIds: ['subnet-1', 'subnet-2'],
      existingVpce: undefined,
    });
  });

  it('should handle multiple VPCs', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-456',
        subnetIds: ['subnet-2'],
        standbyReplicas: 'ENABLE',
      },
    };

    const result = validateAndGroupVpcEndpoints(ossVectorStores);
    expect(result.size).toBe(2);
    expect(result.has('vpc-123')).toBe(true);
    expect(result.has('vpc-456')).toBe(true);
  });

  it('should throw error when vector stores in same VPC have different subnets', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1', 'subnet-2'],
        standbyReplicas: 'ENABLE',
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-3', 'subnet-4'],
        standbyReplicas: 'ENABLE',
      },
    };

    expect(() => validateAndGroupVpcEndpoints(ossVectorStores)).toThrow(/different subnet configurations/);
  });

  it('should use existing VPC endpoint when ossVpce is provided', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
      },
    };

    const result = validateAndGroupVpcEndpoints(ossVectorStores);
    expect(result.get('vpc-123')).toEqual({
      vpcId: 'vpc-123',
      subnetIds: ['subnet-1'],
      existingVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
    });
  });

  it('should throw error when vector stores in same VPC have inconsistent existing VPCE config (one has, one does not)', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
      },
    };

    expect(() => validateAndGroupVpcEndpoints(ossVectorStores)).toThrow(
      /inconsistent existing VPC endpoint configurations/,
    );
  });

  it('should throw error when vector stores in same VPC have different existing VPCE IDs', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-456', securityGroupId: 'sg-123' },
      },
    };

    expect(() => validateAndGroupVpcEndpoints(ossVectorStores)).toThrow(
      /inconsistent existing VPC endpoint configurations/,
    );
  });

  it('should throw error when vector stores in same VPC have different existing security group IDs', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-456' },
      },
    };

    expect(() => validateAndGroupVpcEndpoints(ossVectorStores)).toThrow(
      /inconsistent existing VPC endpoint configurations/,
    );
  });

  it('should succeed when all vector stores in same VPC have identical existing VPCE config', () => {
    const ossVectorStores: NamedOpensearchServerlessProps = {
      store1: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
      },
      store2: {
        vectorStoreType: 'OPENSEARCH_SERVERLESS',
        vpcId: 'vpc-123',
        subnetIds: ['subnet-1'],
        standbyReplicas: 'ENABLE',
        ossVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
      },
    };

    const result = validateAndGroupVpcEndpoints(ossVectorStores);
    expect(result.size).toBe(1);
    expect(result.get('vpc-123')).toEqual({
      vpcId: 'vpc-123',
      subnetIds: ['subnet-1'],
      existingVpce: { vpceId: 'vpce-123', securityGroupId: 'sg-123' },
    });
  });
});
