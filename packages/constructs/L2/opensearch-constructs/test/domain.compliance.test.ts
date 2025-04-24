/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { SecurityGroup, Subnet, Vpc, EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { MdaaOpensearchDomain, MdaaOpensearchDomainProps } from '../lib';
import { ArnPrincipal, Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );
  const testVpc = Vpc.fromVpcAttributes(testApp.testStack, 'test-vpc', {
    vpcId: 'test-vpc-id',
    availabilityZones: ['test-az'],
    privateSubnetIds: ['test-subnet-id'],
  });

  const test_app_subnet_a = Subnet.fromSubnetAttributes(testApp.testStack, 'subnet-a', {
    subnetId: 'VpcISOLATEDSubnet1Subnet80F07FA1',
    availabilityZone: 'test-az-a',
  });
  const test_app_subnet_b = Subnet.fromSubnetAttributes(testApp.testStack, 'subnet-b', {
    subnetId: 'VpcISOLATEDSubnet2Subnet80F07FA2',
    availabilityZone: 'test-az-b',
  });
  const test_app_subnet_c = Subnet.fromSubnetAttributes(testApp.testStack, 'subnet-c', {
    subnetId: 'VpcISOLATEDSubnet3Subnet80F07FA3',
    availabilityZone: 'test-az-c',
  });

  const testSubnetSelection = [
    {
      subnets: [test_app_subnet_a, test_app_subnet_b, test_app_subnet_c],
    },
  ];

  const testSecurityGroup_1 = new SecurityGroup(testApp.testStack, 'test-security-group-1', { vpc: testVpc });
  const testSecurityGroup_2 = new SecurityGroup(testApp.testStack, 'test-security-group-2', { vpc: testVpc });

  const logGroupProps = {
    encryptionKey: testKey,
    logGroupNamePathPrefix: '/aws/opensearch-logs/',
    logGroupName: 'osDomain',
    retention: RetentionDays.INFINITE,
    naming: testApp.naming,
  };

  const logGroup = new MdaaLogGroup(testApp.testStack, `cloudwatch-log-group-${'osDomain'}`, logGroupProps);

  const testContstructProps: MdaaOpensearchDomainProps = {
    naming: testApp.naming,
    masterUserRoleArn: 'arn:test-partition:iam:test-region:test-account:role/data-admin',
    version: EngineVersion.openSearch('2.3'),
    opensearchDomainName: 'osDomain',
    enableVersionUpgrade: false,
    encryptionKey: testKey,
    vpc: testVpc,
    vpcSubnets: testSubnetSelection,
    securityGroups: [testSecurityGroup_1, testSecurityGroup_2],
    zoneAwareness: {
      availabilityZoneCount: 3,
    },
    capacity: {
      masterNodes: 3,
      masterNodeInstanceType: 'c6g.large.search',
      dataNodes: 5,
      dataNodeInstanceType: 'c6g.large.search',
      warmNodes: 3,
      warmInstanceType: 'ultrawarm1.medium.search',
    },

    ebs: {
      enabled: true,
      volumeSize: 100,
      volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
    },

    customEndpoint: {
      domainName: 'test-search.test-domain.com',
    },

    automatedSnapshotStartHour: 23,

    accessPolicies: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal('arn:test-partition:iam:test-region:test-account:role/data-admin')],
        actions: ['es:*'],
        resources: ['arn:test-partition:es:test-region:test-account:domain/test-domain/*'],
      }),
    ],
    logGroup: logGroup,
  };

  new MdaaOpensearchDomain(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);

  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('DomainName', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      DomainName: testApp.naming.resourceName(testContstructProps.opensearchDomainName, 28),
    });
  });

  test('AdvancedSecurityOptions', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        MasterUserOptions: {
          MasterUserARN: 'arn:test-partition:iam:test-region:test-account:role/data-admin',
        },
      },
    });
  });

  test('ClusterConfig', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      ClusterConfig: {
        DedicatedMasterCount: 3,
        DedicatedMasterEnabled: true,
        DedicatedMasterType: 'c6g.large.search',
        InstanceCount: 5,
        InstanceType: 'c6g.large.search',
        WarmCount: 3,
        WarmEnabled: true,
        WarmType: 'ultrawarm1.medium.search',
        ZoneAwarenessConfig: {
          AvailabilityZoneCount: 3,
        },
        ZoneAwarenessEnabled: true,
      },
    });
  });

  test('EnforceHTTPS', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      DomainEndpointOptions: {
        CustomEndpoint: 'test-search.test-domain.com',
        CustomEndpointEnabled: true,
        EnforceHTTPS: true,
        TLSSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07',
      },
    });
  });

  test('EncryptionAtRest', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      EncryptionAtRestOptions: {
        Enabled: true,
        KmsKeyId: 'test-key',
      },
    });
  });

  test('LoggingProperties', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      LogPublishingOptions: {
        ES_APPLICATION_LOGS: {
          Enabled: true,
        },
        SEARCH_SLOW_LOGS: {
          Enabled: true,
        },
        INDEX_SLOW_LOGS: {
          Enabled: true,
        },
        AUDIT_LOGS: {
          Enabled: true,
        },
      },
    });
  });

  test('NodeToNodeEncryption', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      NodeToNodeEncryptionOptions: {
        Enabled: true,
      },
    });
  });

  test('Snapshots', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      SnapshotOptions: {
        AutomatedSnapshotStartHour: 23,
      },
    });
  });

  test('DeletionPolicy', () => {
    template.hasResource('AWS::OpenSearchService::Domain', {
      DeletionPolicy: 'Retain',
    });
  });

  test('UpdatePolicy', () => {
    template.hasResource('AWS::OpenSearchService::Domain', {
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('VPCOptions', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      VPCOptions: {},
    });
  });
});
