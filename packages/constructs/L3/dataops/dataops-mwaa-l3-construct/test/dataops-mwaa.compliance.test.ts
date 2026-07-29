/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as path from 'node:path';
import { DataopsMwaaL3Construct, DataopsMwaaL3ConstructProps } from '../lib';

describe('DataOps MWAA L3 Construct — standalone mode', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    environments: {
      'test-pipeline': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        airflowVersion: '2.10.3',
        environmentClass: 'mw1.small',
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
        securityGroupIngress: {
          ipv4: ['10.0.0.0/16'],
          sg: ['sg-0abc1234'],
        },
        pluginsS3Path: 'plugins/plugins.zip',
        requirementsS3Path: 'requirements/requirements.txt',
        startupScriptS3Path: 'scripts/startup.sh',
        minWorkers: 2,
        maxWorkers: 15,
        schedulers: 3,
        airflowConfigurationOptions: { 'core.default_timezone': 'utc' },
        weeklyMaintenanceWindowStart: 'SUN:03:00',
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Creates MWAA Environment', () => {
    template.resourceCountIs('AWS::MWAA::Environment', 1);
  });

  test('Creates S3 DAGs bucket when no bucketName provided', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          },
        ],
      },
    });
  });

  test('Creates KMS key with rotation', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('KMS key policy allows CloudWatch Logs encryption', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AllowMwaaLogEncryption',
            Effect: 'Allow',
            // Least privilege: CloudWatch Logs needs only data-key generation and
            // read access to encrypt log data (no Encrypt*/ReEncrypt*).
            Action: ['kms:Decrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
            Principal: { Service: Match.stringLikeRegexp('logs.*amazonaws.com') },
            Condition: {
              ArnLike: {
                // Scoped to MWAA-owned airflow-* log groups, not every log group
                // in the account.
                'kms:EncryptionContext:aws:logs:arn': Match.stringLikeRegexp('arn:.*:logs:.*:log-group:airflow-\\*$'),
              },
            },
          }),
        ]),
      },
    });
  });

  test('Creates Security Group with self-reference rule', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  });

  test('Creates SG ingress rule for IPv4 CIDR', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 443,
      ToPort: 443,
      CidrIp: '10.0.0.0/16',
    });
  });

  test('Creates SG ingress rule for security group', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 443,
      ToPort: 443,
      SourceSecurityGroupId: 'sg-0abc1234',
    });
  });

  test('MWAA environment uses external execution role', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      ExecutionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
    });
  });

  test('MWAA environment uses PRIVATE_ONLY by default', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      WebserverAccessMode: 'PRIVATE_ONLY',
    });
  });

  test('MWAA environment has logging enabled', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      LoggingConfiguration: {
        SchedulerLogs: { Enabled: true, LogLevel: 'INFO' },
        WorkerLogs: { Enabled: true, LogLevel: 'INFO' },
        WebserverLogs: { Enabled: true, LogLevel: 'INFO' },
        DagProcessingLogs: { Enabled: true, LogLevel: 'INFO' },
        TaskLogs: { Enabled: true, LogLevel: 'INFO' },
      },
    });
  });

  test('DAG S3 path uses deployment/airflow/<env-name>/ prefix', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      DagS3Path: 'deployment/airflow/test-pipeline/dags',
    });
  });

  test('Plugins S3 path uses deployment/airflow/<env-name>/ prefix', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      PluginsS3Path: 'deployment/airflow/test-pipeline/plugins/plugins.zip',
    });
  });

  test('Requirements S3 path uses deployment/airflow/<env-name>/ prefix', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      RequirementsS3Path: 'deployment/airflow/test-pipeline/requirements/requirements.txt',
    });
  });

  test('Startup script S3 path uses deployment/airflow/<env-name>/ prefix', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      StartupScriptS3Path: 'deployment/airflow/test-pipeline/scripts/startup.sh',
    });
  });

  test('Custom scaling properties', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      MinWorkers: 2,
      MaxWorkers: 15,
      Schedulers: 3,
    });
  });

  test('Airflow configuration options', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      AirflowConfigurationOptions: { 'core.default_timezone': 'utc' },
    });
  });

  test('Weekly maintenance window', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      WeeklyMaintenanceWindowStart: 'SUN:03:00',
    });
  });

  test('Creates execution role managed policy with S3, KMS, Logs, SQS, Metrics', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'AirflowS3ReadObjects', Effect: 'Allow' }),
          Match.objectLike({ Sid: 'AirflowS3Bucket', Effect: 'Allow' }),
          Match.objectLike({ Sid: 'AirflowS3List', Effect: 'Allow' }),
          Match.objectLike({ Sid: 'AirflowKmsAccess', Effect: 'Allow' }),
          Match.objectLike({ Sid: 'AirflowLogs', Effect: 'Allow' }),
          Match.objectLike({ Sid: 'AirflowMetrics', Effect: 'Allow' }),
          Match.objectLike({ Sid: 'AirflowCelery', Effect: 'Allow' }),
        ]),
      },
    });
  });

  test('S3 list access is constrained to the environment prefix', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AirflowS3List',
            Action: 's3:List*',
            Condition: { StringLike: { 's3:prefix': ['deployment/airflow/test-pipeline/*'] } },
          }),
        ]),
      },
    });
  });

  test('CloudWatch Logs access is scoped to this environment log groups', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'AirflowLogs',
            Resource: Match.stringLikeRegexp('log-group:airflow-.*test-pipeline.*-\\*$'),
          }),
        ]),
      },
    });
  });

  test('Pre-creates component log groups with default two-year retention', () => {
    template.resourceCountIs('AWS::Logs::LogGroup', 5);
    for (const component of ['DAGProcessing', 'Scheduler', 'Task', 'WebServer', 'Worker']) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp(`airflow-.*-${component}`),
        RetentionInDays: 731,
      });
    }
  });

  test('No access managed policy when no roles provided', () => {
    // Only the execution role policy is created (no access policy for web login)
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Sid: 'AirflowS3ReadObjects' })]),
      },
    });
    // No access policy with airflow:CreateWebLoginToken
    const policies = template.findResources('AWS::IAM::ManagedPolicy', {
      Properties: {
        PolicyDocument: {
          Statement: Match.arrayWith([Match.objectLike({ Action: Match.arrayWith(['airflow:CreateWebLoginToken']) })]),
        },
      },
    });
    expect(Object.keys(policies)).toHaveLength(0);
  });
});

