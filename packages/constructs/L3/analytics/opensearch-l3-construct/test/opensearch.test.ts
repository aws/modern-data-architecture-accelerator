/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { AccountPrincipal, Effect } from 'aws-cdk-lib/aws-iam';
import { OpensearchL3Construct, OpensearchL3ConstructProps } from '../lib';

describe('MDAA OpenSearch L3 SAML Authentication Tests', () => {
  test('OpenSearch L3 construct without SAML uses IAM authentication', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const dataAdminRoleRef: MdaaRoleRef = {
      arn: 'arn:test-partition:iam::test-account:role/data-admin',
    };

    const baseConstructProps: OpensearchL3ConstructProps = {
      domain: {
        dataAdminRole: dataAdminRoleRef,
        opensearchDomainName: 'testOsDomain',
        vpcId: 'vpcId',
        subnets: [{ subnetId: 'subnet-abc123', availabilityZone: 'test-regiona' }],
        securityGroupIngress: { sg: ['sg-903004f8'] },
        capacity: {
          dataNodes: 1,
          dataNodeInstanceType: 'r6g.large.search',
        },
        ebs: { enabled: true, volumeSize: 20, volumeType: EbsDeviceVolumeType.GP2 },
        automatedSnapshotStartHour: 23,
        opensearchEngineVersion: '2.3',
        enableVersionUpgrade: true,
        accessPolicies: [
          {
            sid: 'testing',
            effect: Effect.ALLOW,
            principals: [new AccountPrincipal('123456789012')],
            resources: ['arn:test-partition:es:us-west-1:test-account:domain/test-domain/*'],
            actions: ['es:ESHttpGet', 'es:ESHttpPut'],
          },
        ],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new OpensearchL3Construct(stack, 'teststack-no-saml', baseConstructProps);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        MasterUserOptions: {
          MasterUserARN: 'arn:test-partition:iam::test-account:role/data-admin',
        },
      },
    });
  });

  test('OpenSearch L3 construct with SAML configuration includes SAML options', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const dataAdminRoleRef: MdaaRoleRef = {
      arn: 'arn:test-partition:iam::test-account:role/data-admin',
    };

    const propsWithSaml: OpensearchL3ConstructProps = {
      domain: {
        dataAdminRole: dataAdminRoleRef,
        opensearchDomainName: 'testOsDomainSaml',
        vpcId: 'vpcId',
        subnets: [{ subnetId: 'subnet-abc123', availabilityZone: 'test-regiona' }],
        securityGroupIngress: { sg: ['sg-903004f8'] },
        capacity: {
          dataNodes: 1,
          dataNodeInstanceType: 'r6g.large.search',
        },
        ebs: { enabled: true, volumeSize: 20, volumeType: EbsDeviceVolumeType.GP2 },
        automatedSnapshotStartHour: 23,
        opensearchEngineVersion: '2.3',
        enableVersionUpgrade: true,
        accessPolicies: [
          {
            sid: 'testing',
            effect: Effect.ALLOW,
            principals: [new AccountPrincipal('123456789012')],
            resources: ['arn:test-partition:es:us-west-1:test-account:domain/test-domain/*'],
            actions: ['es:ESHttpGet', 'es:ESHttpPut'],
          },
        ],
        samlAuthentication: {
          idpEntityId: 'https://portal.sso.us-east-1.amazonaws.com/saml/assertion/ABC123',
          idpMetadataXml:
            '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new OpensearchL3Construct(stack, 'teststack-with-saml', propsWithSaml);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        MasterUserOptions: {
          MasterUserARN: 'arn:test-partition:iam::test-account:role/data-admin',
        },
        SAMLOptions: {
          Enabled: true,
          Idp: {
            EntityId: 'https://portal.sso.us-east-1.amazonaws.com/saml/assertion/ABC123',
            MetadataContent:
              '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
          },
        },
      },
    });
  });

  test('OpenSearch L3 construct with minimal SAML uses default values', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const dataAdminRoleRef: MdaaRoleRef = {
      arn: 'arn:test-partition:iam::test-account:role/data-admin',
    };

    const propsWithMinimalSaml: OpensearchL3ConstructProps = {
      domain: {
        dataAdminRole: dataAdminRoleRef,
        opensearchDomainName: 'testOsDomainMinimalSaml',
        vpcId: 'vpcId',
        subnets: [{ subnetId: 'subnet-abc123', availabilityZone: 'test-regiona' }],
        securityGroupIngress: { sg: ['sg-903004f8'] },
        capacity: {
          dataNodes: 1,
          dataNodeInstanceType: 'r6g.large.search',
        },
        ebs: { enabled: true, volumeSize: 20, volumeType: EbsDeviceVolumeType.GP2 },
        automatedSnapshotStartHour: 23,
        opensearchEngineVersion: '2.3',
        enableVersionUpgrade: true,
        accessPolicies: [
          {
            sid: 'testing',
            effect: Effect.ALLOW,
            principals: [new AccountPrincipal('123456789012')],
            resources: ['arn:test-partition:es:us-west-1:test-account:domain/test-domain/*'],
            actions: ['es:ESHttpGet', 'es:ESHttpPut'],
          },
        ],
        samlAuthentication: {
          idpEntityId: 'https://idp.example.com',
          idpMetadataXml:
            '<?xml version="1.0"?><EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test-idp"><IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"></IDPSSODescriptor></EntityDescriptor>',
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new OpensearchL3Construct(stack, 'teststack-minimal-saml', propsWithMinimalSaml);

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        SAMLOptions: {
          Enabled: true,
          Idp: {
            EntityId: 'https://idp.example.com',
          },
        },
      },
    });
  });
});
