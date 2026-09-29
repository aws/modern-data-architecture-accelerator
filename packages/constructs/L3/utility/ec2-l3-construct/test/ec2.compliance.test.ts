/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockDeviceProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import {
  Ec2L3Construct,
  Ec2L3ConstructProps,
  InitProps,
  InstanceProps,
  SecurityGroupProps,
} from '../lib/ec2-l3-construct';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/test-role',
    id: 'test-id',
    name: 'test-role',
  };

  const ingress: MdaaSecurityGroupRuleProps = {
    ipv4: [
      {
        cidr: '10.0.0.0/28',
        port: 443,
        protocol: 'tcp',
      },
    ],
  };

  const egress: MdaaSecurityGroupRuleProps = {
    ipv4: [
      {
        cidr: '10.0.0.0/28',
        port: 443,
        protocol: 'TCP',
      },
    ],
  };

  const securityGroupProps: SecurityGroupProps = {
    ingressRules: ingress,
    egressRules: egress,
    vpcId: 'test-vpc-id',
  };

  const testBlockDeviceProps: BlockDeviceProps = {
    deviceName: '/dev/sda1',
    volumeSizeInGb: 32,
    ebsType: EbsDeviceVolumeType.GP3,
  };

  const testBlockDevicesProps: BlockDeviceProps[] = [testBlockDeviceProps];

  const initProps: InitProps = {
    configSets: {
      default: { configs: ['awscli', 'Preinstall'] },
      reverseset: { configs: ['Preinstall', 'awscli'] },
    },
    configs: {
      awscli: {
        packages: {
          awsPackage: {
            packageManager: 'msi',
            packageLocation: 'https://awscli.amazonaws.com//AWSCLI64.msi',
          },
          anotherPackage: {
            packageManager: 'msi',
            packageLocation: 'https://awscli.amazonaws.com/thisisanotherpackage.msi',
          },
        },
      },
      Preinstall: {
        packages: {
          somePackage: {
            packageManager: 'msi',
            packageLocation: 'https://awscli.amazonaws.com/somepackagefromconfig.msi',
          },
        },
        commands: {
          '01testCommand': {
            shellCommand: 'echo "this is a command"',
          },
          '02anotherTestCommand': {
            shellCommand: 'echo "this TOO is a command"',
            testCommand: 'echo "this is test command"',
            workingDir: '/some/dir/',
            waitAfterCompletion: 4,
          },
        },
        files: {
          'testfile.txt': {
            filePath: './test/somefile.txt',
          },
        },
        services: {
          'cfn-hup': {
            enabled: true,
            ensureRunning: true,
          },
        },
      },
    },
  };

  const instance1: InstanceProps = {
    securityGroup: 'testing',
    instanceType: 'm5.large',
    amiId: '/golden-ami/al2',
    vpcId: 'test-vpc-id',
    subnetId: 'test-sub-id',
    blockDevices: testBlockDevicesProps,
    instanceRole: testRoleRef,
    availabilityZone: 'test-region',
    osType: 'windows',
    initName: 'init1',
    userDataScriptPath: './test/userdata.sh',
    existingKeyPairName: 'existing-rsa-key',
  };

  const instance2: InstanceProps = {
    securityGroupId: 'sg-testing',
    instanceType: 'm5.large',
    amiId: '/golden-ami/al2',
    vpcId: 'test-vpc-id',
    subnetId: 'test-sub-id',
    blockDevices: testBlockDevicesProps,
    instanceRole: testRoleRef,
    availabilityZone: 'test-region',
    osType: 'windows',
    initName: 'init1',
    signalCount: 1,
    creationTimeOut: 'PT15M',
    keyPairName: 'test-key-pair',
  };

  const constructProps: Ec2L3ConstructProps = {
    adminRoles: [
      {
        id: 'admin-role-id',
      },
    ],
    keyPairs: {
      'test-key-pair': {},
    },
    securityGroups: {
      testing: securityGroupProps,
    },
    instances: {
      'test-instance': instance1,
      'test-instance2': instance2,
    },
    cfnInit: {
      init1: initProps,
    },

    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new Ec2L3Construct(stack, 'instances', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Validate if ec2 instance is created', () => {
    template.resourceCountIs('AWS::EC2::Instance', 2);
  });

  test('Validate SG', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      SecurityGroupIds: [
        {
          'Fn::GetAtt': ['instancestesting3D7F8701', 'GroupId'],
        },
      ],
    });
  });

  test('Validate KMS', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            DeleteOnTermination: false,
            Encrypted: true,
            KmsKeyId: {
              'Fn::GetAtt': ['instanceskmskey7952A58F', 'Arn'],
            },
            VolumeSize: 32,
            VolumeType: 'gp3',
          },
        },
      ],
    });
  });

  test('KMSUsageAccess', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: [
          {
            Action: 'kms:*',
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:test-partition:iam::test-account:root',
            },
            Resource: '*',
          },
          {
            Action: [
              'kms:Decrypt',
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['admin-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          },
          {
            Action: [
              'kms:Create*',
              'kms:Describe*',
              'kms:Enable*',
              'kms:List*',
              'kms:Put*',
              'kms:Update*',
              'kms:Revoke*',
              'kms:Disable*',
              'kms:Get*',
              'kms:Delete*',
              'kms:TagResource',
              'kms:UntagResource',
              'kms:ScheduleKeyDeletion',
              'kms:CancelKeyDeletion',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['admin-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          },
          {
            Action: ['kms:Decrypt', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'],
            Condition: {
              StringEquals: {
                'kms:ViaService': 'secretsmanager.test-region.amazonaws.com',
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:test-partition:iam::test-account:root',
            },
            Resource: '*',
          },
          {
            Action: ['kms:CreateGrant', 'kms:DescribeKey'],
            Condition: {
              StringEquals: {
                'kms:ViaService': 'secretsmanager.test-region.amazonaws.com',
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:test-partition:iam::test-account:root',
            },
            Resource: '*',
          },
          {
            Action: [
              'kms:Decrypt',
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
              'kms:CreateGrant',
              'kms:DescribeKey',
              'kms:ListAliases',
            ],
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:test-partition:iam::test-account:role/test-role',
            },
            Resource: '*',
          },
        ],
        Version: '2012-10-17',
      },
    });
  });

  test('SecurityGroup Egress Testing', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 1);
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      CidrIp: '10.0.0.0/28',
      Description: 'to 10.0.0.0/28:tcp PORT 443',
      FromPort: 443,
      IpProtocol: 'tcp',
      ToPort: 443,
    });
  });
  test('SecurityGroup Ingress Testing', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      CidrIp: '10.0.0.0/28',
      Description: 'from 10.0.0.0/28:tcp PORT 443',
      FromPort: 443,
      IpProtocol: 'tcp',
      ToPort: 443,
    });
  });
  test('SecurityGroup VPC Testing', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      VpcId: 'test-vpc-id',
    });
  });
  test('CfnInit testing', () => {
    template.templateMatches({
      Resources: {
        instancestestinstance2instance3050F03C: {
          Type: 'AWS::EC2::Instance',
          Metadata: {
            'AWS::CloudFormation::Init': {
              configSets: {
                default: ['awscli', 'Preinstall'],
                reverseset: ['Preinstall', 'awscli'],
              },
              awscli: {
                packages: {
                  msi: {
                    '000': 'https://awscli.amazonaws.com//AWSCLI64.msi',
                    '001': 'https://awscli.amazonaws.com/thisisanotherpackage.msi',
                  },
                },
              },
              Preinstall: {
                packages: {
                  msi: {
                    '000': 'https://awscli.amazonaws.com/somepackagefromconfig.msi',
                  },
                },
                files: {
                  'testfile.txt': {
                    //   "source": {
                    //     "Fn::Sub": "https://s3.test-region.${AWS::URLSuffix}/cdk-hnb659fds-assets-test-account-test-region/48bdc3ffa2efd61be3c7282ed133f9c32eb4e155f022d36854ff9e5e425fc46c.txt"
                    //   }
                  },
                },
                commands: {
                  '01testCommand': {
                    command: 'echo "this is a command"',
                  },
                  '02anotherTestCommand': {
                    command: 'echo "this TOO is a command"',
                    cwd: '/some/dir/',
                    test: 'echo "this is test command"',
                    waitAfterCompletion: 240,
                  },
                },
                services: {
                  windows: {
                    'cfn-hup': {
                      enabled: true,
                      ensureRunning: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
  test('Creation Policy testing', () => {
    template.templateMatches({
      Resources: {
        instancestestinstance2instance3050F03C: {
          Type: 'AWS::EC2::Instance',
          CreationPolicy: {
            ResourceSignal: {
              Count: 1,
              Timeout: 'PT15M',
            },
          },
        },
      },
    });
  });
});

describe('Security Group Rules (existing SGs) Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  // 'rules' adds ingress/egress to security groups that already exist (created by other
  // modules), referenced by id. No security group is created here. Verifies the QuickSight<->
  // Redshift wiring pattern: egress on group A to group B, ingress on group B from group A.
  const constructProps: Ec2L3ConstructProps = {
    adminRoles: [{ id: 'admin-role-id' }],
    rules: {
      'qs-to-redshift-egress': {
        securityGroupId: 'sg-quicksight',
        egressRules: {
          sg: [{ sgId: 'sg-redshift', port: 5440, protocol: 'tcp' }],
        },
      },
      'redshift-from-qs-ingress': {
        securityGroupId: 'sg-redshift',
        ingressRules: {
          sg: [{ sgId: 'sg-quicksight', port: 5440, protocol: 'tcp' }],
        },
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new Ec2L3Construct(stack, 'instances', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('No security group is created for rules', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
  });

  test('Egress rule added to existing QuickSight SG towards Redshift SG', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 1);
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: 'sg-quicksight',
      DestinationSecurityGroupId: 'sg-redshift',
      FromPort: 5440,
      ToPort: 5440,
      IpProtocol: 'tcp',
    });
  });

  test('Ingress rule added to existing Redshift SG from QuickSight SG', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 1);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      GroupId: 'sg-redshift',
      SourceSecurityGroupId: 'sg-quicksight',
      FromPort: 5440,
      ToPort: 5440,
      IpProtocol: 'tcp',
    });
  });

  test('No KMS key is created for a rules-only deployment', () => {
    template.resourceCountIs('AWS::KMS::Key', 0);
  });
});

describe('Security Group Rules (existing SGs) ipv4 and prefixList Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  // Exercises the ipv4 (CIDR) and prefixList rule paths on existing security groups, for both
  // ingress and egress. Complements the sg-based suite above.
  const constructProps: Ec2L3ConstructProps = {
    adminRoles: [{ id: 'admin-role-id' }],
    rules: {
      'ipv4-and-prefixlist-rules': {
        securityGroupId: 'sg-existing',
        ingressRules: {
          ipv4: [{ cidr: '10.0.0.0/28', port: 443, protocol: 'tcp' }],
          prefixList: [{ prefixList: 'pl-ingress01', port: 443, protocol: 'tcp' }],
        },
        egressRules: {
          ipv4: [{ cidr: '10.0.1.0/28', port: 443, protocol: 'tcp' }],
          prefixList: [{ prefixList: 'pl-egress01', port: 443, protocol: 'tcp' }],
        },
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new Ec2L3Construct(stack, 'instances', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Ingress ipv4 rule added with the expected CidrIp', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      GroupId: 'sg-existing',
      CidrIp: '10.0.0.0/28',
      FromPort: 443,
      ToPort: 443,
      IpProtocol: 'tcp',
    });
  });

  test('Ingress prefixList rule added referencing the expected prefix list id', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      GroupId: 'sg-existing',
      SourcePrefixListId: 'pl-ingress01',
      FromPort: 443,
      ToPort: 443,
      IpProtocol: 'tcp',
    });
  });

  test('Egress ipv4 rule added with the expected CidrIp', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: 'sg-existing',
      CidrIp: '10.0.1.0/28',
      FromPort: 443,
      ToPort: 443,
      IpProtocol: 'tcp',
    });
  });

  test('Egress prefixList rule added referencing the expected prefix list id', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: 'sg-existing',
      DestinationPrefixListId: 'pl-egress01',
      FromPort: 443,
      ToPort: 443,
      IpProtocol: 'tcp',
    });
  });
});

