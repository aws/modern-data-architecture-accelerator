/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import {
  DMSL3ConstructProps,
  DMSL3Construct,
  ReplicationInstanceProps,
  EndpointProps,
  ReplicationTaskProps,
} from '../lib';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';

describe('MDAA Compliance Stack Tests', () => {
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
      secretsManagerOracleAsmSecretArn: 'arn:test-partition:secretsmanager:test-region:test-account:secret:test-secret',
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
  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

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
  });
});
