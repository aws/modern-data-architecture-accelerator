/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { MdaaHealthLakeDatastore, MdaaHealthLakeDatastoreProps } from '../lib';

const TEST_KMS_KEY_ARN = 'arn:test-partition:kms:test-region:test-account:key/test-key-id';

describe('MdaaHealthLakeDatastore Compliance Tests', () => {
  describe('Basic datastore configuration', () => {
    const testApp = new MdaaTestApp();

    const testProps: MdaaHealthLakeDatastoreProps = {
      naming: testApp.naming,
      kmsKey: Key.fromKeyArn(testApp.testStack, 'test-key', TEST_KMS_KEY_ARN),
      datastoreName: 'test-datastore',
    };

    new MdaaHealthLakeDatastore(testApp.testStack, 'test-construct', testProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('FHIRDatastore resource exists with R4 version', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        DatastoreTypeVersion: 'R4',
      });
    });

    test('CMK encryption is enforced with CUSTOMER_MANAGED_KMS_KEY', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        SseConfiguration: {
          KmsEncryptionConfig: {
            CmkType: 'CUSTOMER_MANAGED_KMS_KEY',
            KmsKeyId: TEST_KMS_KEY_ARN,
          },
        },
      });
    });

    test('MDAA naming applied to datastore name', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        DatastoreName: testApp.naming.resourceName('test-datastore', 256),
      });
    });

    test('No preload config when preloadSynthea is not set', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        PreloadDataConfig: Match.absent(),
      });
    });

    test('SSM parameters are created for datastore outputs', () => {
      // 3 datastore outputs (id, arn, endpoint) + 3 replacement-guard handler params
      // (name, arn, log-group) published by MdaaLambdaFunction/MdaaLambdaRole = 6
      template.resourceCountIs('AWS::SSM::Parameter', 6);
    });
  });

  describe('Datastore with Synthea preload enabled', () => {
    const testApp = new MdaaTestApp();

    const testProps: MdaaHealthLakeDatastoreProps = {
      naming: testApp.naming,
      kmsKey: Key.fromKeyArn(testApp.testStack, 'test-key', TEST_KMS_KEY_ARN),
      datastoreName: 'test-datastore-synthea',
      preloadSynthea: true,
    };

    new MdaaHealthLakeDatastore(testApp.testStack, 'test-construct', testProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Synthea preload config is set when enabled', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        PreloadDataConfig: {
          PreloadDataType: 'SYNTHEA',
        },
      });
    });

    test('CMK encryption remains enforced with preload enabled', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        SseConfiguration: {
          KmsEncryptionConfig: {
            CmkType: 'CUSTOMER_MANAGED_KMS_KEY',
            KmsKeyId: TEST_KMS_KEY_ARN,
          },
        },
      });
    });
  });

  describe('SMART on FHIR identity provider configuration', () => {
    const testApp = new MdaaTestApp();

    const testProps: MdaaHealthLakeDatastoreProps = {
      naming: testApp.naming,
      kmsKey: Key.fromKeyArn(testApp.testStack, 'test-key', TEST_KMS_KEY_ARN),
      datastoreName: 'test-datastore-smart',
      identityProviderConfiguration: {
        authorizationStrategy: 'SMART_ON_FHIR',
        fineGrainedAuthorizationEnabled: true,
        idpLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:smart-decoder',
        metadata:
          '{"authorization_endpoint":"https://auth.example.com/authorize","token_endpoint":"https://auth.example.com/token","grant_types_supported":["authorization_code"],"capabilities":["launch-standalone"],"code_challenge_methods_supported":["S256"]}',
      },
    };

    new MdaaHealthLakeDatastore(testApp.testStack, 'test-construct', testProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('IdentityProviderConfiguration is set with SMART_ON_FHIR strategy', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        IdentityProviderConfiguration: Match.objectLike({
          AuthorizationStrategy: 'SMART_ON_FHIR',
          FineGrainedAuthorizationEnabled: true,
          IdpLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:smart-decoder',
        }),
      });
    });

    test('Metadata JSON is passed through', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        IdentityProviderConfiguration: Match.objectLike({
          Metadata: Match.stringLikeRegexp('authorization_endpoint'),
        }),
      });
    });

    test('CMK encryption remains enforced with SMART on FHIR', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        SseConfiguration: {
          KmsEncryptionConfig: {
            CmkType: 'CUSTOMER_MANAGED_KMS_KEY',
          },
        },
      });
    });
  });

  describe('Minimal identity provider configuration (strategy only)', () => {
    const testApp = new MdaaTestApp();

    const testProps: MdaaHealthLakeDatastoreProps = {
      naming: testApp.naming,
      kmsKey: Key.fromKeyArn(testApp.testStack, 'test-key', TEST_KMS_KEY_ARN),
      datastoreName: 'test-datastore-aws-auth',
      identityProviderConfiguration: {
        authorizationStrategy: 'AWS_AUTH',
      },
    };

    new MdaaHealthLakeDatastore(testApp.testStack, 'test-construct', testProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('IdentityProviderConfiguration is set with AWS_AUTH strategy', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        IdentityProviderConfiguration: {
          AuthorizationStrategy: 'AWS_AUTH',
        },
      });
    });
  });

  describe('SMART_ON_FHIR_V1 identity provider configuration', () => {
    const testApp = new MdaaTestApp();

    const testProps: MdaaHealthLakeDatastoreProps = {
      naming: testApp.naming,
      kmsKey: Key.fromKeyArn(testApp.testStack, 'test-key', TEST_KMS_KEY_ARN),
      datastoreName: 'test-datastore-smart-v1',
      identityProviderConfiguration: {
        authorizationStrategy: 'SMART_ON_FHIR_V1',
        idpLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:smart-v1-decoder',
      },
    };

    new MdaaHealthLakeDatastore(testApp.testStack, 'test-construct', testProps);
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('IdentityProviderConfiguration is set with SMART_ON_FHIR_V1 strategy', () => {
      template.hasResourceProperties('AWS::HealthLake::FHIRDatastore', {
        IdentityProviderConfiguration: Match.objectLike({
          AuthorizationStrategy: 'SMART_ON_FHIR_V1',
          IdpLambdaArn: 'arn:test-partition:lambda:test-region:test-account:function:smart-v1-decoder',
        }),
      });
    });
  });
});