describe('DataOps MWAA L3 Construct — project mode with roles', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    bucketName: 'my-project-bucket',
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
    dataAdminRoles: [{ arn: 'arn:test-partition:iam::test-account:role/data-admin' }],
    environments: {
      'prod-env': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
        airflowAccessRoles: [{ arn: 'arn:test-partition:iam::test-account:role/pipeline-operator' }],
        webserverAccessMode: 'PUBLIC_ONLY',
        logRetentionDays: 90,
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Does not create S3 bucket when bucketName provided', () => {
    template.resourceCountIs('AWS::S3::Bucket', 0);
  });

  test('Does not create KMS key when kmsArn provided', () => {
    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  test('Uses project bucket in environment', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      DagS3Path: 'deployment/airflow/prod-env/dags',
    });
  });

  test('PUBLIC_ONLY webserverAccessMode', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      WebserverAccessMode: 'PUBLIC_ONLY',
    });
  });

  test('Creates access managed policy when roles provided', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['airflow:CreateWebLoginToken', 'airflow:CreateCliToken', 'airflow:GetEnvironment'],
            Effect: 'Allow',
          },
        ],
      },
    });
  });

  test('Custom logRetentionDays applied to component log groups', () => {
    for (const component of ['DAGProcessing', 'Scheduler', 'Task', 'WebServer', 'Worker']) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp(`airflow-.*-${component}`),
        RetentionInDays: 90,
      });
    }
  });
});

describe('DataOps MWAA L3 Construct — DAG deployment (deploymentRoleArn provided)', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  // Providing deploymentRoleArn triggers deployDags(), which creates a
  // BucketDeployment. CDK synthesizes a single stack-level custom-resource
  // Lambda for all BucketDeployments; its CDK Nag Lambda findings must be
  // suppressed at the stack scope (not on the BucketDeployment construct).
  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    bucketName: 'my-project-bucket',
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
    deploymentRoleArn: 'arn:test-partition:iam::test-account:role/deployment-role',
    environments: {
      'prod-env': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  // Regression guard: this failed before the singleton-Lambda suppression fix
  // because the BucketDeployment Lambda's Nag findings were left unsuppressed.
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Creates a BucketDeployment custom resource for DAG upload', () => {
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
  });

  test('Deploys DAGs to the deployment/airflow/<env-name>/dags prefix', () => {
    template.hasResourceProperties('Custom::CDKBucketDeployment', {
      DestinationBucketKeyPrefix: 'deployment/airflow/prod-env/dags',
    });
  });
});

describe('DataOps MWAA L3 Construct — user-supplied dagPath', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  // Covers the dagPath branch of deployDags(): when dagPath is set the construct
  // deploys Source.asset(dagPath) instead of the bundled placeholder DAG.
  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    bucketName: 'my-project-bucket',
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
    deploymentRoleArn: 'arn:test-partition:iam::test-account:role/deployment-role',
    environments: {
      'custom-dag-env': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
        dagPath: path.join(__dirname, '..', 'assets', 'default-dag'),
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Creates a BucketDeployment from the user-supplied DAG directory', () => {
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
    template.hasResourceProperties('Custom::CDKBucketDeployment', {
      DestinationBucketKeyPrefix: 'deployment/airflow/custom-dag-env/dags',
    });
  });
});

