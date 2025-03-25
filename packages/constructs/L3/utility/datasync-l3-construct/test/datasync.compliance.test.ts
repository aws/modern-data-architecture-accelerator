/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import {
  AgentWithNameProps,
  DataSyncL3Construct,
  DataSyncL3ConstructProps,
  LocationNfsWithNameProps,
  LocationObjectStorageWithNameProps,
  LocationS3WithNameProps,
  LocationsByTypeWithNameProps,
  LocationSmbWithNameProps,
  TaskWithNameProps,
  VpcProps,
} from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const testVpc: VpcProps = {
    vpcId: 'vpc-0123abcdef4ghi567j8',
    vpcCidrBlock: '10.0.0.0/8',
  };

  const testAgent01Props: AgentWithNameProps = {
    agentName: 'agent01',
    activationKey: 'ABCD-1234-EFGH-5678-IJKL', //gitleaks:allow
    subnetId: 'subnet-1234abcd',
    agentIpAddress: '1.1.1.1',
  };
  const testAgent02Props: AgentWithNameProps = {
    agentName: 'agent02',
    activationKey: 'XXXX-1234-XXXX-5678-XXXX', //gitleaks:allow
    subnetId: 'subnet-23454abcd',
    vpcEndpointId: 'vpce-0abcd1234e567890f',
    securityGroupId: 'sg-012345abcd6789efg',
    agentIpAddress: '2.2.2.2',
  };

  const testSmbLocation01Props: LocationSmbWithNameProps = {
    locationName: 'smb_loc1',
    agentNames: ['agent01'],
    secretName: '/test/mdaa/secret',
    serverHostname: 'hostname',
    subdirectory: 'subdir',
    smbVersion: 'SMB2',
  };

  const testSmbLocation02Props: LocationSmbWithNameProps = {
    locationName: 'smb_loc2',
    agentArns: ['arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd'],
    secretName: '/test/mdaa/secret',
    serverHostname: 'hostname2',
    subdirectory: 'subdir2',
  };
  const testS3Location1Props: LocationS3WithNameProps = {
    locationName: 's3Loc1',
    s3BucketArn: 'arn:test-partition:s3:::test-bucket-name',
    bucketAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
  };
  const testS3Location2Props: LocationS3WithNameProps = {
    locationName: 's3Loc2',
    s3BucketArn: 'arn:test-partition:s3:::test-bucket-name2',
    bucketAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
  };

  const testNfsLocation1: LocationNfsWithNameProps = {
    locationName: 'nfs_loc1',
    agentArns: ['arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd'],
    serverHostname: '10.0.3.138',
    subdirectory: '/shared/datasync1',
  };
  const testNfsLocation2: LocationNfsWithNameProps = {
    locationName: 'nfs_loc2',
    agentNames: ['agent01', 'agent02'],
    serverHostname: '10.0.3.138',
    subdirectory: '/shared/datasync2',
  };

  const testObjectLocation1: LocationObjectStorageWithNameProps = {
    locationName: 'obj_loc1',
    agentArns: ['arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd'],
    serverHostname: 'storage.googleapis.com',
    serverPort: 443,
    secretName: 'ssm:/org/datasync/object-storage/gcp',
    serverProtocol: 'HTTPS',
    bucketName: 'datasync-bucket',
    subdirectory: '/shared/datasync1',
  };

  const testObjectLocation2: LocationObjectStorageWithNameProps = {
    locationName: 'obj_loc2',
    agentArns: ['agent02'],
    serverHostname: 'storage.googleapis.com',
    serverPort: 443,
    secretName: 'ssm:/org/datasync/object-storage/gcp',
    serverProtocol: 'HTTPS',
    bucketName: 'datasync-bucket',
    subdirectory: '/shared/datasync2',
  };

  const testLocationProps: LocationsByTypeWithNameProps = {
    s3: [testS3Location1Props, testS3Location2Props],
    smb: [testSmbLocation01Props, testSmbLocation02Props],
    nfs: [testNfsLocation1, testNfsLocation2],
    objectStorage: [testObjectLocation1, testObjectLocation2],
  };

  const tasks: TaskWithNameProps[] = [
    {
      name: 'task1',
      sourceLocationName: 's3Loc2',
      destinationLocationArn: 'arn:test-partition:datasync:test-region:test-account:location/loc-0f01451b140b2test',
      includes: [
        {
          filterType: 'SIMPLE_PATTERN',
          value: '/data*|/inbound',
        },
      ],
      excludes: [
        {
          filterType: 'SIMPLE_PATTERN',
          value: '*.tmp|*.temp',
        },
      ],
      options: {
        logLevel: 'TRANSFER',
      },
    },
    {
      name: 'task2',
      sourceLocationArn: 'arn:test-partition:datasync:test-region:test-account:location/loc-0f01451b140b2af49',
      destinationLocationArn: 'arn:test-partition:datasync:test-region:test-account:location/loc-0f01451b140b2test',
      includes: [
        {
          filterType: 'SIMPLE_PATTERN',
          value: '/data|/inbound',
        },
      ],
      excludes: [
        {
          filterType: 'SIMPLE_PATTERN',
          value: '*.tmp|*.temp',
        },
      ],
      options: {
        logLevel: 'TRANSFER',
        preserveDeletedFiles: 'PRESERVE',
        transferMode: 'CHANGED',
        verifyMode: 'ONLY_FILES_TRANSFERRED',
      },
    },
    {
      name: 'task3',
      sourceLocationName: 'nfs_loc1',
      destinationLocationName: 'obj_loc1',
      includes: [
        {
          filterType: 'SIMPLE_PATTERN',
          value: '/data|/inbound',
        },
      ],
      excludes: [
        {
          filterType: 'SIMPLE_PATTERN',
          value: '*.tmp|*.temp',
        },
      ],
      options: {
        logLevel: 'TRANSFER',
        preserveDeletedFiles: 'REMOVE',
        transferMode: 'ALL',
        verifyMode: 'ONLY_FILES_TRANSFERRED',
      },
    },
  ];

  const constructProps: DataSyncL3ConstructProps = {
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    vpc: testVpc,
    agents: [testAgent01Props, testAgent02Props],
    locations: testLocationProps,
    tasks: tasks,
  };

  new DataSyncL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::DataSync::Agent', 2);
    template.resourceCountIs('AWS::DataSync::Task', 3);
    template.resourceCountIs('AWS::DataSync::LocationS3', 2);
    template.resourceCountIs('AWS::DataSync::LocationSMB', 2);
    template.resourceCountIs('AWS::DataSync::LocationNFS', 2);
    template.resourceCountIs('AWS::DataSync::LocationObjectStorage', 2);
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    template.resourceCountIs('AWS::SecretsManager::Secret', 0);
  });

  test('VPC Endpoint Testing', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: 'com.amazonaws.test-region.datasync',
      VpcId: 'vpc-0123abcdef4ghi567j8',
      PrivateDnsEnabled: false,
      SecurityGroupIds: [
        {
          'Fn::GetAtt': ['teststackvpcedatasyncsgBF2B6C4C', 'GroupId'],
        },
      ],
      SubnetIds: ['subnet-1234abcd'],
      VpcEndpointType: 'Interface',
    });
  });

  test('Agent1 Testing', () => {
    template.hasResourceProperties('AWS::DataSync::Agent', {
      ActivationKey: 'ABCD-1234-EFGH-5678-IJKL',
      AgentName: 'test-org-test-env-test-domain-test-module-agent01',
      SecurityGroupArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:test-partition:ec2:test-region:test-account:security-group/',
              {
                'Fn::GetAtt': ['teststackvpcedatasyncsgBF2B6C4C', 'GroupId'],
              },
            ],
          ],
        },
      ],
      SubnetArns: ['arn:test-partition:ec2:test-region:test-account:subnet/subnet-1234abcd'],
      VpcEndpointId: {
        Ref: 'teststackdatasyncendpoint4DD48888',
      },
    });
  });

  test('Agent2 Testing', () => {
    template.hasResourceProperties('AWS::DataSync::Agent', {
      ActivationKey: 'XXXX-1234-XXXX-5678-XXXX', //gitleaks:allow
      AgentName: 'test-org-test-env-test-domain-test-module-agent02',
    });
  });

  // Test security group & ingress rule
  test('SecurityGroup1 Testing', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: [
        {
          CidrIp: '1.1.1.1/32',
          Description: 'Allow DataSync data transfer HTTPS traffic from agents',
          FromPort: 443,
          IpProtocol: 'tcp',
          ToPort: 443,
        },
        {
          CidrIp: '1.1.1.1/32',
          Description: 'Allow DataSync control traffic from agents',
          FromPort: 1024,
          IpProtocol: 'tcp',
          ToPort: 1064,
        },
        {
          CidrIp: '2.2.2.2/32',
          Description: 'Allow DataSync data transfer HTTPS traffic from agents',
          FromPort: 443,
          IpProtocol: 'tcp',
          ToPort: 443,
        },
        {
          CidrIp: '2.2.2.2/32',
          Description: 'Allow DataSync control traffic from agents',
          FromPort: 1024,
          IpProtocol: 'tcp',
          ToPort: 1064,
        },
        {
          CidrIp: '10.0.0.0/8',
          Description: 'from 10.0.0.0/8:443',
          FromPort: 443,
          IpProtocol: 'tcp',
          ToPort: 443,
        },
      ],
      VpcId: 'vpc-0123abcdef4ghi567j8',
    });
  });

  test('Location Testing SMB 1', () => {
    template.hasResourceProperties('AWS::DataSync::LocationSMB', {
      AgentArns: [
        {
          'Fn::GetAtt': ['teststackagent01agent328699D7', 'AgentArn'],
        },
      ],
    });
  });

  test('Location Testing SMB 2', () => {
    template.hasResourceProperties('AWS::DataSync::LocationSMB', {
      AgentArns: ['arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd'],
      Password:
        '{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:/test/mdaa/secret:SecretString:password::}}',
      ServerHostname: 'hostname2',
      Subdirectory: 'subdir2',
      User: '{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:/test/mdaa/secret:SecretString:user::}}',
    });
  });

  test('Location Testing NFS 1', () => {
    template.hasResourceProperties('AWS::DataSync::LocationNFS', {
      OnPremConfig: {
        AgentArns: ['arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd'],
      },
      ServerHostname: '10.0.3.138',
      Subdirectory: '/shared/datasync1',
    });
  });

  test('Location Testing Obj 1', () => {
    template.hasResourceProperties('AWS::DataSync::LocationObjectStorage', {
      AgentArns: ['arn:test-partition:datasync:test-region:test-account:agent/agent-063abf853f2a7ebdd'],
      BucketName: 'datasync-bucket',
      ServerHostname: 'storage.googleapis.com',
      AccessKey:
        '{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:ssm:/org/datasync/object-storage/gcp:SecretString:accessKey::}}',
      SecretKey:
        '{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:ssm:/org/datasync/object-storage/gcp:SecretString:secretKey::}}',
      ServerPort: 443,
      ServerProtocol: 'HTTPS',
      Subdirectory: '/shared/datasync1',
    });
  });

  test('Location Testing Obj 2', () => {
    template.hasResourceProperties('AWS::DataSync::LocationObjectStorage', {
      AgentArns: ['agent02'],
      BucketName: 'datasync-bucket',
      ServerHostname: 'storage.googleapis.com',
      AccessKey:
        '{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:ssm:/org/datasync/object-storage/gcp:SecretString:accessKey::}}',
      SecretKey:
        '{{resolve:secretsmanager:arn:test-partition:secretsmanager:test-region:test-account:secret:ssm:/org/datasync/object-storage/gcp:SecretString:secretKey::}}',
      ServerPort: 443,
      ServerProtocol: 'HTTPS',
      Subdirectory: '/shared/datasync2',
    });
  });

  test('Task Testing-1', () => {
    template.hasResourceProperties('AWS::DataSync::Task', {
      DestinationLocationArn: 'arn:test-partition:datasync:test-region:test-account:location/loc-0f01451b140b2test',
      SourceLocationArn: {},
      Excludes: [
        {
          FilterType: 'SIMPLE_PATTERN',
          Value: '*.tmp|*.temp',
        },
      ],
      Includes: [
        {
          FilterType: 'SIMPLE_PATTERN',
          Value: '/data*|/inbound',
        },
      ],
      Name: 'test-org-test-env-test-domain-test-module-task1',
      Options: {
        LogLevel: 'TRANSFER',
      },
    });
  });

  test('Task Testing-2', () => {
    template.hasResourceProperties('AWS::DataSync::Task', {
      DestinationLocationArn: 'arn:test-partition:datasync:test-region:test-account:location/loc-0f01451b140b2test',
      SourceLocationArn: 'arn:test-partition:datasync:test-region:test-account:location/loc-0f01451b140b2af49',
      CloudWatchLogGroupArn: {},
      Excludes: [
        {
          FilterType: 'SIMPLE_PATTERN',
          Value: '*.tmp|*.temp',
        },
      ],
      Includes: [
        {
          FilterType: 'SIMPLE_PATTERN',
          Value: '/data|/inbound',
        },
      ],
      Name: 'test-org-test-env-test-domain-test-module-task2',
      Options: {
        LogLevel: 'TRANSFER',
        PreserveDeletedFiles: 'PRESERVE',
        TransferMode: 'CHANGED',
        VerifyMode: 'ONLY_FILES_TRANSFERRED',
      },
    });
  });

  test('Task Testing-3', () => {
    template.hasResourceProperties('AWS::DataSync::Task', {
      DestinationLocationArn: {},
      SourceLocationArn: {},
      CloudWatchLogGroupArn: {},
      Excludes: [
        {
          FilterType: 'SIMPLE_PATTERN',
          Value: '*.tmp|*.temp',
        },
      ],
      Includes: [
        {
          FilterType: 'SIMPLE_PATTERN',
          Value: '/data|/inbound',
        },
      ],
      Name: 'test-org-test-env-test-domain-test-module-task3',
      Options: {
        LogLevel: 'TRANSFER',
        PreserveDeletedFiles: 'REMOVE',
        TransferMode: 'ALL',
        VerifyMode: 'ONLY_FILES_TRANSFERRED',
      },
    });
  });
});
