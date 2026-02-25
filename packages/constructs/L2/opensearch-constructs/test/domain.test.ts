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

describe('MDAA OpenSearch SAML Authentication Tests', () => {
  test('OpenSearch domain without SAML uses IAM authentication only', () => {
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

    const test_app_subnet = Subnet.fromSubnetAttributes(testApp.testStack, 'subnet-a', {
      subnetId: 'VpcISOLATEDSubnet1Subnet80F07FA1',
      availabilityZone: 'test-az-a',
    });

    const testSubnetSelection = [{ subnets: [test_app_subnet] }];
    const testSecurityGroup = new SecurityGroup(testApp.testStack, 'test-security-group', { vpc: testVpc });

    const logGroup = new MdaaLogGroup(testApp.testStack, 'cloudwatch-log-group', {
      encryptionKey: testKey,
      logGroupNamePathPrefix: '/aws/opensearch-logs/',
      logGroupName: 'osDomain',
      retention: RetentionDays.INFINITE,
      naming: testApp.naming,
    });

    const baseProps: MdaaOpensearchDomainProps = {
      naming: testApp.naming,
      masterUserRoleArn: 'arn:test-partition:iam:test-region:test-account:role/data-admin',
      version: EngineVersion.openSearch('2.3'),
      opensearchDomainName: 'osDomain',
      enableVersionUpgrade: false,
      encryptionKey: testKey,
      vpc: testVpc,
      vpcSubnets: testSubnetSelection,
      securityGroups: [testSecurityGroup],
      capacity: {
        dataNodes: 1,
        dataNodeInstanceType: 'r6g.large.search',
      },
      ebs: {
        enabled: true,
        volumeSize: 100,
        volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
      },
      automatedSnapshotStartHour: 23,
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ArnPrincipal('arn:test-partition:iam:test-region:test-account:role/data-admin')],
          actions: ['es:*'],
          resources: ['*'],
        }),
      ],
      logGroup: logGroup,
    };

    new MdaaOpensearchDomain(testApp.testStack, 'test-domain-no-saml', baseProps);

    const template = Template.fromStack(testApp.testStack);

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

  test('OpenSearch domain with SAML configuration includes SAML options', () => {
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

    const test_app_subnet = Subnet.fromSubnetAttributes(testApp.testStack, 'subnet-a', {
      subnetId: 'VpcISOLATEDSubnet1Subnet80F07FA1',
      availabilityZone: 'test-az-a',
    });

    const testSubnetSelection = [{ subnets: [test_app_subnet] }];
    const testSecurityGroup = new SecurityGroup(testApp.testStack, 'test-security-group', { vpc: testVpc });

    const logGroup = new MdaaLogGroup(testApp.testStack, 'cloudwatch-log-group', {
      encryptionKey: testKey,
      logGroupNamePathPrefix: '/aws/opensearch-logs/',
      logGroupName: 'osDomainSaml',
      retention: RetentionDays.INFINITE,
      naming: testApp.naming,
    });

    const propsWithSaml: MdaaOpensearchDomainProps = {
      naming: testApp.naming,
      masterUserRoleArn: 'arn:test-partition:iam:test-region:test-account:role/data-admin',
      version: EngineVersion.openSearch('2.3'),
      opensearchDomainName: 'osDomainSaml',
      enableVersionUpgrade: false,
      encryptionKey: testKey,
      vpc: testVpc,
      vpcSubnets: testSubnetSelection,
      securityGroups: [testSecurityGroup],
      capacity: {
        dataNodes: 1,
        dataNodeInstanceType: 'r6g.large.search',
      },
      ebs: {
        enabled: true,
        volumeSize: 100,
        volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
      },
      automatedSnapshotStartHour: 23,
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ArnPrincipal('arn:test-partition:iam:test-region:test-account:role/data-admin')],
          actions: ['es:*'],
          resources: ['*'],
        }),
      ],
      logGroup: logGroup,
      samlOptions: {
        idpEntityId: 'https://portal.sso.us-east-1.amazonaws.com/saml/assertion/ABC123',
        idpMetadataContent:
          '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
        masterBackendRole: 'Admin',
        rolesKey: 'Role',
        sessionTimeoutMinutes: 120,
      },
    };

    new MdaaOpensearchDomain(testApp.testStack, 'test-domain-with-saml', propsWithSaml);

    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        MasterUserOptions: {
          MasterUserARN: 'arn:test-partition:iam:test-region:test-account:role/data-admin',
        },
        SAMLOptions: {
          Idp: {
            EntityId: 'https://portal.sso.us-east-1.amazonaws.com/saml/assertion/ABC123',
            MetadataContent:
              '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
          },
          MasterBackendRole: 'Admin',
          RolesKey: 'Role',
          SessionTimeoutMinutes: 120,
        },
      },
    });
  });

  test('OpenSearch domain with SAML uses default values when optional fields omitted', () => {
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

    const test_app_subnet = Subnet.fromSubnetAttributes(testApp.testStack, 'subnet-a', {
      subnetId: 'VpcISOLATEDSubnet1Subnet80F07FA1',
      availabilityZone: 'test-az-a',
    });

    const testSubnetSelection = [{ subnets: [test_app_subnet] }];
    const testSecurityGroup = new SecurityGroup(testApp.testStack, 'test-security-group', { vpc: testVpc });

    const logGroup = new MdaaLogGroup(testApp.testStack, 'cloudwatch-log-group', {
      encryptionKey: testKey,
      logGroupNamePathPrefix: '/aws/opensearch-logs/',
      logGroupName: 'osDomainMinimalSaml',
      retention: RetentionDays.INFINITE,
      naming: testApp.naming,
    });

    const propsWithMinimalSaml: MdaaOpensearchDomainProps = {
      naming: testApp.naming,
      masterUserRoleArn: 'arn:test-partition:iam:test-region:test-account:role/data-admin',
      version: EngineVersion.openSearch('2.3'),
      opensearchDomainName: 'osDomainMinimalSaml',
      enableVersionUpgrade: false,
      encryptionKey: testKey,
      vpc: testVpc,
      vpcSubnets: testSubnetSelection,
      securityGroups: [testSecurityGroup],
      capacity: {
        dataNodes: 1,
        dataNodeInstanceType: 'r6g.large.search',
      },
      ebs: {
        enabled: true,
        volumeSize: 100,
        volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
      },
      automatedSnapshotStartHour: 23,
      accessPolicies: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ArnPrincipal('arn:test-partition:iam:test-region:test-account:role/data-admin')],
          actions: ['es:*'],
          resources: ['*'],
        }),
      ],
      logGroup: logGroup,
      samlOptions: {
        idpEntityId: 'https://idp.example.com',
        idpMetadataContent:
          '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
      },
    };

    new MdaaOpensearchDomain(testApp.testStack, 'test-domain-minimal-saml', propsWithMinimalSaml);

    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        SAMLOptions: {
          Idp: {
            EntityId: 'https://idp.example.com',
            MetadataContent:
              '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
          },
          RolesKey: 'roles',
        },
      },
    });
  });
});