describe('Security Group Rules (existing SGs) per-rule suppressions Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  // A rule with a per-rule CDK Nag suppression. The rules-on-existing-SG path must carry the
  // suppression onto the emitted CfnSecurityGroupIngress so intentionally broad rules can pass nag.
  const constructProps: Ec2L3ConstructProps = {
    adminRoles: [{ id: 'admin-role-id' }],
    rules: {
      'broad-ingress': {
        securityGroupId: 'sg-existing',
        ingressRules: {
          ipv4: [
            {
              cidr: '0.0.0.0/0',
              port: 443,
              protocol: 'tcp',
              description: 'Public HTTPS ingress',
              suppressions: [{ id: 'AwsSolutions-EC23', reason: 'Public HTTPS endpoint is intentional for this kit.' }],
            },
          ],
        },
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new Ec2L3Construct(stack, 'instances', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('Applies the per-rule CDK Nag suppression to the emitted ingress rule', () => {
    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress', {
      Properties: { GroupId: 'sg-existing', CidrIp: '0.0.0.0/0' },
    });
    const entries = Object.values(ingressRules);
    expect(entries).toHaveLength(1);
    const suppressions = (entries[0] as { Metadata?: { cdk_nag?: { rules_to_suppress?: Array<{ id: string }> } } })
      .Metadata?.cdk_nag?.rules_to_suppress;
    expect(suppressions).toBeDefined();
    expect(suppressions?.some(s => s.id === 'AwsSolutions-EC23')).toBe(true);
  });
});

describe('Network Interface Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: Ec2L3ConstructProps = {
    adminRoles: [{ id: 'admin-role-id' }],
    securityGroups: {
      'proxy-sg': {
        vpcId: 'test-vpc-id',
        ingressRules: {
          ipv4: [{ cidr: '10.0.0.0/16', port: 3128, protocol: 'tcp' }],
        },
      },
    },
    networkInterfaces: {
      'proxy-eni': {
        subnetId: 'subnet-eni',
        description: 'Static proxy data-path interface',
        privateIpAddress: '10.0.1.50',
        securityGroups: ['proxy-sg'],
        securityGroupIds: ['sg-existinginterface'],
        sourceDestCheck: false,
      },
      'unattached-eni': {
        subnetId: 'subnet-eni',
        securityGroupIds: ['sg-existinginterface'],
      },
    },
    instances: {
      'proxy-1': {
        securityGroup: 'proxy-sg',
        instanceType: 't3.medium',
        amiId: 'ami-proxy',
        vpcId: 'test-vpc-id',
        subnetId: 'test-sub-id',
        blockDevices: [
          {
            deviceName: '/dev/xvda',
            volumeSizeInGb: 32,
            ebsType: EbsDeviceVolumeType.GP3,
          },
        ],
        instanceRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        availabilityZone: 'test-region-a',
        osType: 'linux',
        networkInterfaces: [
          { networkInterface: 'proxy-eni', deviceIndex: 1 },
          { networkInterfaceId: 'eni-externallyowned', deviceIndex: 2, deleteOnTermination: true },
        ],
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  const construct = new Ec2L3Construct(stack, 'instances', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // Logical id of the sole instance, so attachments can be pinned to the instance they target
  // rather than merely to a device index.
  const instanceLogicalId = Object.keys(template.findResources('AWS::EC2::Instance'))[0];

  test('Creates one network interface per networkInterfaces entry', () => {
    template.resourceCountIs('AWS::EC2::NetworkInterface', 2);
  });

  test('Network interface carries fixed private IP, description and sourceDestCheck', () => {
    template.hasResourceProperties('AWS::EC2::NetworkInterface', {
      SubnetId: 'subnet-eni',
      Description: 'Static proxy data-path interface',
      PrivateIpAddress: '10.0.1.50',
      SourceDestCheck: false,
    });
  });

  test('Network interface combines named and pre-existing security groups', () => {
    template.hasResourceProperties('AWS::EC2::NetworkInterface', {
      PrivateIpAddress: '10.0.1.50',
      GroupSet: [{ 'Fn::GetAtt': ['instancesproxysg9E755BEF', 'GroupId'] }, 'sg-existinginterface'],
    });
  });

  test('Network interface is retained across stack deletion and replacing updates', () => {
    const interfaces = Object.values(
      template.findResources('AWS::EC2::NetworkInterface') as Record<
        string,
        { DeletionPolicy?: string; UpdateReplacePolicy?: string }
      >,
    );
    expect(interfaces).toHaveLength(2);
    interfaces.forEach(networkInterface => {
      expect(networkInterface.DeletionPolicy).toBe('RetainExceptOnCreate');
      expect(networkInterface.UpdateReplacePolicy).toBe('Retain');
    });
  });

  test('Network interface id and private IP are published', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: testApp.naming.ssmPath('network-interface/proxy-eni/id'),
    });
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: testApp.naming.ssmPath('network-interface/proxy-eni/private-ip'),
    });
  });

  test('Attachment is a standalone resource so replacing updates can detach first', () => {
    template.resourceCountIs('AWS::EC2::NetworkInterfaceAttachment', 2);
    template.resourceCountIs('AWS::EC2::Instance', 1);
    template.hasResourceProperties('AWS::EC2::Instance', {
      NetworkInterfaces: Match.absent(),
    });
  });

  test('Attachment of a config-declared interface defaults DeleteOnTermination to false', () => {
    template.hasResourceProperties('AWS::EC2::NetworkInterfaceAttachment', {
      InstanceId: { Ref: instanceLogicalId },
      DeviceIndex: '1',
      DeleteOnTermination: false,
      NetworkInterfaceId: { 'Fn::GetAtt': [Match.stringLikeRegexp('.*proxyeni.*'), 'Id'] },
    });
  });

  test('Attachment of a config-declared interface is keyed on the interface, not the device index', () => {
    // The construct id becomes the logical ID, so this is what makes a deviceIndex change, a move
    // to another instance and an instance rename single-deploy replacements of one resource.
    const attachments = Object.entries(
      template.findResources('AWS::EC2::NetworkInterfaceAttachment') as Record<
        string,
        { Properties: { DeviceIndex: string } }
      >,
    );
    const byName = attachments.find(([, resource]) => resource.Properties.DeviceIndex === '1');
    const byId = attachments.find(([, resource]) => resource.Properties.DeviceIndex === '2');
    expect(byName?.[0]).toMatch(/attachmentnameproxyeni/);
    expect(byName?.[0]).not.toMatch(/proxy1/);
    // An ssm: id is an unresolved token at synth, so a by-id attachment stays keyed on the
    // instance name and device index.
    expect(byId?.[0]).toMatch(/attachmentidproxy1/);
  });

  test('Attachment of a pre-existing interface honours an explicit DeleteOnTermination', () => {
    template.hasResourceProperties('AWS::EC2::NetworkInterfaceAttachment', {
      InstanceId: { Ref: instanceLogicalId },
      DeviceIndex: '2',
      DeleteOnTermination: true,
      NetworkInterfaceId: 'eni-externallyowned',
    });
  });

  test('Interfaces are exposed on the construct for downstream consumers', () => {
    expect(Object.keys(construct.networkInterfaces).sort()).toEqual(['proxy-eni', 'unattached-eni']);
  });

  test('An interface no instance attaches is created, and warned about under its ack id', () => {
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp(
        'networkInterfaces declares unattached-eni.*\\[ack: @aws-mdaa/ec2:unattachedNetworkInterface\\]',
      ),
    );
    expect(warnings).toHaveLength(1);
  });

  test('Every interface carries a non-empty GroupSet', () => {
    // No interface may reach the template without a security group: EC2 would place it in the
    // permissive VPC default group, an association absent from the template and from CDK Nag.
    const groupSets = Object.values(
      template.findResources('AWS::EC2::NetworkInterface') as Record<string, { Properties: { GroupSet?: unknown[] } }>,
    ).map(networkInterface => networkInterface.Properties.GroupSet);
    expect(groupSets).toHaveLength(2);
    groupSets.forEach(groupSet => expect(groupSet?.length).toBeGreaterThan(0));
  });
});

