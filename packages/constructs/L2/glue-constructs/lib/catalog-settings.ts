/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { CfnDataCatalogEncryptionSettings, CfnDataCatalogEncryptionSettingsProps } from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';

/**
 * Interface representing a compliant Glue Security Config
 */
export interface MdaaCatalogSettingsProps extends MdaaConstructProps {
  /**
   * The ID of the Data Catalog in which the settings are created.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-datacatalogencryptionsettings.html#cfn-glue-datacatalogencryptionsettings-catalogid
   */
  readonly catalogId: string;

  /**
   * The ID of the AWS KMS key to use for encryption at rest of the catalog.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-datacatalogencryptionsettings-encryptionatrest.html#cfn-glue-datacatalogencryptionsettings-encryptionatrest-sseawskmskeyid
   */
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
