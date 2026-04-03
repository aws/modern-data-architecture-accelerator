/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps, NamedDatabaseGrantProps } from '../lib';
// nosemgrep
import * as path from 'path';
import { Protocol } from 'aws-cdk-lib/aws-ec2';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const testGlueRoleRef: MdaaRoleRef = {
    id: 'test-glue-role-id',
  };

  const testAdminRoleRef: MdaaRoleRef = {
    id: 'test-admin-role-id',
  };

  const testEngRoleRef: MdaaRoleRef = {
    id: 'test-eng-super-role-id',
  };

  const testGrants: NamedDatabaseGrantProps = {
    'test-grant': {
      principalArns: {
        'test-arn-principal': 'test-arn',
      },
      principals: {
        'test-principal': {
          role: {
            arn: 'test-arn2',
          },
        },
      },
    },
    'test-grant-tables': {
      tables: ['test-table'],
      principalArns: {
        'test-table-arn-principal': 'test-table-arn',
      },
    },
  };
  const crossAccountStack = new Stack(testApp, 'test-cross-account-stack');
  const constructProps: DataOpsProjectL3ConstructProps = {
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(
      testApp.testStack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    ),
    crossAccountStacks: { 'test-cross-account': { 'test-region': crossAccountStack } },
    s3OutputKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/s3-output-key-id',
    glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/glue-catalog-key-id',
    projectExecutionRoleRefs: [testGlueRoleRef],
    datazone: {
      project: {
        domainConfigSSMParam: '/test-param',
        domainUnit: '/test-unit',
      },
    },
    lakeFormation: {
      lfTags: [
        {
          tagKey: 'Environment',
          tagValues: ['dev', 'test', 'prod'],
        },
        {
          tagKey: 'DataClassification',
          tagValues: ['public', 'internal', 'confidential'],
        },
      ],
    },
    securityGroupConfigs: {
      'test-group': {
        vpcId: 'test-vpc',
        securityGroupEgressRules: {
          ipv4: [
            {
              cidr: '10.10.10.0/24',
              protocol: Protocol.TCP,
              port: 445,
            },
          ],
        },
      },
    },
    failureNotifications: {
      email: ['test-email'],
    },
    databases: {
      test_database_no_location: {
        description: 'testing_no_location',
      },
      test_database_nolf: {
        description: 'testing_nolf',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix',
      },
      test_database_verbatim: {
        verbatimName: true,
        description: 'testing_verbatim',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix',
      },
      test_database_iceberg_compliant: {
        icebergCompliantName: true,
        description: 'testing_nolf',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix',
      },
      test_database_datazone: {
        description: 'testing_nolf',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix',
        createDatazoneDatasource: true,
      },
      test_database: {
        description: 'testing',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix',
        lakeFormation: {
          createSuperGrantsForDataAdminRoles: true,
          createReadWriteGrantsForProjectExecutionRoles: true,
          createReadGrantsForDataEngineerRoles: true,
          createCrossAccountResourceLinkAccounts: ['test-cross-account'],
          grants: testGrants,
        },
      },
      test_database_no_cross_account: {
        description: 'test_database_no_cross_account',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix',
        lakeFormation: {
          createSuperGrantsForDataAdminRoles: true,
          createReadWriteGrantsForProjectExecutionRoles: true,
          createReadGrantsForDataEngineerRoles: true,
          grants: testGrants,
        },
      },
      test_database_with_lf_tags: {
        description: 'test_database_with_lf_tags',
        locationBucketName: 'test-bucket-name',
        locationPrefix: 'test-prefix-tags',
        lakeFormation: {
          createSuperGrantsForDataAdminRoles: true,
          createReadWriteGrantsForProjectExecutionRoles: true,
          createReadGrantsForDataEngineerRoles: true,
          databaseTagValues: [
            {
              tagKey: 'Environment',
              tagValues: ['dev'],
            },
            {
              tagKey: 'DataClassification',
              tagValues: ['internal'],
            },
          ],
        },
      },
    },
    dataEngineerRoleRefs: [testEngRoleRef],
    dataAdminRoleRefs: [testAdminRoleRef],
    connections: {
      'test-connection': {
        connectionType: 'NETWORK',
        physicalConnectionRequirements: {
          availabilityZone: 'test-az',
          securityGroupIdList: ['sg-test'],
          subnetId: 'test-subnet',
        },
      },
      'test-connection2': {
        connectionType: 'NETWORK',
        physicalConnectionRequirements: {
          availabilityZone: 'test-az',
          projectSecurityGroupNames: ['test-group'],
          subnetId: 'test-subnet',
        },
      },
    },
    classifiers: {
      'test-class': {
        classifierType: 'csv',
        configuration: {
          csvClassifier: {
            delimiter: '|',
          },
        },
      },
    },
  };

  new DataOpsProjectL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

  testApp.checkCdkNagCompliance(crossAccountStack);
  const crossAccountTemplate = Template.fromStack(crossAccountStack);
  // console.log( JSON.stringify( crossAccountTemplate.toJSON(), undefined, 2 ) )

  test('Cross Account Resource Link', () => {
    crossAccountTemplate.hasResourceProperties('AWS::Glue::Database', {
      CatalogId: 'test-cross-account',
      DatabaseInput: {
        Name: 'test-org-test-env-test-domain-test-module-test_database',
        TargetDatabase: {
          CatalogId: 'test-account',
          DatabaseName: 'test-org-test-env-test-domain-test-module-test_database',
        },
      },
    });
  });

  test('SecurityGroup', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'testing/test-stack/ec2/test-group',
      GroupName: 'test-org-test-env-test-domain-test-module-test-group',
      SecurityGroupEgress: [
        {
          CidrIp: '255.255.255.255/32',
          Description: 'Disallow all traffic',
          FromPort: 252,
          IpProtocol: 'icmp',
          ToPort: 86,
        },
      ],
      VpcId: 'test-vpc',
    });
  });

  test('SecurityGroup Egress', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
      GroupId: {
        'Fn::GetAtt': ['teststackec2testgroupD6A9949E', 'GroupId'],
      },
      IpProtocol: 'tcp',
      CidrIp: '10.10.10.0/24',
      Description: 'to 10.10.10.0/24:tcp PORT 445',
      FromPort: 445,
      ToPort: 445,
    });
  });

  test('Database', () => {
    template.hasResourceProperties('AWS::Glue::Database', {
      CatalogId: 'test-account',
      DatabaseInput: {
        Description: 'testing',
        LocationUri: 's3://test-bucket-name/test-prefix',
        Name: 'test-org-test-env-test-domain-test-module-test_database',
      },
    });
  });

  test('KMSUsageAccess', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          Match.objectLike({
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
                'aws:userId': [
                  'test-admin-role-id:*',
                  'test-eng-super-role-id:*',
                  'test-glue-role-id:*',
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['projectdeploymentrole542A1AAB', 'RoleId'],
                        },
                        ':*',
                      ],
                    ],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['dzuserrole4DA7E8E2', 'RoleId'],
                        },
                        ':*',
                      ],
                    ],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        {
                          'Fn::GetAtt': ['lakeformationrole7FEE6C3C', 'RoleId'],
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
          }),
        ]),
      },
    });
  });
  test('BucketPolicyEngRead', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject*',
            Condition: {
              StringLike: {
                'aws:userId': ['test-eng-super-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['BucketprojectAACC6DD8', 'Arn'],
                  },
                  '/*',
                ],
              ],
            },
            Sid: '/_Read',
          }),
        ]),
      },
    });
  });
  test('BucketPolicyAdminSuper', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: [
              's3:GetObject*',
              's3:PutObject',
              's3:PutObjectTagging',
              's3:DeleteObject',
              's3:DeleteObjectVersion',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-admin-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['BucketprojectAACC6DD8', 'Arn'],
                  },
                  '/*',
                ],
              ],
            },
            Sid: '/_ReadWriteSuper',
          }),
        ]),
      },
    });
  });
  test('GlueDeploymentRead', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject*',
            Condition: {
              StringLike: {
                'aws:userId': ['test-glue-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['BucketprojectAACC6DD8', 'Arn'],
                  },
                  '/deployment/*',
                ],
              ],
            },
            Sid: '/deployment_Read',
          }),
        ]),
      },
    });
  });

  test('DeploymentRoleReadWrite', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:GetObject*', 's3:PutObject', 's3:PutObjectTagging', 's3:DeleteObject'],
            Effect: 'Allow',
            Principal: {
              AWS: {
                'Fn::GetAtt': ['projectdeploymentrole542A1AAB', 'Arn'],
              },
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['BucketprojectAACC6DD8', 'Arn'],
                  },
                  '/deployment/*',
                ],
              ],
            },
            Sid: '/deployment_ReadWrite',
          }),
        ]),
      },
    });
  });
  test('DataReadWrite', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:GetObject*', 's3:PutObject', 's3:PutObjectTagging', 's3:DeleteObject'],
            Condition: {
              StringLike: {
                'aws:userId': ['test-eng-super-role-id:*', 'test-glue-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['BucketprojectAACC6DD8', 'Arn'],
                  },
                  '/data/*',
                ],
              ],
            },
            Sid: '/data_ReadWrite',
          }),
        ]),
      },
    });
  });
  test('GlueTempReadWrite', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: ['s3:GetObject*', 's3:PutObject', 's3:PutObjectTagging', 's3:DeleteObject'],
            Condition: {
              StringLike: {
                'aws:userId': ['test-glue-role-id:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['BucketprojectAACC6DD8', 'Arn'],
                  },
                  '/temp/*',
                ],
              ],
            },
            Sid: '/temp_ReadWrite',
          }),
        ]),
      },
    });
  });

  test('DeploymentS3PolicyActions', () => {
    const policies = template.findResources('AWS::IAM::ManagedPolicy', {
      Properties: {
        ManagedPolicyName: Match.stringLikeRegexp('.*deployment-s3.*'),
      },
    });
    const policyKeys = Object.keys(policies);
    expect(policyKeys).toHaveLength(1);
    const policy = policies[policyKeys[0]];
    const statements = policy.Properties.PolicyDocument.Statement;
    const actions = statements.map((s: { Action: string | string[] }) => s.Action);
    expect(actions).toEqual([
      ['s3:GetObject*', 's3:GetBucket*', 's3:List*'],
      [
        's3:GetObject*',
        's3:GetBucket*',
        's3:List*',
        's3:DeleteObject*',
        's3:PutObject',
        's3:PutObjectLegalHold',
        's3:PutObjectRetention',
        's3:PutObjectTagging',
        's3:PutObjectVersionTagging',
        's3:Abort*',
      ],
    ]);
  });

  test('DeploymentS3PolicyNagSuppressions', () => {
    const policies = template.findResources('AWS::IAM::ManagedPolicy', {
      Properties: {
        ManagedPolicyName: Match.stringLikeRegexp('.*deployment-s3.*'),
      },
    });
    const policyKeys = Object.keys(policies);
    expect(policyKeys).toHaveLength(1);
    const policy = policies[policyKeys[0]];
    const suppressions = policy.Metadata?.cdk_nag?.rules_to_suppress;
    expect(suppressions).toEqual([
      {
        id: 'AwsSolutions-IAM5',
        reason: 'S3 permissions required for BucketDeployment to copy assets to project bucket.',
        applies_to: [
          'Action::s3:GetObject*',
          'Action::s3:GetBucket*',
          'Action::s3:List*',
          'Action::s3:DeleteObject*',
          'Action::s3:PutObjectLegalHold',
          'Action::s3:PutObjectRetention',
          'Action::s3:PutObjectTagging',
          'Action::s3:PutObjectVersionTagging',
          'Action::s3:Abort*',
          { regex: '/^Resource::arn:.+:s3:::cdk-.+-assets-.+\\/\\*$/' }, // NOSONAR - intentionally using escaped form to cross-validate against String.raw in construct
          { regex: '/^Resource::.*\\/\\*$/' }, // NOSONAR
        ],
      },
    ]);
  });

  test('GlueSecurityConfiguration', () => {
    template.hasResourceProperties('AWS::Glue::SecurityConfiguration', {
      EncryptionConfiguration: {
        CloudWatchEncryption: {
          CloudWatchEncryptionMode: 'SSE-KMS',
          KmsKeyArn: {
            'Fn::GetAtt': ['ProjectKmsKey2B296F94', 'Arn'],
          },
        },
        JobBookmarksEncryption: {
          JobBookmarksEncryptionMode: 'CSE-KMS',
          KmsKeyArn: {
            'Fn::GetAtt': ['ProjectKmsKey2B296F94', 'Arn'],
          },
        },
        S3Encryptions: [
          {
            KmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/s3-output-key-id',
            S3EncryptionMode: 'SSE-KMS',
          },
        ],
      },
      Name: 'test-org-test-env-test-domain-test-module',
    });
  });
  test('DataLocationAccessGrant', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['DATA_LOCATION_ACCESS'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResProjectExRoles0', 'arn'],
        },
      },
      Resource: {
        DataLocation: {
          CatalogId: 'test-account',
          ResourceArn: 'arn:test-partition:s3:::test-bucket-name/test-prefix',
        },
      },
    });
  });
  test('DatabaseGrantAdmin', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['DESCRIBE', 'CREATE_TABLE', 'ALTER', 'DROP'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResDataAdmin0', 'arn'],
        },
      },
      Resource: {
        Database: {
          CatalogId: 'test-account',
          Name: 'test-org-test-env-test-domain-test-module-test_database',
        },
      },
    });
  });
  test('AllTablesGrantAdmin', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['SELECT', 'DESCRIBE', 'INSERT', 'DELETE', 'ALTER', 'DROP'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResDataAdmin0', 'arn'],
        },
      },
      Resource: {
        Table: {
          CatalogId: 'test-account',
          DatabaseName: 'test-org-test-env-test-domain-test-module-test_database',
          TableWildcard: {},
        },
      },
    });
  });
  test('DatabaseGrantEngineer', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['DESCRIBE'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResDataEngineer0', 'arn'],
        },
      },
      Resource: {
        Database: {
          CatalogId: 'test-account',
          Name: 'test-org-test-env-test-domain-test-module-test_database',
        },
      },
    });
  });
  test('AllTablesGrantEngineer', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['SELECT', 'DESCRIBE'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResDataEngineer0', 'arn'],
        },
      },
      Resource: {
        Table: {
          CatalogId: 'test-account',
          DatabaseName: 'test-org-test-env-test-domain-test-module-test_database',
          TableWildcard: {},
        },
      },
    });
  });
  test('ExRoleDatabaseGrant', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['DESCRIBE', 'CREATE_TABLE', 'ALTER'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResProjectExRoles0', 'arn'],
        },
      },
      Resource: {
        Database: {
          CatalogId: 'test-account',
          Name: 'test-org-test-env-test-domain-test-module-test_database',
        },
      },
    });
  });
  test('ExRoleAllTablesGrant', () => {
    template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
      Permissions: ['SELECT', 'DESCRIBE', 'INSERT', 'DELETE'],
      PermissionsWithGrantOption: [],
      Principal: {
        DataLakePrincipalIdentifier: {
          'Fn::GetAtt': ['RoleResProjectExRoles0', 'arn'],
        },
      },
      Resource: {
        Table: {
          CatalogId: 'test-account',
          DatabaseName: 'test-org-test-env-test-domain-test-module-test_database',
          TableWildcard: {},
        },
      },
    });
  });

  test('CatalogKeyAccessManagedPolicy', () => {
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:Decrypt',
            Effect: 'Allow',
            Resource: 'arn:test-partition:kms:test-region:test-account:key/glue-catalog-key-id',
          }),
        ]),
      },
    });
  });

  test('LakeFormationTagCreation', () => {
    template.hasResourceProperties('AWS::LakeFormation::Tag', {
      CatalogId: 'test-account',
      TagKey: 'Environment',
      TagValues: ['dev', 'test', 'prod'],
    });

    template.hasResourceProperties('AWS::LakeFormation::Tag', {
      CatalogId: 'test-account',
      TagKey: 'DataClassification',
      TagValues: ['public', 'internal', 'confidential'],
    });
  });

  test('DatabaseWithLakeFormationTags', () => {
    template.hasResourceProperties('AWS::Glue::Database', {
      CatalogId: 'test-account',
      DatabaseInput: {
        Description: 'test_database_with_lf_tags',
        LocationUri: 's3://test-bucket-name/test-prefix-tags',
        Name: 'test-org-test-env-test-domain-test-module-test_database_with_lf_tags',
      },
    });
  });

  test('LakeFormationTagAssociation', () => {
    template.hasResourceProperties('AWS::LakeFormation::TagAssociation', {
      LFTags: [
        {
          CatalogId: 'test-account',
          TagKey: 'Environment',
          TagValues: ['dev'],
        },
        {
          CatalogId: 'test-account',
          TagKey: 'DataClassification',
          TagValues: ['internal'],
        },
      ],
      Resource: {
        Database: {
          CatalogId: 'test-account',
          Name: 'test-org-test-env-test-domain-test-module-test_database_with_lf_tags',
        },
      },
    });
  });
});

