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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for SFTP public key management enabling secure SSH key-based authentication for SFTP users. Provides public key configuration for secure, password-less authentication to SFTP servers with proper key management.
 *
 * Use cases: SSH key-based authentication; Secure SFTP access; Public key management for user authentication
 *
 * AWS: Configures public keys for AWS Transfer Family SFTP user authentication and secure access
 *
 * Validation: publicKey is required and must be valid SSH public key format
 */
export interface PublicKeyConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SSH public key contents for secure SFTP user authentication enabling password-less access to SFTP servers. Provides secure authentication mechanism using SSH public key cryptography for enhanced security and access control.
   *
   * Use cases: SSH key authentication; Secure SFTP access; Password-less authentication for enhanced security
   *
   * AWS: AWS Transfer Family user public key for SSH-based authentication and secure access
   *
   * Validation: Must be valid SSH public key format; required; used for secure user authentication
   **/
  readonly publicKey: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for SFTP bucket access management enabling secure S3 bucket integration with SFTP servers. Provides bucket configuration for SFTP user home directories with encryption and access control capabilities.
 *
 * Use cases: SFTP home directory configuration; S3 bucket integration; Encrypted file storage for SFTP operations
 *
 * AWS: Configures S3 buckets for AWS Transfer Family SFTP user home directories with KMS encryption
 *
 * Validation: bucketName and kmsKeyArn are required; bucket must exist and be accessible
 */
export interface BucketConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for SFTP user home directory storage enabling secure file storage and organization. Provides the target S3 bucket where SFTP users will store and retrieve files with proper access controls and organization.
   *
   * Use cases: SFTP file storage; User home directory configuration; S3 integration for file management
   *
   * AWS: Amazon S3 bucket for Transfer Family SFTP user file storage and home directory
   *
   * Validation: Must be valid S3 bucket name; required; bucket must exist and be accessible by SFTP service
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for encrypting files written through the SFTP server ensuring data protection compliance. Provides encryption at rest for all files uploaded via SFTP with customer-controlled key management for enhanced security.
   *
   * Use cases: File encryption; Data protection compliance; Customer key management for SFTP uploads
   *
   * AWS: AWS KMS key for S3 object encryption in Transfer Family SFTP operations
   *
   * Validation: Must be valid KMS key ARN; required; used for all SFTP file encryption operations
   **/
  readonly kmsKeyArn: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for SFTP user management enabling user setup with bucket access, authentication, and directory configuration. Provides complete user configuration for SFTP access with home directory mapping and security controls.
 *
 * Use cases: SFTP user configuration; Home directory setup; User access control and authentication management
 *
 * AWS: Configures AWS Transfer Family SFTP users with S3 access, authentication, and directory permissions
 *
 * Validation: bucket, homeDirectory, and publicKeys are required; bucket and publicKeys must reference valid configurations
 */
export interface UserConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required reference to bucket configuration name for user home directory storage enabling organized file access and storage. Links the user to a specific S3 bucket configuration for home directory operations and file management.
   *
   * Use cases: Home directory configuration; Bucket access mapping; User-specific storage organization
   *
   * AWS: AWS Transfer Family user home directory bucket configuration for file storage
   *
   * Validation: Must reference valid bucket name from buckets configuration; required; defines user storage location
   **/
  readonly bucket: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix for user home directory within the configured bucket enabling user-specific file organization. Provides isolated directory space for each user within the shared bucket for organized file management and access control.
   *
   * Use cases: User directory isolation; File organization; User-specific storage space within shared buckets
   *
   * AWS: AWS Transfer Family user home directory prefix for S3 object organization
   *
   * Validation: Must be valid S3 prefix string; required; defines user-specific directory within bucket
   **/
  readonly homeDirectory: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of public key references for user authentication enabling multi-key access and key rotation capabilities. Links the user to configured public keys for SSH authentication with support for multiple keys and key management.
   *
   * Use cases: Multi-key authentication; Key rotation support; Flexible authentication configuration
   *
   * AWS: AWS Transfer Family user public key references for SSH authentication and access
   *
   * Validation: Must be array of valid public key names from publicKeys configuration; required; defines user authentication keys
   **/
  readonly publicKeys: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for user S3 access permissions enabling fine-grained access control beyond home directory. Provides custom IAM role for specific access patterns and permissions beyond the default home directory access.
   *
   * Use cases: Custom access permissions; Fine-grained S3 access control; Specialized user access patterns
   *
   * AWS: AWS IAM role for Transfer Family user S3 access permissions and custom access control
   *
   * Validation: Must be valid IAM role ARN if provided; enables custom access permissions for user operations
   **/
  readonly accessRoleArn?: string;
}

export interface SftpUserConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SFTP server ID for user association enabling user management on specific SFTP servers. Links users to the target SFTP server for access control and user provisioning operations.
   *
   * Use cases: Server-specific user management; User provisioning; SFTP server association and access control
   *
   * AWS: AWS Transfer Family server ID for user association and server-specific management
   *
   * Validation: Must be valid Transfer Family server ID; required; server must exist and be accessible
   **/
  readonly serverId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of public key names to public key configurations enabling SSH key management for user authentication. Provides centralized public key management for secure, password-less authentication across SFTP users.
   *
   * Use cases: SSH key management; Centralized authentication configuration; Public key organization and reuse
   *
   * AWS: AWS Transfer Family public key configuration for SSH authentication and key management
   *
   * Validation: Must be object with string keys and valid PublicKeyConfig values; required; defines authentication keys
   *   **/
  readonly publicKeys: { [key: string]: PublicKeyConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of bucket names to bucket configurations enabling S3 storage management for SFTP operations. Provides centralized bucket configuration for user home directories with encryption and access control settings.
   *
   * Use cases: S3 storage configuration; Home directory management; Centralized bucket settings and encryption
   *
   * AWS: Amazon S3 bucket configuration for Transfer Family user storage and file management
   *
   * Validation: Must be object with string keys and valid BucketConfig values; required; defines storage configuration
   *   **/
  readonly buckets: { [key: string]: BucketConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of user names to user configurations enabling SFTP user management and provisioning. Provides complete user setup with authentication, storage access, and directory configuration for secure file transfer operations.
   *
   * Use cases: SFTP user provisioning; Access control management; User-specific configuration and permissions
   *
   * AWS: AWS Transfer Family user configuration for complete user management and access control
   *
   * Validation: Must be object with string keys and valid UserConfig values; required; defines all user configurations
   *   **/
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