describe('Network Interface Warning Absence Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  // Every declared interface is attached, so the warning has nothing to report. Without this, a
  // threshold slip -- firing on every synth of every EC2 module -- still satisfies the assertion
  // above.
  new Ec2L3Construct(stack, 'instances', {
    adminRoles: [{ id: 'admin-role-id' }],
    networkInterfaces: {
      'proxy-eni': {
        subnetId: 'subnet-eni',
        securityGroupIds: ['sg-existinginterface'],
      },
    },
    instances: {
      'proxy-1': {
        securityGroupId: 'sg-existinginstance',
        instanceType: 't3.medium',
        amiId: 'ami-proxy',
        vpcId: 'test-vpc-id',
        subnetId: 'test-sub-id',
        blockDevices: [
          {
            deviceName: '/dev/xvda',
            volumeSizeInGb: 32,
            ebsType: EbsDeviceVolumeType.GP3,
          },
        ],
        instanceRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        availabilityZone: 'test-region-a',
        osType: 'linux',
        networkInterfaces: [{ networkInterface: 'proxy-eni', deviceIndex: 1 }],
      },
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  });
  Template.fromStack(stack);

  test('No unattached-interface warning when every interface is attached', () => {
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('\\[ack: @aws-mdaa/ec2:unattachedNetworkInterface\\]'),
    );
    expect(warnings).toHaveLength(0);
  });
});

