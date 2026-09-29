/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  DataWarehouseL3Construct,
  DataWarehouseL3ConstructProps,
  FederationProps,
  SecurityGroupIngressProps,
} from '../lib';
import { DatabaseUsersProps, ScheduledActionProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const securityGroupIngresProps: SecurityGroupIngressProps = {
    ipv4: ['127.0.0.1/24'],
    sg: ['sg-be41a7c3'],
  };

  const dataAdminRoleRef: MdaaRoleRef = {
    id: 'testdataAdminRole',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const warehouseBucketUserRoleRef: MdaaRoleRef = {
    id: 'testwarehouseBucketUserRoleRefs',
    arn: 'arn:test-partition:iam::test-account:role/Test',
  };

  const executionRoleTeamA: MdaaRoleRef = {
    id: 'executionRoleTeamA',
    arn: 'arn:test-partition:iam::test-account:role/ex-role-team-a',
  };
  const executionRoleTeamB: MdaaRoleRef = {
    name: 'executionRoleTeamB',
  };

  const federationProps: FederationProps = {
    federationName: 'test-federation',
    providerArn: 'arn:test-partition:iam::test-account:role/test',
  };

  const scheduledAction: ScheduledActionProps = {
    name: 'test-name',
    enable: true,
    targetAction: 'resumeCluster',
    schedule: '2008-12-04 16:10:43',
    startTime: '2008-12-04 16:10:43',
    endTime: '2008-12-04 16:10:43',
  };

  const databaseUsers: DatabaseUsersProps = {
    userName: 'test-userName',
    dbName: 'test-dbName',
    secretAccessRoles: [{ name: 'test-role' }],
    secretRotationDays: 1,
  };

  describe('Core Cluster Tests', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: DataWarehouseL3ConstructProps = {
      adminUsername: 'admin',
      adminPasswordRotationDays: 10,
      dataAdminRoleRefs: [dataAdminRoleRef],
      vpcId: 'vpcId',
      subnetIds: ['test1'],
      securityGroupIngress: securityGroupIngresProps,
      nodeType: 'RA3_LARGE',
      numberOfNodes: 4,
      enableAuditLoggingToS3: true,
      clusterPort: 5440,
      preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',

      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      federations: [federationProps],
      warehouseBucketUserRoleRefs: [warehouseBucketUserRoleRef],
      executionRoleRefs: [executionRoleTeamA, executionRoleTeamB],
      multiNode: true,
      parameterGroupParams: { key1: 'value1' },
      workloadManagement: [{ key1: 'value1' }],
      additionalBucketKmsKeyArns: [
        'arn:test-partition:kms:us-east-1:test-account:key/e4bfacbf-06c4-431e-b3ca-9a4d86eb94b4',
      ],
      scheduledActions: [scheduledAction],
      databaseUsers: [databaseUsers],
      createWarehouseBucket: true,
      automatedSnapshotRetentionDays: 10,
      eventNotifications: {
        email: ['test@example.com'],
        severity: 'INFO',
        eventCategories: ['management', 'security'],
      },
    };
    new DataWarehouseL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    // console.log( JSON.stringify( template, undefined, 2 ) )

    test('Validate resource counts', () => {
      template.resourceCountIs('AWS::Redshift::Cluster', 1);
      template.resourceCountIs('AWS::S3::Bucket', 2);
      template.resourceCountIs('AWS::Redshift::EventSubscription', 2);
    });

    test('S3 logging bucket HAS PublicAccessBlockConfiguration when publicAccessBlockManagedExternally is unset', () => {
      const buckets = template.findResources('AWS::S3::Bucket');
      const loggingBucketKey = Object.keys(buckets).find(key => key.toLowerCase().includes('logging'));
      expect(loggingBucketKey).toBeDefined();
      const loggingBucketProps = buckets[loggingBucketKey!].Properties;
      expect(loggingBucketProps.PublicAccessBlockConfiguration).toBeDefined();
      expect(loggingBucketProps.PublicAccessBlockConfiguration).toEqual({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      });
    });

    test('Redshift cluster properties', () => {
      template.hasResourceProperties('AWS::Redshift::Cluster', {
        ClusterType: 'multi-node',
        DBName: 'default_db',
        MasterUsername: {
          'Fn::Join': [
            '',
            [
              '{{resolve:secretsmanager:',
              {
                Ref: 'clusterSecretE349B730',
              },
              ':SecretString:username::}}',
            ],
          ],
        },
        MasterUserPassword: {
          'Fn::Join': [
            '',
            [
              '{{resolve:secretsmanager:',
              {
                Ref: 'clusterSecretE349B730',
              },
              ':SecretString:password::}}',
            ],
          ],
        },
        NodeType: 'ra3.large',
        AllowVersionUpgrade: true,
        AutomatedSnapshotRetentionPeriod: 10,
        ClusterIdentifier: 'test-org-test-env-test-domain-test-module',
        ClusterParameterGroupName: {
          Ref: 'clusterparamgroup14144A79',
        },
        ClusterSubnetGroupName: {
          Ref: 'subnetgroup',
        },
        Encrypted: true,
        EnhancedVpcRouting: true,
        IamRoles: [
          'arn:test-partition:iam::test-account:role/ex-role-team-a',
          {
            'Fn::GetAtt': ['RoleResExecutionRoleArns1', 'arn'],
          },
        ],
        KmsKeyId: {
          Ref: 'warehousekey618891EF',
        },
        LoggingProperties: {
          BucketName: {
            Ref: 'testorgtestenvtestdomaintestmoduleloggingF7553636',
          },
          S3KeyPrefix: 'logging/',
        },
        NumberOfNodes: 4,
        Port: 5440,
        PreferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
        PubliclyAccessible: false,
        VpcSecurityGroupIds: [
          {
            'Fn::GetAtt': ['warehousesg47CB2460', 'GroupId'],
          },
        ],
      });
    });

    test('SecurityGroup Egress', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        SecurityGroupEgress: Match.arrayWith([
          {
            CidrIp: '0.0.0.0/0',
            Description: 'Allow all outbound traffic by default',
            IpProtocol: '-1',
          },
        ]),
      });
    });

    test('SecurityGroup Ingress CIDR', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        CidrIp: '127.0.0.1/24',
        Description: 'Redshift Ingress for IPV4 CIDR 127.0.0.1/24',
        FromPort: 5440,
        IpProtocol: 'tcp',
        ToPort: 5440,
      });
    });

    test('SecurityGroup Ingress SG', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        Description: 'Redshift Ingress for SG sg-be41a7c3',
        FromPort: 5440,
        IpProtocol: 'tcp',
        SourceSecurityGroupId: 'sg-be41a7c3',
        ToPort: 5440,
      });
    });

    test('SecurityGroup VpcId', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        VpcId: 'vpcId',
      });
    });

    test('Secret manager resource policy', () => {
      template.hasResourceProperties('AWS::SecretsManager::ResourcePolicy', {
        ResourcePolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'secretsmanager:GetSecretValue',
              Effect: 'Allow',
              Principal: {
                AWS: [
                  {
                    'Fn::GetAtt': ['RoleResSecretAccessRole0', 'arn'],
                  },
                  'arn:test-partition:iam::test-account:role/TestAccess',
                ],
              },
              Resource: '*',
              Sid: 'AllowSecretUsageForRoles',
            }),
          ]),
        },
      });
    });

    test('KMS resource policy for roles', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'kms:Decrypt',
              Effect: 'Allow',
              Principal: {
                AWS: [
                  {
                    'Fn::GetAtt': ['RoleResSecretAccessRole0', 'arn'],
                  },
                  'arn:test-partition:iam::test-account:role/TestAccess',
                ],
              },
              Resource: '*',
              Sid: 'AllowKMSUsageForSecretRoles',
            }),
          ]),
        },
      });
    });

    test('warehouse key grants the data admin role key admin actions via aws:userId', () => {
      // createWarehouseKMSKey passes dataAdminRoles as keyAdminRoles, so the admin statement is the
      // control that has to hold, not just the secret-access usage statement above.
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Create*', 'kms:Put*', 'kms:ScheduleKeyDeletion']),
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Condition: {
                StringLike: {
                  'aws:userId': ['testdataAdminRole:*'],
                },
              },
            }),
          ]),
        },
      });
    });

    test('warehouse key grants both the data admin and bucket user roles key usage via aws:userId', () => {
      // keyUserRoles is the combined dataAdmin + warehouseBucketUser set, so both ids have to land
      // in the same key-user condition.
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Condition: {
                StringLike: {
                  'aws:userId': Match.arrayWith(['testdataAdminRole:*', 'testwarehouseBucketUserRoleRefs:*']),
                },
              },
            }),
          ]),
        },
      });
    });

    test('Cluster Event Notifications', () => {
      template.hasResourceProperties('AWS::Redshift::EventSubscription', {
        SubscriptionName: {
          Ref: 'cluster611F8AFF',
        },
        EventCategories: ['management', 'security'],
        Severity: 'INFO',
        SourceIds: [
          {
            Ref: 'cluster611F8AFF',
          },
        ],
        SourceType: 'cluster',
      });
    });
    test('Cluster events SNS topic is KMS encrypted with the warehouse key', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        KmsMasterKeyId: {
          'Fn::GetAtt': [Match.stringLikeRegexp('warehousekey'), 'Arn'],
        },
      });
    });
    test('Warehouse KMS key grants the Redshift events service principal', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowRedshiftEventsToUseKey',
              Effect: 'Allow',
              Principal: { Service: 'redshift.amazonaws.com' },
              Action: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:DescribeKey'],
              Condition: { StringEquals: { 'aws:SourceAccount': 'test-account' } },
            }),
          ]),
        },
      });
    });
    test('Cluster events SNS topic policy scopes publish to the Redshift service principal', () => {
      template.hasResourceProperties('AWS::SNS::TopicPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowRedshiftEventsPublish',
              Effect: 'Allow',
              Principal: { Service: 'redshift.amazonaws.com' },
              Action: 'sns:Publish',
              Condition: { StringEquals: { 'aws:SourceAccount': 'test-account' } },
            }),
          ]),
        },
      });
    });
    test('Scheduled Action Event Notifications', () => {
      template.hasResourceProperties('AWS::Redshift::EventSubscription', {
        SubscriptionName: {
          'Fn::Join': [
            '',
            [
              {
                Ref: 'cluster611F8AFF',
              },
              '-scheduled-actions',
            ],
          ],
        },
        EventCategories: ['management', 'security'],
        Severity: 'INFO',
        SourceIds: ['test-org-test-env-test-domain-test-module-test-name'],
        SourceType: 'scheduled-action',
      });
    });
  });

  describe('Non-CDK NodeType name Cluster Tests', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: DataWarehouseL3ConstructProps = {
      adminUsername: 'admin',
      adminPasswordRotationDays: 10,
      dataAdminRoleRefs: [dataAdminRoleRef],
      vpcId: 'vpcId',
      subnetIds: ['test1'],
      securityGroupIngress: securityGroupIngresProps,
      nodeType: 'ra3.large',
      numberOfNodes: 4,
      enableAuditLoggingToS3: true,
      clusterPort: 5440,
      preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',

      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      federations: [federationProps],
      warehouseBucketUserRoleRefs: [warehouseBucketUserRoleRef],
      executionRoleRefs: [executionRoleTeamA, executionRoleTeamB],
      multiNode: true,
      parameterGroupParams: { key1: 'value1' },
      workloadManagement: [{ key1: 'value1' }],
      additionalBucketKmsKeyArns: [
        'arn:test-partition:kms:us-east-1:test-account:key/e4bfacbf-06c4-431e-b3ca-9a4d86eb94b4',
      ],
      scheduledActions: [scheduledAction],
      databaseUsers: [databaseUsers],
      createWarehouseBucket: true,
      automatedSnapshotRetentionDays: 10,
      eventNotifications: {
        email: ['test@example.com'],
        severity: 'INFO',
        eventCategories: ['management', 'security'],
      },
    };
    new DataWarehouseL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Redshift cluster properties', () => {
      template.hasResourceProperties('AWS::Redshift::Cluster', {
        ClusterType: 'multi-node',
        DBName: 'default_db',
        MasterUsername: {
          'Fn::Join': [
            '',
            [
              '{{resolve:secretsmanager:',
              {
                Ref: 'clusterSecretE349B730',
              },
              ':SecretString:username::}}',
            ],
          ],
        },
        MasterUserPassword: {
          'Fn::Join': [
            '',
            [
              '{{resolve:secretsmanager:',
              {
                Ref: 'clusterSecretE349B730',
              },
              ':SecretString:password::}}',
            ],
          ],
        },
        NodeType: 'ra3.large',
        AllowVersionUpgrade: true,
        AutomatedSnapshotRetentionPeriod: 10,
        ClusterIdentifier: 'test-org-test-env-test-domain-test-module',
        ClusterParameterGroupName: {
          Ref: 'clusterparamgroup14144A79',
        },
        ClusterSubnetGroupName: {
          Ref: 'subnetgroup',
        },
        Encrypted: true,
        EnhancedVpcRouting: true,
        IamRoles: [
          'arn:test-partition:iam::test-account:role/ex-role-team-a',
          {
            'Fn::GetAtt': ['RoleResExecutionRoleArns1', 'arn'],
          },
        ],
        KmsKeyId: {
          Ref: 'warehousekey618891EF',
        },
        LoggingProperties: {
          BucketName: {
            Ref: 'testorgtestenvtestdomaintestmoduleloggingF7553636',
          },
          S3KeyPrefix: 'logging/',
        },
        NumberOfNodes: 4,
        Port: 5440,
        PreferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
        PubliclyAccessible: false,
        VpcSecurityGroupIds: [
          {
            'Fn::GetAtt': ['warehousesg47CB2460', 'GroupId'],
          },
        ],
      });
    });
  });
  describe('Fake NodeType name Cluster Tests', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: DataWarehouseL3ConstructProps = {
      adminUsername: 'admin',
      adminPasswordRotationDays: 10,
      dataAdminRoleRefs: [dataAdminRoleRef],
      vpcId: 'vpcId',
      subnetIds: ['test1'],
      securityGroupIngress: securityGroupIngresProps,
      nodeType: 'fb2.teeny',
      numberOfNodes: 4,
      enableAuditLoggingToS3: true,
      clusterPort: 5440,
      preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',

      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      federations: [federationProps],
      warehouseBucketUserRoleRefs: [warehouseBucketUserRoleRef],
      executionRoleRefs: [executionRoleTeamA, executionRoleTeamB],
      multiNode: true,
      parameterGroupParams: { key1: 'value1' },
      workloadManagement: [{ key1: 'value1' }],
      additionalBucketKmsKeyArns: [
        'arn:test-partition:kms:us-east-1:test-account:key/e4bfacbf-06c4-431e-b3ca-9a4d86eb94b4',
      ],
      scheduledActions: [scheduledAction],
      databaseUsers: [databaseUsers],
      createWarehouseBucket: true,
      automatedSnapshotRetentionDays: 10,
      eventNotifications: {
        email: ['test@example.com'],
        severity: 'INFO',
        eventCategories: ['management', 'security'],
      },
    };

    test('Redshift cluster properties', () => {
      expect(() => new DataWarehouseL3Construct(stack, 'teststack', constructProps)).toThrow(
        'Invalid node type: fb2.teeny',
      );
    });
  });

  describe('Multi-AZ and Cross-Region Snapshot Tests', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: DataWarehouseL3ConstructProps = {
      adminUsername: 'admin',
      adminPasswordRotationDays: 10,
      dataAdminRoleRefs: [dataAdminRoleRef],
      vpcId: 'vpcId',
      subnetIds: ['subnet-1', 'subnet-2', 'subnet-3'],
      securityGroupIngress: securityGroupIngresProps,
      nodeType: 'RA3_LARGE',
      numberOfNodes: 4,
      enableAuditLoggingToS3: true,
      clusterPort: 5440,
      preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      multiNode: true,
      parameterGroupParams: { key1: 'value1' },
      workloadManagement: [{ key1: 'value1' }],
      multiAz: true,
      backupRegion: 'us-west-2',
    };
    new DataWarehouseL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Multi-AZ is enabled on cluster', () => {
      template.hasResourceProperties('AWS::Redshift::Cluster', {
        MultiAZ: true,
      });
    });

    test('Cross-region snapshot copy is configured', () => {
      template.resourceCountIs('Custom::RedshiftSnapshotCopy', 1);
    });
  });

  describe('Backward Compatibility - No New Props', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: DataWarehouseL3ConstructProps = {
      adminUsername: 'admin',
      adminPasswordRotationDays: 10,
      dataAdminRoleRefs: [dataAdminRoleRef],
      vpcId: 'vpcId',
      subnetIds: ['test1'],
      securityGroupIngress: securityGroupIngresProps,
      nodeType: 'RA3_LARGE',
      numberOfNodes: 4,
      enableAuditLoggingToS3: true,
      clusterPort: 5440,
      preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      multiNode: true,
      parameterGroupParams: { key1: 'value1' },
      workloadManagement: [{ key1: 'value1' }],
    };
    new DataWarehouseL3Construct(stack, 'teststack', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Cluster does not have MultiAZ when not specified', () => {
      const clusters = template.findResources('AWS::Redshift::Cluster');
      const clusterKeys = Object.keys(clusters);
      expect(clusterKeys.length).toBe(1);
      const clusterProps = clusters[clusterKeys[0]].Properties;
      expect(clusterProps.MultiAZ).toBeUndefined();
    });

    test('Cluster does not have DestinationRegion when not specified', () => {
      template.resourceCountIs('Custom::RedshiftSnapshotCopy', 0);
    });
  });

  describe('Multi-AZ subnet validation', () => {
    test('throws when multiAz is true and fewer than 3 subnets', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const constructProps: DataWarehouseL3ConstructProps = {
        adminUsername: 'admin',
        adminPasswordRotationDays: 10,
        dataAdminRoleRefs: [dataAdminRoleRef],
        vpcId: 'vpcId',
        subnetIds: ['subnet-1', 'subnet-2'],
        securityGroupIngress: securityGroupIngresProps,
        nodeType: 'RA3_LARGE',
        numberOfNodes: 4,
        enableAuditLoggingToS3: true,
        clusterPort: 5440,
        preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        multiNode: true,
        multiAz: true,
      };
      expect(() => new DataWarehouseL3Construct(stack, 'teststack', constructProps)).toThrow(
        /at least 3 Availability Zones/,
      );
    });

    test('does not throw when multiAz is true and 3 or more subnets', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const constructProps: DataWarehouseL3ConstructProps = {
        adminUsername: 'admin',
        adminPasswordRotationDays: 10,
        dataAdminRoleRefs: [dataAdminRoleRef],
        vpcId: 'vpcId',
        subnetIds: ['subnet-1', 'subnet-2', 'subnet-3'],
        securityGroupIngress: securityGroupIngresProps,
        nodeType: 'RA3_LARGE',
        numberOfNodes: 4,
        enableAuditLoggingToS3: true,
        clusterPort: 5440,
        preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        multiNode: true,
        multiAz: true,
      };
      expect(() => new DataWarehouseL3Construct(stack, 'teststack', constructProps)).not.toThrow();
    });

    test('does not validate subnets when multiAz is false', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const constructProps: DataWarehouseL3ConstructProps = {
        adminUsername: 'admin',
        adminPasswordRotationDays: 10,
        dataAdminRoleRefs: [dataAdminRoleRef],
        vpcId: 'vpcId',
        subnetIds: ['subnet-1'],
        securityGroupIngress: securityGroupIngresProps,
        nodeType: 'RA3_LARGE',
        numberOfNodes: 4,
        enableAuditLoggingToS3: true,
        clusterPort: 5440,
        preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        multiNode: true,
        multiAz: false,
      };
      expect(() => new DataWarehouseL3Construct(stack, 'teststack', constructProps)).not.toThrow();
    });
  });
});

