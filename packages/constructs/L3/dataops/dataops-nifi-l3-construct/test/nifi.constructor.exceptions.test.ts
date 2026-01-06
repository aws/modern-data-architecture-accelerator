/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { NifiL3Construct, NifiL3ConstructProps } from '../lib';

describe('NifiL3Construct Constructor Exception Tests', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('should throw error when kmsArn is not provided', () => {
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
      },
    };

    expect(() => {
      new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);
    }).toThrow('Project kms key must be defined');
  });

  test('should throw error when kmsArn is undefined', () => {
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: undefined,
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
      },
    };

    expect(() => {
      new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);
    }).toThrow('Project kms key must be defined');
  });

  test('should throw error when kmsArn is empty string', () => {
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: '',
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
      },
    };

    expect(() => {
      new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);
    }).toThrow('Project kms key must be defined');
  });

  test('should throw error for unknown peer cluster reference', () => {
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
        clusters: {
          cluster1: {
            adminIdentities: ['test-admin'],
            saml: { idpMetadataUrl: 'test-url' },
            peerClusters: ['nonexistent-cluster'],
          },
        },
      },
    };

    expect(() => {
      new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);
    }).toThrow('Unknown peer cluster nonexistent-cluster referenced by cluster cluster1');
  });

  test('should throw error for unknown peer cluster in computePeerNodeIdentities', () => {
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
        clusters: {
          cluster1: {
            adminIdentities: ['test-admin'],
            saml: { idpMetadataUrl: 'test-url' },
            peerClusters: ['missing-peer'],
          },
        },
      },
    };

    expect(() => {
      new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);
    }).toThrow('Unknown peer cluster missing-peer referenced by cluster cluster1');
  });

  test('should throw error for peer cluster reference in addNifiClusters method', () => {
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
        clusters: {
          cluster1: {
            adminIdentities: ['test-admin'],
            saml: { idpMetadataUrl: 'test-url' },
          },
          cluster2: {
            adminIdentities: ['test-admin'],
            saml: { idpMetadataUrl: 'test-url' },
            peerClusters: ['cluster1', 'unknown-cluster'],
          },
        },
      },
    };

    expect(() => {
      new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);
    }).toThrow('Unknown peer cluster unknown-cluster referenced by cluster cluster2');
  });

  test('should throw impossible condition error in addPrivateCAChart', () => {
    // This tests the istanbul ignore next condition
    const constructProps: NifiL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      nifi: {
        vpcId: 'test-vpc-id',
        subnetIds: {
          'test-subnet-1': 'test-subnet-id',
        },
        adminRoles: [
          {
            id: 'testing',
          },
        ],
        clusters: {
          'test-cluster': {
            adminIdentities: ['test-admin'],
            saml: { idpMetadataUrl: 'test-url' },
          },
        },
      },
    };

    const construct = new NifiL3Construct(testApp.testStack, 'test-construct', constructProps);

    // Access private method through type assertion to test impossible condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const privateMethod = (construct as any).addPrivateCAChart;

    expect(() => {
      privateMethod.call(construct, {}, {}, undefined);
    }).toThrow('Impossible condition');
  });
});
