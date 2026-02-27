/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack, Size } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import { CompliantKubectlProvider } from '../lib/mdaa-kubectl-provider';
import { MdaaEKSCluster } from '../lib/cluster';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

// Mock the kubectl layer
jest.mock('@aws-cdk/lambda-layer-kubectl-v31', () => ({
  KubectlV31Layer: jest.fn().mockImplementation(() => ({
    layerVersionArn: 'arn:aws:lambda:us-east-1:123456789012:layer:kubectl-v31:1',
  })),
}));

describe('CompliantKubectlProvider Unit Tests', () => {
  let app: App;
  let stack: Stack;
  let vpc: Vpc;
  let kmsKey: Key;
  let adminRole: Role;
  let naming: IMdaaResourceNaming;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
    vpc = new Vpc(stack, 'TestVpc');
    kmsKey = new Key(stack, 'TestKey');
    adminRole = new Role(stack, 'AdminRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    });
    naming = {
      props: {
        cdkNode: stack.node,
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        moduleName: 'test-module',
      },
      withModuleName: jest.fn().mockReturnThis(),
      withOrg: jest.fn().mockReturnThis(),
      withDomain: jest.fn().mockReturnThis(),
      withEnv: jest.fn().mockReturnThis(),
      withSuffix: jest.fn().mockReturnThis(),
      ssmDomainPath: jest.fn().mockReturnValue('/test/path'),
      ssmEnvPath: jest.fn().mockReturnValue('/test/path'),
      ssmOrgPath: jest.fn().mockReturnValue('/test/path'),
      resourceName: jest
        .fn()
        .mockImplementation((suffix?: string) => (suffix ? `test-resource-${suffix}` : 'test-resource')),
      ssmPath: jest.fn().mockImplementation((path: string) => `/test/${path}`),
      stackName: jest.fn().mockImplementation((name?: string) => (name ? `test-stack-${name}` : 'test-stack')),
      exportName: jest.fn().mockImplementation((path: string) => `test-export-${path}`),
    };
  });

  describe('Constructor', () => {
    test('creates provider successfully with valid cluster', () => {
      const cluster = new MdaaEKSCluster(stack, 'TestCluster', {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      });

      expect(() => {
        new CompliantKubectlProvider(stack, 'TestProvider', { cluster });
      }).not.toThrow();
    });

    test('throws error when cluster has no kubectl role', () => {
      const mockCluster = {
        kubectlRole: undefined,
        kubectlPrivateSubnets: undefined,
        kubectlSecurityGroup: undefined,
        kubectlMemory: undefined,
        kubectlLayer: new KubectlV31Layer(stack, 'TestLayer'),
        vpc,
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      expect(() => {
        new CompliantKubectlProvider(stack, 'TestProvider', { cluster: mockCluster });
      }).toThrow('"kubectlRole" is not defined, cannot issue kubectl commands against this cluster');
    });

    test('throws error when kubectl subnets provided without security group', () => {
      const kubectlRole = new Role(stack, 'KubectlRole2', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const mockCluster = {
        kubectlRole,
        kubectlPrivateSubnets: vpc.privateSubnets,
        kubectlSecurityGroup: undefined,
        kubectlMemory: undefined,
        kubectlLayer: new KubectlV31Layer(stack, 'TestLayer2'),
        vpc,
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      expect(() => {
        new CompliantKubectlProvider(stack, 'TestProvider', { cluster: mockCluster });
      }).toThrow('"kubectlSecurityGroup" is required if "kubectlSubnets" is specified');
    });

    test('throws error when kubectl layer is not provided', () => {
      const kubectlRole = new Role(stack, 'KubectlRole3', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const mockCluster = {
        kubectlRole,
        kubectlPrivateSubnets: undefined,
        kubectlSecurityGroup: undefined,
        kubectlMemory: undefined,
        kubectlLayer: undefined,
        vpc,
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      expect(() => {
        new CompliantKubectlProvider(stack, 'TestProvider', { cluster: mockCluster });
      }).toThrow('kubectlLayer is required but not provided by the cluster');
    });

    test('uses custom memory size when provided', () => {
      const kubectlRole = new Role(stack, 'KubectlRole4', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const mockCluster = {
        kubectlRole,
        kubectlPrivateSubnets: undefined,
        kubectlSecurityGroup: undefined,
        kubectlMemory: Size.gibibytes(2),
        kubectlLayer: new KubectlV31Layer(stack, 'TestLayer3'),
        vpc,
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      expect(() => {
        new CompliantKubectlProvider(stack, 'TestProvider', { cluster: mockCluster });
      }).not.toThrow();
    });
  });

  describe('getOrCreate static method', () => {
    test('returns existing provider for owned cluster', () => {
      const cluster = new MdaaEKSCluster(stack, 'TestCluster', {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      });

      const provider1 = CompliantKubectlProvider.getOrCreate(stack, cluster);
      const provider2 = CompliantKubectlProvider.getOrCreate(stack, cluster);

      expect(provider1).toBe(provider2);
    });

    test('returns existing kubectl provider from imported cluster', () => {
      const existingProvider = new CompliantKubectlProvider(stack, 'ExistingProvider', {
        cluster: new MdaaEKSCluster(stack, 'ExistingCluster', {
          naming,
          adminRoles: [adminRole],
          kmsKey,
          vpc,
          subnets: vpc.privateSubnets,
          version: KubernetesVersion.V1_31,
          clusterName: 'existing-cluster',
        }),
      });

      const mockCluster = {
        kubectlProvider: existingProvider,
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      const provider = CompliantKubectlProvider.getOrCreate(stack, mockCluster);
      expect(provider).toBe(existingProvider);
    });

    test('creates new provider for imported cluster without kubectl provider', () => {
      const importedCluster = Cluster.fromClusterAttributes(stack, 'ImportedCluster', {
        clusterName: 'imported-cluster',
        kubectlRoleArn: 'arn:aws:iam::123456789012:role/kubectl-role',
      });

      const provider = CompliantKubectlProvider.getOrCreate(stack, importedCluster);
      expect(provider).toBeDefined();
    });
  });

  describe('fromKubectlProviderAttributes static method', () => {
    test('creates imported kubectl provider', () => {
      const handlerRole = new Role(stack, 'HandlerRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      });

      const provider = CompliantKubectlProvider.fromKubectlProviderAttributes(stack, 'ImportedProvider', {
        functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:kubectl-handler',
        kubectlRoleArn: 'arn:aws:iam::123456789012:role/kubectl-role',
        handlerRole,
      });

      expect(provider.serviceToken).toBe('arn:aws:lambda:us-east-1:123456789012:function:kubectl-handler');
      expect(provider.roleArn).toBe('arn:aws:iam::123456789012:role/kubectl-role');
      expect(provider.handlerRole).toBe(handlerRole);
    });
  });
});