describe('DataOps MWAA L3 Construct — infinite log retention (logRetentionDays: 0)', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  // Covers the logRetentionDays === 0 branch of resolveLogRetention(), which
  // selects RetentionDays.INFINITE.
  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    environments: {
      'infinite-env': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
        logRetentionDays: 0,
        minWebservers: 2,
        maxWebservers: 5,
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Component log groups omit RetentionInDays for infinite retention', () => {
    for (const component of ['DAGProcessing', 'Scheduler', 'Task', 'WebServer', 'Worker']) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.stringLikeRegexp(`airflow-.*-${component}`),
        RetentionInDays: Match.absent(),
      });
    }
  });

  test('Webserver scaling properties are passed through', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      MinWebservers: 2,
      MaxWebservers: 5,
    });
  });
});

describe('DataOps MWAA L3 Construct — logRetentionDays validation', () => {
  const buildWithRetention = (logRetentionDays: number) => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    return () =>
      new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', {
        naming: testApp.naming,
        roleHelper,
        environments: {
          'retention-env': {
            vpcId: 'vpc-test123',
            subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
            executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
            logRetentionDays,
          },
        },
      });
  };

  test('Rejects a day count CloudWatch does not support', () => {
    // 45 is not a valid RetentionDays value. Without validation this reaches
    // CloudFormation as RetentionInDays: 45 and fails at deploy time, so it must
    // fail at synth instead.
    expect(buildWithRetention(45)).toThrow(/Invalid logRetentionDays value 45/);
  });

  test('Accepts a supported day count', () => {
    expect(buildWithRetention(90)).not.toThrow();
  });
});

describe('DataOps MWAA L3 Construct — role dedup and immutable roles', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  // The same role ref appears in both dataAdminRoles and airflowAccessRoles
  // (exercises the JSON-key dedup path), and a second ref is immutable
  // (exercises the immutable-role skip when attaching the access policy).
  const sharedRole = { arn: 'arn:test-partition:iam::test-account:role/shared-admin' };
  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    dataAdminRoles: [sharedRole, { arn: 'arn:test-partition:iam::test-account:role/immutable', immutable: true }],
    environments: {
      'dedup-env': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-execution',
        airflowAccessRoles: [sharedRole],
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Duplicate role refs do not cause duplicate construct IDs and policy is created', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['airflow:CreateWebLoginToken', 'airflow:CreateCliToken', 'airflow:GetEnvironment'],
            Effect: 'Allow',
          },
        ],
      },
    });
  });

  test('Immutable roles are skipped when attaching the access policy', () => {
    // The access policy attaches only to the mutable shared role, so exactly one
    // role name appears on the managed policy.
    const policies = template.findResources('AWS::IAM::ManagedPolicy', {
      Properties: {
        PolicyDocument: {
          Statement: Match.arrayWith([Match.objectLike({ Action: Match.arrayWith(['airflow:CreateWebLoginToken']) })]),
        },
      },
    });
    const accessPolicy = Object.values(policies)[0] as { Properties: { Roles?: unknown[] } };
    expect(accessPolicy.Properties.Roles).toHaveLength(1);
  });
});

describe('DataOps MWAA L3 Construct — multi-environment', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const constructProps: DataopsMwaaL3ConstructProps = {
    naming: testApp.naming,
    roleHelper,
    environments: {
      'env-alpha': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-alpha',
      },
      'env-beta': {
        vpcId: 'vpc-test123',
        subnets: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        executionRoleArn: 'arn:test-partition:iam::test-account:role/airflow-beta',
        environmentClass: 'mw1.medium',
      },
    },
  };

  new DataopsMwaaL3Construct(testApp.testStack, 'test-construct', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Creates two MWAA environments', () => {
    template.resourceCountIs('AWS::MWAA::Environment', 2);
  });

  test('Creates two security groups', () => {
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
  });

  test('Each environment has distinct DAG path', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      DagS3Path: 'deployment/airflow/env-alpha/dags',
    });
    template.hasResourceProperties('AWS::MWAA::Environment', {
      DagS3Path: 'deployment/airflow/env-beta/dags',
    });
  });

  test('Environments are chained via DependsOn to serialize MWAA creation', () => {
    // Environments are created sequentially to avoid the MWAA CreateEnvironment
    // API rate limit (429 Too Many Requests) when CloudFormation submits both
    // in parallel. Lock in that ordering.
    const envs = template.findResources('AWS::MWAA::Environment');
    const alphaId = Object.keys(envs).find(
      id => envs[id].Properties?.DagS3Path === 'deployment/airflow/env-alpha/dags',
    );
    const betaId = Object.keys(envs).find(id => envs[id].Properties?.DagS3Path === 'deployment/airflow/env-beta/dags');
    expect(alphaId).toBeDefined();
    expect(betaId).toBeDefined();
    // The second environment (beta) depends on the first (alpha).
    expect(envs[betaId as string].DependsOn).toEqual(expect.arrayContaining([alphaId]));
  });
});
