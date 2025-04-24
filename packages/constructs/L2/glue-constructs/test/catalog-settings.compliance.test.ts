/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaCatalogSettings, MdaaCatalogSettingsProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'test-key',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const testContstructProps: MdaaCatalogSettingsProps = {
    naming: testApp.naming,
    catalogId: 'test-catalog-id',
    catalogKmsKey: testKey,
  };

  new MdaaCatalogSettings(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('DataCatalogEncryptionSettings.ConnectionPasswordEncryption.ReturnConnectionPasswordEncrypted', () => {
    template.hasResourceProperties('AWS::Glue::DataCatalogEncryptionSettings', {
      DataCatalogEncryptionSettings: {
        ConnectionPasswordEncryption: {
          ReturnConnectionPasswordEncrypted: true,
        },
      },
    });
  });

  test('DataCatalogEncryptionSettings.ConnectionPasswordEncryption.KmsKeyId', () => {
    template.hasResourceProperties('AWS::Glue::DataCatalogEncryptionSettings', {
      DataCatalogEncryptionSettings: {
        ConnectionPasswordEncryption: {
          KmsKeyId: testKey.keyArn,
        },
      },
    });
  });

  test('DataCatalogEncryptionSettings.EncryptionAtRest.CatalogEncryptionMode', () => {
    template.hasResourceProperties('AWS::Glue::DataCatalogEncryptionSettings', {
      DataCatalogEncryptionSettings: {
        EncryptionAtRest: {
          CatalogEncryptionMode: 'SSE-KMS',
        },
      },
    });
  });

  test('DataCatalogEncryptionSettings.EncryptionAtRest.SseAwsKmsKeyId', () => {
    template.hasResourceProperties('AWS::Glue::DataCatalogEncryptionSettings', {
      DataCatalogEncryptionSettings: {
        EncryptionAtRest: {
          SseAwsKmsKeyId: testKey.keyArn,
        },
      },
    });
  });
});