describe('publicAccessBlockManagedExternally Tests', () => {
  const securityGroupIngresProps: SecurityGroupIngressProps = {
    ipv4: ['127.0.0.1/24'],
  };

  const dataAdminRoleRef: MdaaRoleRef = {
    id: 'testdataAdminRole',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  describe('when publicAccessBlockManagedExternally is true with audit logging to S3', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: DataWarehouseL3ConstructProps = {
      adminUsername: 'admin',
      adminPasswordRotationDays: 10,
      dataAdminRoleRefs: [dataAdminRoleRef],
      vpcId: 'vpcId',
      subnetIds: ['test1'],
      securityGroupIngress: securityGroupIngresProps,
      nodeType: 'RA3_LARGE',
      numberOfNodes: 4,
      enableAuditLoggingToS3: true,
      clusterPort: 5440,
      preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      multiNode: true,
      parameterGroupParams: { key1: 'value1' },
      workloadManagement: [{ key1: 'value1' }],
      publicAccessBlockManagedExternally: true,
    };
    new DataWarehouseL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('S3 logging bucket does NOT have PublicAccessBlockConfiguration in synthesized template', () => {
      // When publicAccessBlockManagedExternally is true, the construct omits the explicit
      // blockPublicAccess prop so that CDK does not emit a PutBucketPublicAccessBlock API call
      // that would conflict with externally managed settings (e.g., SCPs).
      const buckets = template.findResources('AWS::S3::Bucket');
      const loggingBucketKey = Object.keys(buckets).find(key => key.toLowerCase().includes('logging'));
      expect(loggingBucketKey).toBeDefined();
      const loggingBucketProps = buckets[loggingBucketKey!].Properties;
      expect(loggingBucketProps.PublicAccessBlockConfiguration).toBeUndefined();
    });

    test('CDK Nag compliance passes with public access block suppressions applied', () => {
      // The checkCdkNagCompliance call above will throw if any unsuppressed nag errors exist.
      // Reaching this point confirms the PUBLIC_ACCESS_BLOCK_NAG_SUPPRESSIONS are correctly applied
      // to the logging bucket when publicAccessBlockManagedExternally is true.
      expect(true).toBe(true);
    });
  });
});

