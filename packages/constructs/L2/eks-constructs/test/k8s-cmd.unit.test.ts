/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { KubernetesCmd } from '../lib/k8s-cmd';
import { MdaaEKSCluster } from '../lib/cluster';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

// Mock the kubectl layer
jest.mock('@aws-cdk/lambda-layer-kubectl-v31', () => ({
  KubectlV31Layer: jest.fn().mockImplementation(() => ({
    layerVersionArn: 'arn:aws:lambda:us-east-1:123456789012:layer:kubectl-v31:1',
  })),
}));

describe('KubernetesCmd Unit Tests', () => {
  let app: App;
  let stack: Stack;
  let vpc: Vpc;
  let kmsKey: Key;
  let adminRole: Role;
  let naming: IMdaaResourceNaming;
  let cluster: MdaaEKSCluster;

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
      withDomain: jest.fn().mockReturnThis(),
      withOrg: jest.fn().mockReturnThis(),
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

    cluster = new MdaaEKSCluster(stack, 'TestCluster', {
      naming,
      adminRoles: [adminRole],
      kmsKey,
      vpc,
      subnets: vpc.privateSubnets,
      version: KubernetesVersion.V1_31,
      clusterName: 'test-cluster',
    });
  });

  describe('Constructor', () => {
    test('creates KubernetesCmd successfully', () => {
      expect(() => {
        new KubernetesCmd(stack, 'TestCmd', {
          cluster,
          cmd: ['get', 'pods'],
        });
      }).not.toThrow();
    });

    test('creates KubernetesCmd with different command', () => {
      expect(() => {
        new KubernetesCmd(stack, 'TestCmd2', {
          cluster,
          cmd: ['apply', '-f', 'manifest.yaml'],
        });
      }).not.toThrow();
    });
  });
});
