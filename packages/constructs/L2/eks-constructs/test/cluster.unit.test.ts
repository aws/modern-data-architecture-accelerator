/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from 'aws-cdk-lib';
import { Vpc, InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { KubernetesVersion, EndpointAccess, ClusterProps } from 'aws-cdk-lib/aws-eks';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
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
});
