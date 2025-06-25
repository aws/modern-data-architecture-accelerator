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
import { CustomEndpointConfig } from '../lib/opensearch-l3-construct';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const dataAdminRoleRef: MdaaRoleRef = {
    arn: 'arn:test-partition:iam::test-account:role/data-admin',
  };

  const customEndpoint: CustomEndpointConfig = {
    domainName: 'abc.xyz.com',
    acmCertificateArn: 'arn:test-partition:acm:test-region:test-account:certificate/zbc123pqr456',
    route53HostedZoneEnabled: false,
  };

  const constructProps: OpensearchL3ConstructProps = {
    domain: {
      dataAdminRole: dataAdminRoleRef,
      opensearchDomainName: 'testOsDomain',
      customEndpoint: customEndpoint,
      vpcId: 'vpcId',
      subnets: [
        { subnetId: 'subnet-abc123', availabilityZone: 'test-regiona' },
        { subnetId: 'subnet-xyz456', availabilityZone: 'test-regionb' },
      ],
      securityGroupIngress: { sg: ['sg-903004f8'] },
      zoneAwareness: { enabled: true, availabilityZoneCount: 2 },
      capacity: {
        masterNodes: 3,
        masterNodeInstanceType: 'c5.large.search',
        dataNodes: 6,
        dataNodeInstanceType: 'c5.large.search',
        warmNodes: 2,
        warmInstanceType: 'ultrawarm1.medium.search',
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
      eventNotifications: {
        email: ['example@example.com'],
      },
    },
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
  };

  new OpensearchL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log(JSON.stringify(template, undefined, 2));

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::OpenSearchService::Domain', 1);
    template.resourceCountIs('AWS::KMS::Key', 1);
    template.resourceCountIs('AWS::KMS::Alias', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
  });

  test('Opensearch Domain properties', () => {
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        MasterUserOptions: {
          MasterUserARN: 'arn:test-partition:iam::test-account:role/data-admin',
        },
      },
      ClusterConfig: {
        DedicatedMasterCount: 3,
        DedicatedMasterEnabled: true,
        DedicatedMasterType: 'c5.large.search',
        InstanceCount: 6,
        InstanceType: 'c5.large.search',
        WarmCount: 2,
        WarmEnabled: true,
        WarmType: 'ultrawarm1.medium.search',
        ZoneAwarenessConfig: {
          AvailabilityZoneCount: 2,
        },
        ZoneAwarenessEnabled: true,
      },
      DomainEndpointOptions: {
        CustomEndpoint: 'abc.xyz.com',
        CustomEndpointCertificateArn: 'arn:test-partition:acm:test-region:test-account:certificate/zbc123pqr456',
        CustomEndpointEnabled: true,
        EnforceHTTPS: true,
        TLSSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07',
      },
      DomainName: 'test-org-test-env-t-4f1c9adc',
      EBSOptions: {
        EBSEnabled: true,
        VolumeSize: 20,
        VolumeType: 'gp2',
      },
      EncryptionAtRestOptions: {
        Enabled: true,
        KmsKeyId: {
          Ref: 'opensearchdomainkey4FC01EF0',
        },
      },
      EngineVersion: 'OpenSearch_2.3',
      LogPublishingOptions: {
        ES_APPLICATION_LOGS: {
          CloudWatchLogsLogGroupArn: {
            'Fn::GetAtt': ['cloudwatchloggrouptestOsDomain97B55585', 'Arn'],
          },
          Enabled: true,
        },
        SEARCH_SLOW_LOGS: {
          CloudWatchLogsLogGroupArn: {
            'Fn::GetAtt': ['cloudwatchloggrouptestOsDomain97B55585', 'Arn'],
          },
          Enabled: true,
        },
        INDEX_SLOW_LOGS: {
          CloudWatchLogsLogGroupArn: {
            'Fn::GetAtt': ['cloudwatchloggrouptestOsDomain97B55585', 'Arn'],
          },
          Enabled: true,
        },
        AUDIT_LOGS: {
          CloudWatchLogsLogGroupArn: {
            'Fn::GetAtt': ['cloudwatchloggrouptestOsDomain97B55585', 'Arn'],
          },
          Enabled: true,
        },
      },
      NodeToNodeEncryptionOptions: {
        Enabled: true,
      },
      SnapshotOptions: {
        AutomatedSnapshotStartHour: 23,
      },
      VPCOptions: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': ['teststackdomainsgA4918EF5', 'GroupId'],
          },
        ],
        SubnetIds: ['subnet-abc123', 'subnet-xyz456'],
      },
    });
  });

  test('KMS Key Testing', () => {
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
                'aws:userId': [
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['RoleResDataAdmin', 'id'],
                        },
                        ':*',
                      ],
                    ],
                  },
                ],
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
            Action: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
            Condition: {
              ArnLike: {
                'kms:EncryptionContext:aws:logs:arn': 'arn:test-partition:logs:test-region:test-account:*',
              },
            },
            Effect: 'Allow',
            Principal: {
              Service: 'logs.test-region.amazonaws.com',
            },
            Resource: '*',
            Sid: 'AllowOpensearchLogGroupEncryption',
          },
          {
            Action: ['kms:Decrypt', 'kms:GenerateDataKey*'],
            Effect: 'Allow',
            Principal: {
              Service: 'events.amazonaws.com',
            },
            Resource: '*',
          },
        ],
        Version: '2012-10-17',
      },
      Enabled: true,
      EnableKeyRotation: true,
    });
  });

  test('KMS Alias Test', () => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/test-org-test-env-test-domain-test-module-opensearch-domain',
      TargetKeyId: {
        'Fn::GetAtt': ['opensearchdomainkey4FC01EF0', 'Arn'],
      },
    });
  });

  test('Domain Access Policy Test', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'es:UpdateDomainConfig',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': ['opensearchdomaintestOsDomain611CDDB8', 'Arn'],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'opensearchdomaintestOsDomainAccessPolicyCustomResourcePolicyFA4AB770',
      Roles: [
        {
          Ref: 'AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2',
        },
      ],
    });
  });

  test('Log Group Test', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: {
        'Fn::GetAtt': ['opensearchdomainkey4FC01EF0', 'Arn'],
      },
      LogGroupName: '/aws/opensearch-logs/test-org-test-env-test-domain-test-module-testosdomain',
    });
  });

  describe('Notifications Tests', () => {
    test('Event Rule', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: 'Matches OpenSearch events for domain testOsDomain',
        EventPattern: {
          source: ['aws.es'],
          resources: [
            {
              'Fn::GetAtt': ['opensearchdomaintestOsDomain611CDDB8', 'Arn'],
            },
          ],
        },
        Name: 'test-org-test-env-test-domain-test-module-testosdomain-1a19ef4',
        State: 'ENABLED',
        Targets: [
          {
            Arn: {
              Ref: 'domaineventstopic44704217',
            },
            DeadLetterConfig: {
              Arn: {
                'Fn::GetAtt': ['dlqtestOsDomainopensearcheventsCEF870A2', 'Arn'],
              },
            },
            Id: 'Target0',
          },
        ],
      });
    });
    test('Topic', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        KmsMasterKeyId: {
          'Fn::GetAtt': ['opensearchdomainkey4FC01EF0', 'Arn'],
        },
        TopicName: 'test-org-test-env-test-domain-test-module-testosdomain-opensearch-events',
      });
    });
    test('Topic Policy', () => {
      template.hasResourceProperties('AWS::SNS::TopicPolicy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'sns:Publish',
                'sns:RemovePermission',
                'sns:SetTopicAttributes',
                'sns:DeleteTopic',
                'sns:ListSubscriptionsByTopic',
                'sns:GetTopicAttributes',
                'sns:Receive',
                'sns:AddPermission',
                'sns:Subscribe',
              ],
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
              Effect: 'Deny',
              Principal: {
                AWS: '*',
              },
              Resource: '*',
              Sid: 'EnforceSSL',
            },
            {
              Action: 'sns:Publish',
              Effect: 'Allow',
              Principal: {
                Service: 'events.amazonaws.com',
              },
              Resource: {
                Ref: 'domaineventstopic44704217',
              },
              Sid: '1',
            },
          ],
          Version: '2012-10-17',
        },
        Topics: [
          {
            Ref: 'domaineventstopic44704217',
          },
        ],
      });
    });
    test('Topic Subscriptions', () => {
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        TopicArn: {
          Ref: 'domaineventstopic44704217',
        },
        Endpoint: 'example@example.com',
      });
    });
  });
});
