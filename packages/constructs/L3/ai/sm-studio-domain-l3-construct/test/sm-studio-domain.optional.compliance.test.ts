/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock aws-cdk-lib/aws-lambda to avoid Docker build during tests
jest.mock('aws-cdk-lib/aws-lambda', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda');
  return {
    ...actual,
    Code: {
      ...actual.Code,
      fromAsset: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
      fromDockerBuild: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
      fromCustomCommand: jest.fn().mockReturnValue({
        bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
        bindToResource: jest.fn(),
      }),
    },
  };
});

// Mock command-exists to simulate Docker availability
jest.mock('command-exists', () => ({
  sync: jest.fn().mockReturnValue(false), // Simulate Docker not available to use pip fallback
}));

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Protocol } from 'aws-cdk-lib/aws-ec2';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  SagemakerStudioDomainL3Construct,
  SagemakerStudioDomainL3ConstructProps,
} from '../lib/sm-studio-domain-l3-construct';
import { LifecycleScriptProps } from '@aws-mdaa/sm-shared';

describe('Studio Domain Optional Props', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const ingress = {
    ipv4: [
      {
        cidr: '10.0.0.0/28',
        port: 443,
        protocol: Protocol.TCP,
      },
    ],
  };
  const egress = {
    ipv4: [
      {
        cidr: '10.0.0.0/28',
        port: 443,
        protocol: Protocol.TCP,
      },
    ],
  };

  const lifecycleConfig: LifecycleScriptProps = {
    assets: {
      testing: {
        sourcePath: './test/test_assets/',
      },
    },
    cmds: ['testing'],
  };

  const assetDeploymentRole = new Role(stack, 'test-existing-deployment-role', {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
  });

  const constructProps: SagemakerStudioDomainL3ConstructProps = {
    domain: {
      authMode: 'SSO',
      vpcId: 'test-vpc-id',
      subnetIds: ['test-sub-id'],
      defaultUserSettings: {},
      securityGroupIngress: ingress,
      securityGroupEgress: egress,
      notebookSharingPrefix: 'testing',
      userProfiles: {
        'test-user-id': {
          userRole: {
            id: 'test-role-id',
          },
        },
      },
      lifecycleConfigs: {
        kernel: lifecycleConfig,
        jupyter: lifecycleConfig,
      },
      domainBucket: {
        domainBucketName: 'test-existing-bucket',
        assetDeploymentRole: {
          arn: assetDeploymentRole.roleArn,
        },
      },
    },
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new SagemakerStudioDomainL3Construct(stack, 'domain', constructProps);
  const template = Template.fromStack(stack);

  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

  testApp.checkCdkNagCompliance(stack);

  test('Validate if Domain is created', () => {
    template.resourceCountIs('AWS::SageMaker::Domain', 1);
  });

  test('SecurityGroup Egress Testing', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 2);
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      CidrIp: '10.0.0.0/28',
      Description: 'to 10.0.0.0/28:tcp PORT 443',
      FromPort: 443,
      IpProtocol: 'tcp',
      ToPort: 443,
    });
  });
  test('SecurityGroup Ingress Testing', () => {
    // 1 configured in test
    // 2 Self referencing rule for inter-container traffic
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 2);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      CidrIp: '10.0.0.0/28',
      Description: 'from 10.0.0.0/28:tcp PORT 443',
      FromPort: 443,
      IpProtocol: 'tcp',
      ToPort: 443,
    });
  });
});

describe('Studio Domain User Profile Name Validation', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('Should throw error for invalid user profile name pattern', () => {
    const assetDeploymentRole = new Role(testApp.testStack, 'test-deployment-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'SSO',
        vpcId: 'test-vpc-id',
        subnetIds: ['test-sub-id'],
        notebookSharingPrefix: 'testing',
        dataAdminRoles: [{ id: 'admin-role-id' }],
        userProfiles: {
          // This will become '---invalid---' after replace(/\W/g, '-'), which doesn't match the pattern
          '---invalid---': {
            userRole: {
              id: 'test-role-id',
            },
          },
        },
        domainBucket: {
          domainBucketName: 'test-existing-bucket',
          assetDeploymentRole: {
            arn: assetDeploymentRole.roleArn,
          },
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    };

    expect(() => {
      new SagemakerStudioDomainL3Construct(testApp.testStack, 'domain', constructProps);
    }).toThrow(/Invalid SageMaker UserProfile name/);
  });

  test('Should accept valid user profile names', () => {
    const assetDeploymentRole = new Role(testApp.testStack, 'test-deployment-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'SSO',
        vpcId: 'test-vpc-id',
        subnetIds: ['test-sub-id'],
        notebookSharingPrefix: 'testing',
        dataAdminRoles: [{ id: 'admin-role-id' }],
        userProfiles: {
          'valid-user-name': {
            userRole: {
              id: 'test-role-id',
            },
          },
          AnotherValidUser123: {
            userRole: {
              id: 'test-role-id-2',
            },
          },
        },
        domainBucket: {
          domainBucketName: 'test-existing-bucket',
          assetDeploymentRole: {
            arn: assetDeploymentRole.roleArn,
          },
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    };

    // Should not throw
    expect(() => {
      new SagemakerStudioDomainL3Construct(testApp.testStack, 'domain', constructProps);
    }).not.toThrow();
  });
});