describe('Multiple Security Groups Tests', () => {
  const testApp = new MdaaTestApp();

  const testGlueRoleRef: MdaaRoleRef = {
    id: 'test-glue-role-id',
  };

  const testAdminRoleRef: MdaaRoleRef = {
    id: 'test-admin-role-id',
  };

  const testEngRoleRef: MdaaRoleRef = {
    id: 'test-eng-super-role-id',
  };

  const constructProps: DataOpsProjectL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(
      testApp.testStack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    ),
    projectExecutionRoleRefs: [testGlueRoleRef],
    dataEngineerRoleRefs: [testEngRoleRef],
    dataAdminRoleRefs: [testAdminRoleRef],
    securityGroupConfigs: {
      'sg-one': {
        vpcId: 'vpc-one',
        securityGroupEgressRules: {
          ipv4: [
            {
              cidr: '10.0.0.0/24',
              protocol: Protocol.TCP,
              port: 443,
            },
          ],
        },
      },
      'sg-two': {
        vpcId: 'vpc-two',
        securityGroupEgressRules: {
          ipv4: [
            {
              cidr: '10.1.0.0/24',
              protocol: Protocol.TCP,
              port: 3306,
            },
          ],
        },
      },
    },
  };

  test('Multiple security groups can be created without construct ID collision', () => {
    new DataOpsProjectL3Construct(testApp.testStack, 'multi-sg-stack', constructProps);
    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
  });
});