describe('Cross-Account Admin Role Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountEc2Admin';

  const constructProps: Ec2L3ConstructProps = {
    adminRoles: [{ arn: crossAccountArn }],
    keyPairs: {
      'xacct-key-pair': {},
    },
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new Ec2L3Construct(stack, 'xacctstack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('cross-account admin is granted key usage by ARN principal', () => {
    // getKmsKey passes adminRoles as both keyAdminRoles and keyUserRoles. The same-account path
    // scopes by aws:userId, which a principal in another account can never satisfy, so the
    // cross-account role has to be routed to a direct ARN principal instead.
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt', 'kms:DescribeKey']),
            Sid: Match.stringLikeRegexp('xacct-usage-stmt'),
          }),
        ]),
      },
    });
  });

  test('cross-account admin is granted the delegable key admin actions by ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: Match.arrayWith(['kms:CreateGrant', 'kms:DescribeKey']),
            Sid: Match.stringLikeRegexp('xacct-admin-stmt'),
          }),
        ]),
      },
    });
  });

  test('no aws:userId conditioned statement is emitted for the cross-account role', () => {
    const keyStatements = Object.values(template.findResources('AWS::KMS::Key'))[0].Properties.KeyPolicy.Statement;
    const userIds = keyStatements.flatMap(
      (stmt: { Condition?: { StringLike?: { 'aws:userId'?: string[] } } }) =>
        stmt.Condition?.StringLike?.['aws:userId'] ?? [],
    );
    expect(userIds).toHaveLength(0);
  });

  test('no role resolution custom resource is created for the cross-account role', () => {
    // Resolving a cross-account role id calls IAM in the deploying account and fails the deploy.
    expect(Object.keys(template.findResources('AWS::CloudFormation::CustomResource'))).toHaveLength(0);
  });
});
