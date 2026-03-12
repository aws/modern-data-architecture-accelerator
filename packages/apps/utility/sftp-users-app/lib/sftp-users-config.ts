/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { UserProps } from '@aws-mdaa/sftp-users-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * SSH public key for SFTP user authentication.
 * Private keys are managed externally.
 *
 * Use cases: SSH key-based SFTP authentication; Password-less secure access
 *
 * AWS: Transfer Family user SSH public key
 *
 * Validation: publicKey required; must be valid SSH public key format (e.g. ssh-rsa AAAA...)
 */
export interface PublicKeyConfig {
  /**
   * SSH public key contents for user authentication.
   * Corresponding private key must be managed externally.
   *
   * Use cases: SSH key-based SFTP login; Secure password-less authentication
   *
   * AWS: Transfer Family user SSH public key for authentication
   *
   * Validation: Required; must be valid SSH public key format
   */
  readonly publicKey: string;
}
/**
 * S3 bucket configuration for SFTP user home directories.
 * Files uploaded via SFTP are stored in this bucket with KMS encryption.
 *
 * Use cases: SFTP home directory storage; Encrypted file storage for SFTP operations
 *
 * AWS: S3 bucket with KMS encryption for Transfer Family user file storage
 *
 * Validation: bucketName and kmsKeyArn required
 */
export interface BucketConfig {
  /**
   * S3 bucket name for SFTP user file storage. Accepts bucket names
   * or SSM parameter references.
   *
   * Use cases: SFTP home directory bucket; Cross-account bucket access
   *
   * AWS: S3 bucket for Transfer Family user home directory
   *
   * Validation: Required; must be valid S3 bucket name or SSM parameter path
   */
  readonly bucketName: string;
  /**
   * KMS key ARN for encrypting files uploaded via SFTP.
   * Accepts key ARNs or SSM parameter references.
   *
   * Use cases: Data-at-rest encryption for SFTP uploads; Compliance requirements
   *
   * AWS: KMS key for S3 object encryption in Transfer Family operations
   *
   * Validation: Required; must be valid KMS key ARN or SSM parameter path
   */
  readonly kmsKeyArn: string;
}
/**
 * SFTP user configuration linking authentication keys, S3 storage, and home directory.
 * References named entries from the publicKeys and buckets config sections.
 *
 * Use cases: SFTP user provisioning; Home directory mapping; Multi-key authentication
 *
 * AWS: Transfer Family user with S3 home directory and SSH key authentication
 *
 * Validation: bucket, homeDirectory, and publicKeys required
 */
export interface UserConfig {
  /**
   * Name of a bucket entry from the buckets config section.
   * Links this user to a specific S3 bucket for home directory storage.
   *
   * Use cases: User-to-bucket mapping; Shared bucket configuration across users
   *
   * AWS: Transfer Family user home directory bucket reference
   *
   * Validation: Required; must reference a valid key from the buckets config
   */
  readonly bucket: string;
  /**
   * S3 prefix for the user's home directory within the configured bucket
   * (e.g. /incoming).
   *
   * Use cases: User directory isolation; Organized file storage per user
   *
   * AWS: Transfer Family user home directory S3 prefix
   *
   * Validation: Required; valid S3 prefix string
   */
  readonly homeDirectory: string;
  /**
   * Names of public key entries from the publicKeys config section.
   * Supports multiple keys for key rotation and multi-device access.
   *
   * Use cases: Multi-key authentication; Key rotation support
   *
   * AWS: Transfer Family user SSH public key references
   *
   * Validation: Required; array of valid key names from publicKeys config
   */
  readonly publicKeys: string[];
  /**
   * Existing IAM role ARN for user S3 access. Accepts role ARNs or SSM parameter references.
   * If omitted, MDAA creates a minimally-scoped role automatically.
   *
   * Use cases: Custom access permissions; Pre-existing role reuse; Cross-account access
   *
   * AWS: IAM role for Transfer Family user S3 and KMS access
   *
   * Validation: Optional; must be valid IAM role ARN or SSM parameter path
   */
  readonly accessRoleArn?: string;
}

export interface SftpUserConfigContents extends MdaaBaseConfigContents {
  /**
   * Transfer Family server ID to associate users with.
   * Accepts server IDs or SSM parameter references.
   *
   * Use cases: Linking users to a deployed SFTP server
   *
   * AWS: Transfer Family server ID for user association
   *
   * Validation: Required; must be valid Transfer Family server ID or SSM parameter path
   */
  readonly serverId: string;
  /**
   * Map of key names to SSH public key configurations.
   * Referenced by users in the publicKeys array for authentication.
   *
   * Use cases: Centralized SSH key management; Key reuse across multiple users
   *
   * AWS: Transfer Family SSH public keys for user authentication
   *
   * Validation: Required; keys are unique names, values must be valid PublicKeyConfig
   */
  readonly publicKeys: { [key: string]: PublicKeyConfig };
  /**
   * Map of bucket names to S3 bucket configurations with KMS encryption.
   * Referenced by users in the bucket field for home directory storage.
   *
   * Use cases: Centralized bucket configuration; Shared storage across users
   *
   * AWS: S3 buckets with KMS encryption for Transfer Family user storage
   *
   * Validation: Required; keys are unique names, values must be valid BucketConfig
   */
  readonly buckets: { [key: string]: BucketConfig };
  /**
   * Map of user names to SFTP user configurations.
   * Each user references entries from publicKeys and buckets sections.
   * If no accessRoleArn is specified, MDAA creates a minimally-scoped IAM role.
   *
   * Use cases: SFTP user provisioning; Per-user home directory and key assignment
   *
   * AWS: Transfer Family users with S3 home directories and SSH authentication
   *
   * Validation: Required; keys are unique user names, values must be valid UserConfig
   */
  readonly users: { [key: string]: UserConfig };
}

export class SftpUserConfigParser extends MdaaAppConfigParser<SftpUserConfigContents> {
  public readonly users: UserProps[];
  public readonly serverId: string;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.serverId = this.configContents.serverId;
    this.users = Object.entries(this.configContents.users).map(nameAndconfigUser => {
      const configUserName = nameAndconfigUser[0];
      const configUser = nameAndconfigUser[1];
      const configBucket = this.configContents.buckets[configUser.bucket];
      if (!configBucket) {
        throw new Error(`Config user definition ${configUserName} references invalid bucket name`);
      }
      return {
        name: configUserName,
        homeBucketName: configBucket.bucketName,
        homeBucketKmsKeyArn: configBucket.kmsKeyArn,
        homeDirectory: configUser.homeDirectory,
        accessRoleArn: configUser.accessRoleArn,
        publicKeys: configUser.publicKeys.map(publicKeyRef => {
          const configPublicKey = this.configContents.publicKeys[publicKeyRef];
          if (!configPublicKey) {
            throw new Error(`Config user definition ${configUserName} references invalid public key name`);
          }
          return configPublicKey.publicKey;
        }),
      };
    });
  }
}
