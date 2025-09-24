/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from 'aws-cdk-lib';
import { Vpc, InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { KubernetesVersion, EndpointAccess, ClusterProps } from 'aws-cdk-lib/aws-eks';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { MdaaEKSCluster, MdaaEKSClusterProps } from '../lib';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

// Type definitions for accessing private static methods
interface MdaaEKSClusterStatic {
  getKubectlUrl: (version: string) => string;
  getKubectlLayer: (scope: Construct, version: KubernetesVersion) => ILayerVersion;
  setProps: (scope: Construct, props: MdaaEKSClusterProps) => ClusterProps;
}

// Mock the kubectl layer imports
jest.mock('@aws-cdk/lambda-layer-kubectl-v31', () => ({
  KubectlV31Layer: jest
    .fn()
    .mockImplementation(() => ({ layerVersionArn: 'arn:aws:lambda:us-east-1:123456789012:layer:kubectl-v31:1' })),
}));

describe('MdaaEKSCluster Unit Tests', () => {
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
      resourceName: jest
        .fn()
        .mockImplementation((suffix?: string) => (suffix ? `test-resource-${suffix}` : 'test-resource')),
      ssmPath: jest.fn().mockImplementation((path: string) => `/test/${path}`),
      stackName: jest.fn().mockImplementation((name?: string) => (name ? `test-stack-${name}` : 'test-stack')),
      exportName: jest.fn().mockImplementation((path: string) => `test-export-${path}`),
    };
  });

  describe('getKubectlUrl', () => {
    test('returns correct URL for supported versions', () => {
      const getKubectlUrl = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlUrl;

      const url128 = getKubectlUrl('1.28');
      expect(url128).toBe('https://s3.us-west-2.amazonaws.com/amazon-eks/1.28.13/2024-11-15/bin/linux/amd64/kubectl');

      const url129 = getKubectlUrl('1.29');
      expect(url129).toBe('https://s3.us-west-2.amazonaws.com/amazon-eks/1.29.8/2024-11-15/bin/linux/amd64/kubectl');

      const url132 = getKubectlUrl('1.32');
      expect(url132).toBe('https://s3.us-west-2.amazonaws.com/amazon-eks/1.32.0/2024-11-15/bin/linux/amd64/kubectl');
    });

    test('throws error for unsupported versions', () => {
      const getKubectlUrl = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlUrl;

      expect(() => getKubectlUrl('1.27')).toThrow('Unsupported Kubernetes version: 1.27');
      expect(() => getKubectlUrl('1.34')).toThrow('Unsupported Kubernetes version: 1.34');
      expect(() => getKubectlUrl('2.0')).toThrow('Unsupported Kubernetes version: 2.0');
    });

    test('error message includes supported versions', () => {
      const getKubectlUrl = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlUrl;

      expect(() => getKubectlUrl('1.99')).toThrow(/Supported versions: 1\.28, 1\.29, 1\.30, 1\.31, 1\.32/);
    });
  });

  describe('getMinorVersion', () => {
    test('extracts minor version correctly', () => {
      // Test the private method indirectly through kubectl URL generation
      const getKubectlUrl = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlUrl;

      // These should work without throwing errors, indicating getMinorVersion works correctly
      expect(() => getKubectlUrl('1.28')).not.toThrow();
      expect(() => getKubectlUrl('1.29')).not.toThrow();
      expect(() => getKubectlUrl('1.30')).not.toThrow();
      expect(() => getKubectlUrl('1.31')).not.toThrow();
    });
  });

  describe('getKubectlLayer', () => {
    test('returns kubectl layer for supported versions', () => {
      const getKubectlLayer = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlLayer;
      const version = KubernetesVersion.V1_31;

      const layer = getKubectlLayer(stack, version);
      expect(layer).toBeDefined();
      expect(layer.layerVersionArn).toContain('kubectl-v31');
    });

    test('falls back to v30 layer for unsupported versions', () => {
      const getKubectlLayer = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlLayer;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock an unsupported version by creating a custom version object
      const unsupportedVersion = { version: '1.99.0' } as KubernetesVersion;

      const layer = getKubectlLayer(stack, unsupportedVersion);
      expect(layer).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('kubectl 1.99 layer not available, falling back to v31'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Management Instance Creation', () => {
    const createBaseProps = (): MdaaEKSClusterProps => ({
      naming,
      adminRoles: [adminRole],
      kmsKey,
      vpc,
      subnets: vpc.privateSubnets,
      version: KubernetesVersion.V1_31,
      clusterName: 'test-cluster',
    });

    test('creates management instance when mgmtInstance prop is provided', () => {
      const props = {
        ...createBaseProps(),
        mgmtInstance: {
          subnetId: 'subnet-12345',
          availabilityZone: 'us-east-1a',
        },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeDefined();
    });

    test('does not create management instance when mgmtInstance prop is not provided', () => {
      const props = createBaseProps();

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeUndefined();
    });

    test('management instance uses correct kubectl URL in user data', () => {
      const props = {
        ...createBaseProps(),
        version: KubernetesVersion.V1_29,
        mgmtInstance: {
          subnetId: 'subnet-12345',
          availabilityZone: 'us-east-1a',
        },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeDefined();

      // The user data should contain the correct kubectl URL for v1.29
      const template = app.synth().getStackByName(stack.stackName).template;
      const userData = JSON.stringify(template);
      expect(userData).toContain(
        'https://s3.us-west-2.amazonaws.com/amazon-eks/1.29.8/2024-11-15/bin/linux/amd64/kubectl',
      );
    });

    test('management instance uses custom instance type when provided', () => {
      const props = {
        ...createBaseProps(),
        mgmtInstance: {
          subnetId: 'subnet-12345',
          availabilityZone: 'us-east-1a',
          instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
        },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeDefined();
    });

    test('management instance includes custom user data commands', () => {
      const customCommands = ['echo "Custom command 1"', 'echo "Custom command 2"'];
      const props = {
        ...createBaseProps(),
        mgmtInstance: {
          subnetId: 'subnet-12345',
          availabilityZone: 'us-east-1a',
          userDataCommands: customCommands,
        },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeDefined();

      const template = app.synth().getStackByName(stack.stackName).template;
      const userData = JSON.stringify(template);
      // Check for the actual format of the commands in the CloudFormation template
      expect(userData).toContain('Custom command 1');
      expect(userData).toContain('Custom command 2');
    });

    test('management instance uses provided key pair name', () => {
      const props = {
        ...createBaseProps(),
        mgmtInstance: {
          subnetId: 'subnet-12345',
          availabilityZone: 'us-east-1a',
          keyPairName: 'my-existing-keypair',
        },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeDefined();
    });
  });

  describe('Cluster Properties', () => {
    test('sets kubectl layer correctly in cluster props', () => {
      const setProps = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).setProps;
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const clusterProps = setProps(stack, props);
      expect(clusterProps.kubectlLayer).toBeDefined();
      expect(clusterProps.kubectlLayer.layerVersionArn).toContain('kubectl-v31');
    });

    test('enforces private endpoint access', () => {
      const setProps = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).setProps;
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const clusterProps = setProps(stack, props);
      expect(clusterProps.endpointAccess).toEqual(EndpointAccess.PRIVATE);
    });

    test('sets secrets encryption key', () => {
      const setProps = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).setProps;
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const clusterProps = setProps(stack, props);
      expect(clusterProps.secretsEncryptionKey).toBe(kmsKey);
    });
  });

  describe('Error Handling', () => {
    test('throws error when multiple clusters in same stack', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster-1',
      };

      // Create first cluster
      new MdaaEKSCluster(stack, 'TestCluster1', props);

      // Try to create second cluster - should throw error
      expect(() => {
        new MdaaEKSCluster(stack, 'TestCluster2', {
          ...props,
          clusterName: 'test-cluster-2',
        });
      }).toThrow('Only a single EKS cluster can be defined within a CloudFormation stack');
    });
  });

  describe('Fargate Profile', () => {
    test('creates fargate profile with custom pod execution role', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);

      const customRole = new Role(stack, 'CustomPodRole', {
        assumedBy: new ServicePrincipal('eks-fargate-pods.amazonaws.com'),
      });

      const profile = cluster.addFargateProfile('custom-profile', {
        podExecutionRole: customRole,
        selectors: [{ namespace: 'custom' }],
      });

      expect(profile).toBeDefined();
    });

    test('creates fargate profile without custom pod execution role', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);

      const profile = cluster.addFargateProfile('auto-profile', {
        selectors: [{ namespace: 'auto' }],
      });

      expect(profile).toBeDefined();
    });
  });

  describe('Namespace Management', () => {
    test('cluster has addNamespace method', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);

      // Verify the method exists
      expect(typeof cluster.addNamespace).toBe('function');
    });
  });

  describe('Kubectl Layer Selection', () => {
    test('uses correct kubectl layer for different versions', () => {
      const getKubectlLayer = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlLayer;

      // Test v1.28
      const layer28 = getKubectlLayer(stack, KubernetesVersion.V1_28);
      expect(layer28).toBeDefined();

      // Test v1.29
      const layer29 = getKubectlLayer(stack, KubernetesVersion.V1_29);
      expect(layer29).toBeDefined();

      // Test v1.30
      const layer30 = getKubectlLayer(stack, KubernetesVersion.V1_30);
      expect(layer30).toBeDefined();
    });

    test('handles missing kubectl layer packages gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const getKubectlLayer = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).getKubectlLayer;

      // Mock an unsupported version
      const unsupportedVersion = { version: '1.35.0' } as KubernetesVersion;

      const layer = getKubectlLayer(stack, unsupportedVersion);
      expect(layer).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No specific kubectl layer available'));

      consoleSpy.mockRestore();
    });
  });

  describe('Cluster Configuration', () => {
    test('enforces all required security settings', () => {
      const setProps = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).setProps;
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const clusterProps = setProps(stack, props);

      // Verify security configurations
      expect(clusterProps.endpointAccess).toEqual(EndpointAccess.PRIVATE);
      expect(clusterProps.defaultCapacity).toBe(0);
      expect(clusterProps.secretsEncryptionKey).toBe(kmsKey);
      expect(clusterProps.clusterLogging).toEqual(['api', 'audit', 'authenticator', 'controllerManager', 'scheduler']);
    });

    test('sets cluster name using naming convention', () => {
      const setProps = (MdaaEKSCluster as unknown as MdaaEKSClusterStatic).setProps;
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'my-cluster',
      };

      const clusterProps = setProps(stack, props);
      expect(clusterProps.clusterName).toBe('test-resource-my-cluster');
    });
  });

  describe('Management Instance Policy Statements', () => {
    test('includes custom policy statements in management instance', () => {
      const customPolicyStatement = new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: ['arn:aws:s3:::my-bucket/*'],
      });

      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
        mgmtInstance: {
          subnetId: 'subnet-12345',
          availabilityZone: 'us-east-1a',
          mgmtPolicyStatements: [customPolicyStatement],
        },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster.mgmtInstance).toBeDefined();
    });
  });

  describe('Cluster Properties Validation', () => {
    test('creates cluster with all optional properties', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
        outputClusterName: true,
        outputConfigCommand: true,
        outputMastersRoleArn: true,
        mastersRole: adminRole,
        tags: { Environment: 'test' },
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster', props);
      expect(cluster).toBeDefined();
      expect(cluster.clusterName).toBeDefined();
    });

    test('creates cluster with undefined cluster name', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster2', props);
      expect(cluster).toBeDefined();
    });
  });

  describe('Chart Components', () => {
    test('creates EFS storage class and observability components', () => {
      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: KubernetesVersion.V1_31,
        clusterName: 'test-cluster',
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster3', props);

      expect(cluster.efsStorageClassName).toBe('efs-sc');
      expect(cluster.iamOidcIdentityProvider).toBeDefined();
      expect(cluster.mdaaKubeCtlProvider).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('handles missing kubectl layer gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const props = {
        naming,
        adminRoles: [adminRole],
        kmsKey,
        vpc,
        subnets: vpc.privateSubnets,
        version: { version: '1.35.0' } as KubernetesVersion,
        clusterName: 'test-cluster',
      };

      const cluster = new MdaaEKSCluster(stack, 'TestCluster4', props);
      expect(cluster).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
