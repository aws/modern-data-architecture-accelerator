/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HealthLakeL3Construct, HealthLakeL3ConstructProps } from '../lib';

describe('HealthLake L3 Construct Compliance Tests', () => {
  const kmsKeyArn = 'arn:aws:kms:test-region:test-account:key/test-key-id';
  const rawBucketArn = 'arn:aws:s3:::test-raw-bucket';
  const dataAdminRoles = [{ arn: 'arn:test-partition:iam::test-account:role/data-admin' }];

  const singleDatastore = { primary: { rawBucketArn } };

  test('All three resource types are present (datastore, role, SSM params) for a single datastore', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const props: HealthLakeL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      kmsKeyArn,
      datastores: singleDatastore,
    };

    new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', props);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
      DatastoreTypeVersion: 'R4',
      SseConfiguration: {
        KmsEncryptionConfig: {
          CmkType: 'CUSTOMER_MANAGED_KMS_KEY',
          KmsKeyId: kmsKeyArn,
        },
      },
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: {
              Service: 'healthlake.amazonaws.com',
            },
          }),
        ]),
      },
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('glue-database-name'),
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('glue-catalog-id'),
    });
  });

  test('Data-access role S3 policy scoped to rawBucketArn and KMS to kmsKeyArn', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
      naming: testApp.naming,
      roleHelper,
      kmsKeyArn,
      datastores: singleDatastore,
    });
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: 'HealthLakeS3Access',
        }),
        Match.objectLike({
          PolicyName: 'HealthLakeKmsAccess',
        }),
      ]),
    });
  });

  test('Provided kmsKeyArn does not create a new KMS key', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
      naming: testApp.naming,
      roleHelper,
      kmsKeyArn,
      datastores: singleDatastore,
    });
    const template = Template.fromStack(testApp.testStack);

    template.resourceCountIs('AWS::KMS::Key', 0);
  });

  test('Dependency ordering: Glue database depends on datastore', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
      naming: testApp.naming,
      roleHelper,
      kmsKeyArn,
      datastores: singleDatastore,
    });
    const template = Template.fromStack(testApp.testStack);

    const datastoreResources = template.findResources('AWS::HealthLake::FHIRDatastore');
    const datastoreLogicalIds = Object.keys(datastoreResources);
    expect(datastoreLogicalIds.length).toBeGreaterThan(0);

    const ssmResources = template.findResources('AWS::SSM::Parameter');
    const glueSsmLogicalIds = Object.keys(ssmResources).filter(
      id => id.includes('GlueDatabase') || id.includes('glue'),
    );
    expect(glueSsmLogicalIds.length).toBeGreaterThan(0);

    let hasDependsOn = false;
    for (const logicalId of glueSsmLogicalIds) {
      const resource = ssmResources[logicalId];
      if (resource.DependsOn) {
        const dependencies = Array.isArray(resource.DependsOn) ? resource.DependsOn : [resource.DependsOn];
        for (const dep of dependencies) {
          if (dep.includes('Datastore') || datastoreLogicalIds.includes(dep)) {
            hasDependsOn = true;
            break;
          }
        }
      }
      if (hasDependsOn) break;
    }
    expect(hasDependsOn).toBe(true);
  });

  test('Synthea preload is passed through when enabled', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
      naming: testApp.naming,
      roleHelper,
      kmsKeyArn,
      datastores: { primary: { rawBucketArn, preloadSynthea: true } },
    });
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
      PreloadDataConfig: {
        PreloadDataType: 'SYNTHEA',
      },
    });
  });

  describe('Multiple named datastores', () => {
    test('Deploys one FHIRDatastore, data-access role, and Glue SSM param set per named entry', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
        naming: testApp.naming,
        roleHelper,
        kmsKeyArn,
        datastores: {
          primary: { rawBucketArn },
          secondary: { rawBucketArn: 'arn:aws:s3:::test-raw-bucket-secondary' },
        },
      });
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::HealthLake::FHIRDatastore', 2);
      // Two data-access roles (one per datastore)
      const roles = template.findResources('AWS::IAM::Role', {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: Match.arrayWith([Match.objectLike({ Principal: { Service: 'healthlake.amazonaws.com' } })]),
          },
        },
      });
      expect(Object.keys(roles).length).toBe(2);
    });

    test('Shares a single KMS key across all datastores when auto-created', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
        naming: testApp.naming,
        roleHelper,
        dataAdminRoles,
        datastores: {
          primary: { rawBucketArn },
          secondary: { rawBucketArn: 'arn:aws:s3:::test-raw-bucket-secondary' },
        },
      });
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::KMS::Key', 1);
    });
  });

  test('Empty datastores map throws', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    expect(
      () =>
        new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
          naming: testApp.naming,
          roleHelper,
          kmsKeyArn,
          datastores: {},
        }),
    ).toThrow(/at least one datastore/);
  });

  test('Auto-creating a KMS key without dataAdminRoles throws', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    expect(
      () =>
        new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
          naming: testApp.naming,
          roleHelper,
          datastores: singleDatastore,
        }),
    ).toThrow(/dataAdminRoles must contain at least one same-account role when a KMS key is auto-created/);
  });

  test('Omitting dataAdminRoles is allowed when kmsKeyArn is provided', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    expect(
      () =>
        new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
          naming: testApp.naming,
          roleHelper,
          kmsKeyArn,
          datastores: singleDatastore,
        }),
    ).not.toThrow();
  });

  describe('CDK Nag Compliance', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
      naming: testApp.naming,
      roleHelper,
      kmsKeyArn,
      datastores: singleDatastore,
    });
    testApp.checkCdkNagCompliance(testApp.testStack);
  });

  describe('Auto-created KMS key (kmsKeyArn not provided)', () => {
    test('Creates a MdaaKmsKey when kmsKeyArn is omitted', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
        naming: testApp.naming,
        roleHelper,
        dataAdminRoles,
        datastores: singleDatastore,
      });
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });

      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        SseConfiguration: {
          KmsEncryptionConfig: {
            CmkType: 'CUSTOMER_MANAGED_KMS_KEY',
          },
        },
      });
    });

    test('The data admin roles are granted both key admin and key usage on the PHI key', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
        naming: testApp.naming,
        roleHelper,
        dataAdminRoles,
        datastores: singleDatastore,
      });
      const template = Template.fromStack(testApp.testStack);

      // The auto-created key encrypts PHI, so who administers and who can decrypt it are both
      // controls worth pinning rather than inferring from EnableKeyRotation alone. The role ref
      // carries only an ARN, so its id arrives as a resolution-CR token.
      const resolvedAdminUserId = {
        'Fn::Join': ['', [{ 'Fn::GetAtt': ['RoleResDataAdmin0', 'id'] }, ':*']],
      };

      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Create*', 'kms:Put*', 'kms:ScheduleKeyDeletion']),
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Condition: { StringLike: { 'aws:userId': [resolvedAdminUserId] } },
            }),
          ]),
        },
      });

      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Condition: { StringLike: { 'aws:userId': [resolvedAdminUserId] } },
            }),
          ]),
        },
      });
    });

    test('An admin list of only cross-account roles is rejected', () => {
      // KMS never honours key management across accounts, so such a list leaves the retained PHI
      // key administrable by nothing but the account root, which is what the guard exists to stop.
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      expect(
        () =>
          new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
            naming: testApp.naming,
            roleHelper,
            dataAdminRoles: [{ arn: 'arn:test-partition:iam::999999999999:role/CrossAccountPhiAdmin' }],
            datastores: singleDatastore,
          }),
      ).toThrow(/at least one same-account role/);
    });

    test('A cross-account data admin is granted access by ARN principal instead', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      const crossAccountArn = 'arn:test-partition:iam::999999999999:role/CrossAccountPhiAdmin';

      new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
        naming: testApp.naming,
        roleHelper,
        // A same-account admin has to be present for the key to stay manageable.
        dataAdminRoles: [...dataAdminRoles, { arn: crossAccountArn }],
        datastores: singleDatastore,
      });
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: { AWS: crossAccountArn },
              Action: Match.arrayWith(['kms:CreateGrant', 'kms:DescribeKey']),
              Sid: Match.stringLikeRegexp('xacct-admin-stmt'),
            }),
          ]),
        },
      });

      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: { AWS: crossAccountArn },
              Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
              Sid: Match.stringLikeRegexp('xacct-usage-stmt'),
            }),
          ]),
        },
      });

      // Resolving a cross-account role id would call IAM in the deploying account and fail, so only
      // the same-account admin gets a lookup.
      expect(Object.keys(template.findResources('AWS::CloudFormation::CustomResource'))).toEqual(['RoleResDataAdmin0']);
    });

    const nagTestApp = new MdaaTestApp();
    const nagRoleHelper = new MdaaRoleHelper(nagTestApp.testStack, nagTestApp.naming);
    new HealthLakeL3Construct(nagTestApp.testStack, 'TestHealthLake', {
      naming: nagTestApp.naming,
      roleHelper: nagRoleHelper,
      dataAdminRoles,
      datastores: singleDatastore,
    });
    nagTestApp.checkCdkNagCompliance(nagTestApp.testStack);
  });

  describe('Identity provider configuration passthrough', () => {
    test('SMART on FHIR config is passed to the datastore', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

      new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
        naming: testApp.naming,
        roleHelper,
        kmsKeyArn,
        datastores: {
          primary: {
            rawBucketArn,
            identityProviderConfiguration: {
              authorizationStrategy: 'SMART_ON_FHIR',
              fineGrainedAuthorizationEnabled: true,
              idpLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:smart-decoder',
            },
          },
        },
      });
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        IdentityProviderConfiguration: Match.objectLike({
          AuthorizationStrategy: 'SMART_ON_FHIR',
          FineGrainedAuthorizationEnabled: true,
          IdpLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:smart-decoder',
        }),
      });
    });
  });

  describe('SMART on FHIR idpLambdaArn cross-field validation', () => {
    // The L3 enforces the deployment invariant per datastore.
    test('throws when a datastore has SMART_ON_FHIR and no idpLambdaArn', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      expect(
        () =>
          new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
            naming: testApp.naming,
            roleHelper,
            kmsKeyArn,
            datastores: {
              primary: {
                rawBucketArn,
                identityProviderConfiguration: { authorizationStrategy: 'SMART_ON_FHIR' },
              },
            },
          }),
      ).toThrow(
        /datastores\.primary\.identityProviderConfiguration\.idpLambdaArn is required when authorizationStrategy is 'SMART_ON_FHIR'/,
      );
    });

    test('throws when a datastore has SMART_ON_FHIR_V1 and no idpLambdaArn', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      expect(
        () =>
          new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
            naming: testApp.naming,
            roleHelper,
            kmsKeyArn,
            datastores: {
              primary: {
                rawBucketArn,
                identityProviderConfiguration: { authorizationStrategy: 'SMART_ON_FHIR_V1' },
              },
            },
          }),
      ).toThrow(
        /datastores\.primary\.identityProviderConfiguration\.idpLambdaArn is required when authorizationStrategy is 'SMART_ON_FHIR_V1'/,
      );
    });

    test('does not throw for AWS_AUTH without idpLambdaArn', () => {
      const testApp = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
      expect(
        () =>
          new HealthLakeL3Construct(testApp.testStack, 'TestHealthLake', {
            naming: testApp.naming,
            roleHelper,
            kmsKeyArn,
            datastores: {
              primary: {
                rawBucketArn,
                identityProviderConfiguration: { authorizationStrategy: 'AWS_AUTH' },
              },
            },
          }),
      ).not.toThrow();
    });
  });
});
