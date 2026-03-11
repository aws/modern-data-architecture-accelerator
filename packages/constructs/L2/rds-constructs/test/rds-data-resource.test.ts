/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AuroraPostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRdsServerlessCluster, MdaaRdsDataResource } from '../lib';

describe('MdaaRdsDataResource Tests', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('creates RDS Data Resource with minimal required permissions', () => {
    const vpc = new Vpc(testApp.testStack, 'TestVpc', {
      maxAzs: 2,
    });

    const kmsKey = new MdaaKmsKey(testApp.testStack, 'TestKey', {
      naming: testApp.naming,
      alias: 'test-key',
    });

    const monitoringRole = new MdaaRole(testApp.testStack, 'MonitoringRole', {
      naming: testApp.naming,
      roleName: 'monitoring',
      assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
      createParams: false,
      createOutputs: false,
    });

    const cluster = new MdaaRdsServerlessCluster(testApp.testStack, 'TestCluster', {
      naming: testApp.naming,
      engine: 'aurora-postgresql',
      engineVersion: AuroraPostgresEngineVersion.VER_16_6,
      clusterIdentifier: 'test-cluster',
      masterUsername: 'testadmin',
      encryptionKey: kmsKey,
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      monitoringRole: monitoringRole,
      port: 5433,
    });

    const rdsData = new MdaaRdsDataResource(testApp.testStack, 'TestRdsData', {
      naming: testApp.naming,
      rdsCluster: cluster,
      databaseName: 'testdb',
      onCreateSqlStatements: ['CREATE TABLE test (id SERIAL PRIMARY KEY)'],
      onDeleteSqlStatements: ['DROP TABLE IF EXISTS test'],
    });

    const template = Template.fromStack(testApp.testStack);

    // Verify the custom resource handler function exists
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: testApp.naming.resourceName('RDS-Data-handler', 64),
      Runtime: 'python3.13',
      Handler: 'index.lambda_handler',
    });

    // Verify the handler role has EXACTLY the minimal required permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyName: 'RDS-Data-handler',
      PolicyDocument: {
        Statement: Match.arrayWith([
          // 1. RDS Data API permission
          Match.objectLike({
            Action: 'rds-data:ExecuteStatement',
            Effect: 'Allow',
          }),
          // 2. Secrets Manager permission
          Match.objectLike({
            Action: 'secretsmanager:GetSecretValue',
            Effect: 'Allow',
          }),
          // 3. KMS Decrypt permission
          Match.objectLike({
            Action: 'kms:Decrypt',
            Effect: 'Allow',
          }),
        ]),
      },
    });

    // Verify the custom resource exists
    template.hasResourceProperties('Custom::RDS-Data', {
      on_create_sql_statements: ['CREATE TABLE test (id SERIAL PRIMARY KEY)'],
      on_delete_sql_statements: ['DROP TABLE IF EXISTS test'],
      database_name: 'testdb',
    });

    expect(rdsData.handlerFunction).toBeDefined();
  });

  test('creates RDS Data Resource without database name', () => {
    const vpc = new Vpc(testApp.testStack, 'TestVpc', {
      maxAzs: 2,
    });

    const kmsKey = new MdaaKmsKey(testApp.testStack, 'TestKey', {
      naming: testApp.naming,
      alias: 'test-key',
    });

    const monitoringRole = new MdaaRole(testApp.testStack, 'MonitoringRole', {
      naming: testApp.naming,
      roleName: 'monitoring',
      assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
      createParams: false,
      createOutputs: false,
    });

    const cluster = new MdaaRdsServerlessCluster(testApp.testStack, 'TestCluster', {
      naming: testApp.naming,
      engine: 'aurora-postgresql',
      engineVersion: AuroraPostgresEngineVersion.VER_16_6,
      clusterIdentifier: 'test-cluster',
      masterUsername: 'testadmin',
      encryptionKey: kmsKey,
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      monitoringRole: monitoringRole,
      port: 5433,
    });

    new MdaaRdsDataResource(testApp.testStack, 'TestRdsData', {
      naming: testApp.naming,
      rdsCluster: cluster,
      onCreateSqlStatements: ['CREATE DATABASE testdb'],
    });

    const template = Template.fromStack(testApp.testStack);

    // Verify the custom resource exists without database_name
    template.hasResourceProperties('Custom::RDS-Data', {
      on_create_sql_statements: ['CREATE DATABASE testdb'],
    });

    // Verify minimal permissions are still granted
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'rds-data:ExecuteStatement',
          }),
          Match.objectLike({
            Action: 'secretsmanager:GetSecretValue',
          }),
          Match.objectLike({
            Action: 'kms:Decrypt',
          }),
        ]),
      },
    });
  });

  test('does NOT grant excessive permissions', () => {
    const vpc = new Vpc(testApp.testStack, 'TestVpc', {
      maxAzs: 2,
    });

    const kmsKey = new MdaaKmsKey(testApp.testStack, 'TestKey', {
      naming: testApp.naming,
      alias: 'test-key',
    });

    const monitoringRole = new MdaaRole(testApp.testStack, 'MonitoringRole', {
      naming: testApp.naming,
      roleName: 'monitoring',
      assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
      createParams: false,
      createOutputs: false,
    });

    const cluster = new MdaaRdsServerlessCluster(testApp.testStack, 'TestCluster', {
      naming: testApp.naming,
      engine: 'aurora-postgresql',
      engineVersion: AuroraPostgresEngineVersion.VER_16_6,
      clusterIdentifier: 'test-cluster',
      masterUsername: 'testadmin',
      encryptionKey: kmsKey,
      vpc: vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      monitoringRole: monitoringRole,
      port: 5433,
    });

    new MdaaRdsDataResource(testApp.testStack, 'TestRdsData', {
      naming: testApp.naming,
      rdsCluster: cluster,
      onCreateSqlStatements: ['CREATE DATABASE testdb'],
    });

    const template = Template.fromStack(testApp.testStack);

    // Verify the handler policy has exactly 3 statements (ExecuteStatement, GetSecretValue, Decrypt)
    const handlerPolicy = template.findResources('AWS::IAM::Policy', {
      Properties: {
        PolicyName: 'RDS-Data-handler',
      },
    });

    const policyKeys = Object.keys(handlerPolicy);
    expect(policyKeys.length).toBe(1);

    const policy = handlerPolicy[policyKeys[0]];
    const statements = policy.Properties.PolicyDocument.Statement;

    // Should have exactly 3 statements
    expect(statements.length).toBe(3);

    // Verify it has the right actions
    const actions = statements.flatMap((stmt: { Action: string | string[] }) =>
      Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
    );
    expect(actions).toContain('rds-data:ExecuteStatement');
    expect(actions).toContain('secretsmanager:GetSecretValue');
    expect(actions).toContain('kms:Decrypt');

    // Verify it does NOT have these actions (which are only for KB execution role)
    expect(actions).not.toContain('rds-data:BatchExecuteStatement');
    expect(actions).not.toContain('rds:DescribeDBClusters');
    expect(actions).not.toContain('secretsmanager:DescribeSecret');
    expect(actions).not.toContain('kms:Encrypt');
    expect(actions).not.toContain('kms:GenerateDataKey');
  });
});
