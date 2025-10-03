/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { CfnDataCatalogEncryptionSettings, CfnDataCatalogEncryptionSettingsProps } from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';

export interface MdaaCatalogSettingsProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS account ID for the Data Catalog where encryption settings will be applied enabling account-specific catalog configuration. Specifies the target account for Glue Data Catalog encryption settings and metadata protection.
   *
   * Use cases: Account-specific configuration; Cross-account catalog management; Catalog identification; Account isolation
   *
   * AWS: AWS Glue Data Catalog account identifier for encryption settings and metadata protection
   *
   * Validation: Must be valid 12-digit AWS account ID; required; identifies target account for catalog encryption
   **/
  readonly catalogId: string;

  readonly catalogKmsKey: IMdaaKmsKey;
}

/**
 * Construct for creating a compliant Glue Security Config
 * Enforces the following:
 * * CloudWatch KMS Encryption enabled
 * * Job Bookbark Encryption enabled
 * * S3 Output Encryption enabled
 */
export class MdaaCatalogSettings extends CfnDataCatalogEncryptionSettings {
  private static setProps(props: MdaaCatalogSettingsProps): CfnDataCatalogEncryptionSettingsProps {
    const overrideProps = {
      catalogId: props.catalogId,
      dataCatalogEncryptionSettings: {
        encryptionAtRest: {
          catalogEncryptionMode: 'SSE-KMS',
          sseAwsKmsKeyId: props.catalogKmsKey.keyArn,
        },
        connectionPasswordEncryption: {
          kmsKeyId: props.catalogKmsKey.keyArn,
          returnConnectionPasswordEncrypted: true,
        },
      },
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }
  constructor(scope: Construct, id: string, props: MdaaCatalogSettingsProps) {
    super(scope, id, MdaaCatalogSettings.setProps(props));
  }
}
