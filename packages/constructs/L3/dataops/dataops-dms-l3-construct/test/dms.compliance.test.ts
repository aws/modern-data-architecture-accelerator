/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import {
  DMSL3Construct,
  DMSL3ConstructProps,
  EndpointProps,
  ReplicationInstanceProps,
  ReplicationTaskProps,
} from '../lib';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

describe('MDAA Compliance Stack Tests', () => {
  // tests what happens if there is just the vpc-role flag
  describe('Happy path with only vpcRole', () => {
    const testApp = new MdaaTestApp();
    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project-yes-vpc-role',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        createDmsVpcRole: true,
      },
    };
    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);
    test('There is the dms-vpc-role', () => {
      template.resourcePropertiesCountIs(
        'AWS::IAM::Role',
        {
          RoleName: `dms-vpc-role`,
        },
        1,
      );
    });
    test('There is no dms endpoint', () => {
      template.resourceCountIs('AWS::DMS::Endpoint', 0);
    });
    test('VPC role has correct managed policy', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'dms-vpc-role',
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/service-role/AmazonDMSVPCManagementRole'],
            ],
          },
        ],
      });
    });
  });

  describe('DMS Log Role creation', () => {
    const testApp = new MdaaTestApp();
    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project-log-role',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        createDmsLogRole: true,
      },
    };
    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Creates DMS CloudWatch logs role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'dms-cloudwatch-logs-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'dms.amazonaws.com',
              },
            },
          ],
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/service-role/AmazonDMSCloudWatchLogsRole'],
            ],
          },
        ],
      });
    });
  });

  describe('Error handling', () => {
    test('should throw error for invalid replication instance reference', () => {
      const testApp = new MdaaTestApp();
      const taskProps: ReplicationTaskProps = {
        replicationInstance: 'nonExistentInstance',
        sourceEndpoint: 'testSource',
        targetEndpoint: 'testTarget',
        migrationType: 'full-load',
        tableMappings: {},
      };

      const constructProps: DMSL3ConstructProps = {
        projectName: 'test-project',
        projectBucket: 'test-project-bucket',
        kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
        dms: {
          replicationTasks: {
            testTask: taskProps,
          },
        },
      };

      expect(() => {
        new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
      }).toThrow('Unable to determine replication instance Arn from config nonExistentInstance.');
    });

    test('should throw error for invalid source endpoint reference', () => {
      const testApp = new MdaaTestApp();
      const replicationInstanceProps: ReplicationInstanceProps = {
        instanceClass: 'test-class',
        subnetIds: ['test-subnet-id-1'],
        vpcId: 'test-vpc-id',
      };

      const taskProps: ReplicationTaskProps = {
        replicationInstance: 'testInstance',
        sourceEndpoint: 'nonExistentSource',
        targetEndpoint: 'testTarget',
        migrationType: 'full-load',
        tableMappings: {},
      };

      const constructProps: DMSL3ConstructProps = {
        projectName: 'test-project',
        projectBucket: 'test-project-bucket',
        kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
        dms: {
          replicationInstances: {
            testInstance: replicationInstanceProps,
          },
          replicationTasks: {
            testTask: taskProps,
          },
        },
      };

      expect(() => {
        new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
      }).toThrow('Unable to determine source endpoint Arn from config nonExistentSource.');
    });

    test('should throw error for missing engine settings', () => {
      const testApp = new MdaaTestApp();
      const endpointProps: EndpointProps = {
        endpointType: 'source',
        engineName: 'mysql',
      };

      const constructProps: DMSL3ConstructProps = {
        projectName: 'test-project',
        projectBucket: 'test-project-bucket',
        kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
        naming: testApp.naming,
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
        dms: {
          endpoints: {
            testEndpoint: endpointProps,
          },
        },
      };

      expect(() => {
        new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
      }).toThrow('mySqlSettings must be defined for engineName mysql');
    });
  });

  describe('Happy path without vpcRole', () => {
    const testApp = new MdaaTestApp();

    const replicationInstanceProps: ReplicationInstanceProps = {
      instanceClass: 'test-class',
      subnetIds: ['test-subnet-id-1'],
      vpcId: 'test-vpc-id',
    };

    const sourceEndpointProps: EndpointProps = {
      endpointType: 'source',
      engineName: 'mysql',
      mySqlSettings: {
        secretsManagerSecretArn: 'arn:test-partition:secretsmanager:test-region:test-account:secret:test-secret',
        secretsManagerSecretKMSArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      },
    };

    const oracleEndpointProps: EndpointProps = {
      endpointType: 'source',
      engineName: 'oracle',
      oracleSettings: {
        secretsManagerSecretArn: 'arn:test-partition:secretsmanager:test-region:test-account:secret:test-secret',
        secretsManagerOracleAsmSecretArn:
          'arn:test-partition:secretsmanager:test-region:test-account:secret:test-secret',
      },
    };

    const targetEndpointProps: EndpointProps = {
      endpointType: 'target',
      engineName: 's3',
      s3Settings: {
        bucketName: 'test-bucket',
        serverSideEncryptionKmsKeyId: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      },
    };

    const taskProps: ReplicationTaskProps = {
      replicationInstance: 'testInstance',
      sourceEndpoint: 'testSourceEndpoint',
      targetEndpoint: 'testTargetEndpoint',
      migrationType: 'full-load',
      tableMappings: {},
    };

    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        replicationInstances: {
          testInstance: replicationInstanceProps,
        },
        endpoints: {
          testSourceEndpoint: sourceEndpointProps,
          testOracleSourceEndpoint: oracleEndpointProps,
          testTargetEndpoint: targetEndpointProps,
        },
        replicationTasks: {
          testTask: taskProps,
        },
      },
    };

    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Secret Access Policy', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-secrets-access',
        PolicyDocument: {
          Statement: [
            {
              Action: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
              Effect: 'Allow',
              Resource: 'arn:test-partition:secretsmanager:test-region:test-account:secret:test-secret',
            },
            {
              Action: ['kms:Decrypt', 'kms:DescribeKey'],
              Effect: 'Allow',
              Resource: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
            },
          ],
          Version: '2012-10-17',
        },
      });
    });

    describe('Endpoints', () => {
      test('No vpc role created', () => {
        template.resourcePropertiesCountIs(
          'AWS::IAM::Role',
          {
            RoleName: `dms-vpc-role`,
          },
          0,
        );
      });
      test('S3 Service Access Role', () => {
        template.hasResourceProperties('AWS::DMS::Endpoint', {
          S3Settings: {
            ServiceAccessRoleArn: {
              'Fn::GetAtt': ['teststackdmsroleC2B1F384', 'Arn'],
            },
          },
        });
      });

      test('Secret Access Role', () => {
        template.hasResourceProperties('AWS::DMS::Endpoint', {
          MySqlSettings: {
            SecretsManagerAccessRoleArn: {
              'Fn::GetAtt': ['teststackdmsroleC2B1F384', 'Arn'],
            },
          },
        });
      });
    });

    describe('Replication Tasks', () => {
      test('Name', () => {
        template.hasResourceProperties('AWS::DMS::ReplicationTask', {
          ReplicationTaskIdentifier: 'test-org-test-env-test-domain-test-module-testtask',
        });
      });
      test('Migration type', () => {
        template.hasResourceProperties('AWS::DMS::ReplicationTask', {
          MigrationType: 'full-load',
        });
      });
      test('Table mappings', () => {
        template.hasResourceProperties('AWS::DMS::ReplicationTask', {
          TableMappings: '{}',
        });
      });
    });

    describe('Replication Instances', () => {
      test('Creates replication subnet group', () => {
        template.hasResourceProperties('AWS::DMS::ReplicationSubnetGroup', {
          ReplicationSubnetGroupIdentifier: 'test-org-test-env-test-domain-test-module-testinstance',
          SubnetIds: ['test-subnet-id-1'],
        });
      });

      test('Creates security group', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
          GroupDescription: 'testing/test-stack/security-group-testInstance',
          VpcId: 'test-vpc-id',
        });
      });

      test('Creates replication instance', () => {
        template.hasResourceProperties('AWS::DMS::ReplicationInstance', {
          ReplicationInstanceIdentifier: 'test-org-test-env-test-domain-test-module-testinstance',
          ReplicationInstanceClass: 'test-class',
        });
      });
    });
  });

  describe('Multiple engine types', () => {
    const testApp = new MdaaTestApp();
    const endpoints: { [key: string]: EndpointProps } = {
      postgresEndpoint: {
        endpointType: 'source',
        engineName: 'postgres',
        postgreSqlSettings: {
          secretsManagerSecretArn: 'arn:test-partition:secretsmanager:test-region:test-account:secret:postgres-secret',
        },
      },
      dynamodbEndpoint: {
        endpointType: 'target',
        engineName: 'dynamodb',
        dynamoDbSettings: {},
      },
      kinesisEndpoint: {
        endpointType: 'target',
        engineName: 'kinesis',
        kinesisSettings: {
          streamArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/test-stream',
        },
      },
      mongodbEndpoint: {
        endpointType: 'source',
        engineName: 'mongodb',
        mongoDbSettings: {
          secretsManagerSecretArn: 'arn:test-partition:secretsmanager:test-region:test-account:secret:mongodb-secret',
        },
      },
    };

    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project-multi-engine',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        endpoints,
      },
    };

    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Creates all endpoint types', () => {
      template.resourceCountIs('AWS::DMS::Endpoint', 4);
    });

    test('AWS service endpoints get service access role', () => {
      template.hasResourceProperties('AWS::DMS::Endpoint', {
        EngineName: 'dynamodb',
        DynamoDbSettings: {
          ServiceAccessRoleArn: {
            'Fn::GetAtt': ['teststackdmsroleC2B1F384', 'Arn'],
          },
        },
      });
    });

    test('PostgreSQL endpoint with secrets manager', () => {
      template.hasResourceProperties('AWS::DMS::Endpoint', {
        EngineName: 'postgres',
        PostgreSqlSettings: {
          SecretsManagerAccessRoleArn: {
            'Fn::GetAtt': ['teststackdmsroleC2B1F384', 'Arn'],
          },
          SecretsManagerSecretId: 'arn:test-partition:secretsmanager:test-region:test-account:secret:postgres-secret',
        },
      });
    });
  });

  describe('Custom DMS role', () => {
    const testApp = new MdaaTestApp();
    const endpointProps: EndpointProps = {
      endpointType: 'target',
      engineName: 's3',
      s3Settings: {
        serverSideEncryptionKmsKeyId: 'test-key',
        bucketName: 'test-bucket',
      },
    };

    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project-custom-role',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        dmsRoleArn: 'arn:aws:iam::123456789012:role/custom-dms-role',
        endpoints: {
          testEndpoint: endpointProps,
        },
      },
    };

    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Uses provided DMS role ARN', () => {
      template.hasResourceProperties('AWS::DMS::Endpoint', {
        S3Settings: {
          ServiceAccessRoleArn: 'arn:aws:iam::123456789012:role/custom-dms-role',
        },
      });
    });
  });

  describe('Security group configurations', () => {
    const testApp = new MdaaTestApp();
    const replicationInstanceProps: ReplicationInstanceProps = {
      instanceClass: 'test-class',
      subnetIds: ['test-subnet-id-1', 'test-subnet-id-2'],
      vpcId: 'test-vpc-id',
      ingressRules: {
        ipv4: [
          {
            protocol: 'tcp',
            port: 3306,
            toPort: 3306,
            cidr: '10.0.0.0/8',
            description: 'MySQL access',
          },
        ],
      },
      egressRules: {
        ipv4: [
          {
            protocol: 'tcp',
            port: 443,
            toPort: 443,
            cidr: '0.0.0.0/0',
            description: 'HTTPS outbound',
          },
        ],
      },
      addSelfReferenceRule: true,
    };

    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project-sg',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        replicationInstances: {
          testInstance: replicationInstanceProps,
        },
      },
    };

    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Creates security group with custom rules', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'testing/test-stack/security-group-testInstance',
        GroupName: 'test-org-test-env-test-domain-test-module-testinstance',
        VpcId: 'test-vpc-id',
      });
    });
  });

  describe('Replication task with all options', () => {
    const testApp = new MdaaTestApp();
    const replicationInstanceProps: ReplicationInstanceProps = {
      instanceClass: 'test-class',
      subnetIds: ['test-subnet-id-1'],
      vpcId: 'test-vpc-id',
    };

    const sourceEndpointProps: EndpointProps = {
      endpointType: 'source',
      engineName: 'mysql',
      mySqlSettings: {
        secretsManagerSecretArn: 'arn:test-partition:secretsmanager:test-region:test-account:secret:mysql-secret',
      },
    };

    const targetEndpointProps: EndpointProps = {
      endpointType: 'target',
      engineName: 's3',
      s3Settings: {
        bucketName: 'test-bucket',
        serverSideEncryptionKmsKeyId: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      },
    };

    const taskProps: ReplicationTaskProps = {
      replicationInstance: 'testInstance',
      sourceEndpoint: 'testSource',
      targetEndpoint: 'testTarget',
      migrationType: 'full-load-and-cdc',
      tableMappings: { rules: [{ 'rule-type': 'selection' }] },
      cdcStartPosition: 'checkpoint:V1#27#mysql-bin-changelog.157832:1975',
      cdcStartTime: 1234567890,
      cdcStopPosition: 'server_time:2018-02-09T12:12:12',
      taskData: { targetMetadata: { supportLobs: true } },
      replicationTaskSettings: { TargetMetadata: { SupportLobs: true } },
    };

    const constructProps: DMSL3ConstructProps = {
      projectName: 'test-project-full-task',
      projectBucket: 'test-project-bucket',
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      dms: {
        createDmsLogRole: true,
        replicationInstances: {
          testInstance: replicationInstanceProps,
        },
        endpoints: {
          testSource: sourceEndpointProps,
          testTarget: targetEndpointProps,
        },
        replicationTasks: {
          testTask: taskProps,
        },
      },
    };

    new DMSL3Construct(testApp.testStack, 'test-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);

    test('Creates replication task with all parameters', () => {
      template.hasResourceProperties('AWS::DMS::ReplicationTask', {
        ReplicationTaskIdentifier: 'test-org-test-env-test-domain-test-module-testtask',
        MigrationType: 'full-load-and-cdc',
        CdcStartPosition: 'checkpoint:V1#27#mysql-bin-changelog.157832:1975',
        CdcStartTime: 1234567890,
        CdcStopPosition: 'server_time:2018-02-09T12:12:12',
        TaskData: '{"targetMetadata":{"supportLobs":true}}',
        TableMappings: '{"rules":[{"rule-type":"selection"}]}',
        ReplicationTaskSettings: '{"TargetMetadata":{"SupportLobs":true}}',
      });
    });
  });
});