describe('Multiple Federations and Database Users Tests', () => {
  const securityGroupIngresProps: SecurityGroupIngressProps = {
    ipv4: ['127.0.0.1/24'],
  };

  const dataAdminRoleRef: MdaaRoleRef = {
    id: 'testdataAdminRole',
    arn: 'arn:test-partition:iam::test-account:role/TestAccess',
  };

  const federation1: FederationProps = {
    federationName: 'federation-one',
    providerArn: 'arn:test-partition:iam::test-account:saml-provider/provider-one',
  };

  const federation2: FederationProps = {
    federationName: 'federation-two',
    providerArn: 'arn:test-partition:iam::test-account:saml-provider/provider-two',
  };

  const dbUser1: DatabaseUsersProps = {
    userName: 'user-one',
    dbName: 'db-one',
    secretRotationDays: 10,
  };

  const dbUser2: DatabaseUsersProps = {
    userName: 'user-two',
    dbName: 'db-two',
    secretRotationDays: 30,
    secretAccessRoles: [{ name: 'test-role' }],
  };

  const testApp = new MdaaTestApp();

  const constructProps: DataWarehouseL3ConstructProps = {
    adminUsername: 'admin',
    adminPasswordRotationDays: 10,
    dataAdminRoleRefs: [dataAdminRoleRef],
    vpcId: 'vpcId',
    subnetIds: ['test1'],
    securityGroupIngress: securityGroupIngresProps,
    nodeType: 'RA3_LARGE',
    numberOfNodes: 2,
    enableAuditLoggingToS3: false,
    preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    federations: [federation1, federation2],
    databaseUsers: [dbUser1, dbUser2],
    parameterGroupParams: { key1: 'value1' },
    workloadManagement: [{ key1: 'value1' }],
  };

  new DataWarehouseL3Construct(testApp.testStack, 'multistack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple Federation Roles', () => {
    template.resourceCountIs('AWS::IAM::Role', 6);
  });

  test('Multiple Federation Managed Policies', () => {
    template.resourceCountIs('AWS::IAM::ManagedPolicy', 3);
  });

  test('Multiple Database User Secrets', () => {
    template.resourceCountIs('AWS::SecretsManager::Secret', 3);
  });
});

