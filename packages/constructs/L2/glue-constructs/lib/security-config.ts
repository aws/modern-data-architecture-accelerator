/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import {
  SecurityConfiguration,
  SecurityConfigurationProps,
  CloudWatchEncryptionMode,
  JobBookmarksEncryptionMode,
  S3EncryptionMode,
} from '@aws-cdk/aws-glue-alpha';
import { Construct } from 'constructs';

/**
 * Interface representing a compliant Glue Security Config
 */
export interface MdaaSecurityConfigProps extends MdaaConstructProps {
  /** The CloudWatch KMS Key */
  readonly cloudWatchKmsKey: IMdaaKmsKey;
  /** The Job Bookmark KMS Key */
  readonly jobBookMarkKmsKey: IMdaaKmsKey;
  /** The S3 Output KMS Key */
  readonly s3OutputKmsKey: IMdaaKmsKey;
  /**
   * The name of the security configuration.
   */
  readonly securityConfigurationName?: string;
}

/**
 * Construct for creating a compliant Glue Security Config
 * Enforces the following:
 * * CloudWatch KMS Encryption enabled
 * * Job Bookbark Encryption enabled
 * * S3 Output Encryption enabled
 */
export class MdaaSecurityConfig extends SecurityConfiguration {
  private static setProps(props: MdaaSecurityConfigProps): SecurityConfigurationProps {
    const overrideProps = {
      securityConfigurationName: props.naming.resourceName(props.securityConfigurationName),
      cloudWatchEncryption: {
        mode: CloudWatchEncryptionMode.KMS,
        kmsKey: props.cloudWatchKmsKey,
      },
      jobBookmarksEncryption: {
        mode: JobBookmarksEncryptionMode.CLIENT_SIDE_KMS,
        kmsKey: props.jobBookMarkKmsKey,
      },
      s3Encryption: {
        mode: S3EncryptionMode.KMS,
        kmsKey: props.s3OutputKmsKey,
      },
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }
  constructor(scope: Construct, id: string, props: MdaaSecurityConfigProps) {
    super(scope, id, MdaaSecurityConfig.setProps(props));
  }
}