describe('Data Warehouse with cross-account bucket user role', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountWarehouseUser';

  const constructProps: DataWarehouseL3ConstructProps = {
    adminUsername: 'admin',
    adminPasswordRotationDays: 10,
    dataAdminRoleRefs: [{ arn: 'arn:test-partition:iam::test-account:role/TestAccess', id: 'testdataAdminRole' }],
    vpcId: 'vpcId',
    subnetIds: ['test1'],
    securityGroupIngress: { ipv4: ['127.0.0.1/24'] },
    nodeType: 'RA3_LARGE',
    numberOfNodes: 4,
    enableAuditLoggingToS3: false,
    clusterPort: 5440,
    preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    warehouseBucketUserRoleRefs: [{ arn: crossAccountArn }],
    createWarehouseBucket: true,
    parameterGroupParams: { key1: 'value1' },
    workloadManagement: [{ key1: 'value1' }],
  };
  new DataWarehouseL3Construct(stack, 'xacctstack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('cross-account bucket user is granted object access by ARN principal', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: Match.arrayWith(['s3:GetObject*', 's3:PutObject']),
          }),
        ]),
      },
    });
  });

  test('cross-account bucket user is granted bucket-level list access', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BucketAllowCrossAccount',
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: ['s3:List*', 's3:GetBucket*'],
          }),
        ]),
      },
    });
  });

  test('cross-account bucket user is granted key usage by ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountArn },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
          }),
        ]),
      },
    });
  });

  test('only the same-account data admin reaches the aws:userId condition', () => {
    // A cross-account role has no resolvable role id, so it must arrive as an ARN principal and
    // leave the userId condition holding nothing but the same-account admin.
    const keys = Object.values(template.findResources('AWS::KMS::Key'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sameAccountUserIds = keys.flatMap((key: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (key.Properties.KeyPolicy.Statement as any[]).flatMap(stmt => stmt.Condition?.StringLike?.['aws:userId'] ?? []),
    );
    expect([...new Set(sameAccountUserIds)]).toEqual(['testdataAdminRole:*']);
  });

  test('no role resolution custom resource is created for the cross-account role', () => {
    const crs = template.findResources('AWS::CloudFormation::CustomResource');
    expect(Object.keys(crs).filter(k => k.includes('BucketUsers'))).toHaveLength(0);
  });
});

describe('Data Warehouse with a cross-account data admin role', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const crossAccountAdminArn = 'arn:test-partition:iam::999999999999:role/CrossAccountWarehouseAdmin';

  const constructProps: DataWarehouseL3ConstructProps = {
    adminUsername: 'admin',
    adminPasswordRotationDays: 10,
    dataAdminRoleRefs: [{ arn: crossAccountAdminArn }],
    vpcId: 'vpcId',
    subnetIds: ['test1'],
    securityGroupIngress: { ipv4: ['127.0.0.1/24'] },
    nodeType: 'RA3_LARGE',
    numberOfNodes: 4,
    enableAuditLoggingToS3: false,
    clusterPort: 5440,
    preferredMaintenanceWindow: 'ddd:hh24:mi-ddd:hh24:mi',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    createWarehouseBucket: true,
    parameterGroupParams: { key1: 'value1' },
    workloadManagement: [{ key1: 'value1' }],
  };
  new DataWarehouseL3Construct(stack, 'xacctadminstack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('cross-account data admin is granted the delegable key admin actions by ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountAdminArn },
            Action: Match.arrayWith(['kms:CreateGrant', 'kms:DescribeKey']),
            Sid: Match.stringLikeRegexp('xacct-admin-stmt'),
          }),
        ]),
      },
    });
  });

  test('cross-account data admin is also granted key usage by ARN principal', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: crossAccountAdminArn },
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
            Sid: Match.stringLikeRegexp('xacct-usage-stmt'),
          }),
        ]),
      },
    });
  });

  test('the bucket default deny still applies when every excluded role is cross-account', () => {
    // Every configured role here is cross-account, so the userId list is empty. Emitting it anyway
    // under ForAnyValue would make the whole condition unsatisfiable, and the deny would stop
    // blocking same-account principals whose own IAM policy allows S3.
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'BucketDeny',
            Effect: 'Deny',
            Condition: { StringNotLike: { 'aws:PrincipalArn': [crossAccountAdminArn] } },
          }),
        ]),
      },
    });
  });
});
