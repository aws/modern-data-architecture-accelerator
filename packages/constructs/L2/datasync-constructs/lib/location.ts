/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import {
  CfnLocationSMB,
  CfnLocationSMBProps,
  CfnLocationS3,
  CfnLocationS3Props,
  CfnLocationObjectStorage,
  CfnLocationObjectStorageProps,
} from 'aws-cdk-lib/aws-datasync';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface MdaaDataSyncSmbLocationProps extends MdaaConstructProps {
  readonly locationName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of DataSync agent ARNs for SMB location access enabling secure connection to SMB file systems. Provides the agents that will handle data transfer operations between AWS and the SMB file server with proper authentication and network connectivity.
   *
   * Use cases: Agent assignment; SMB connectivity; Data transfer operations; Network access management
   *
   * AWS: AWS DataSync agent ARNs for SMB location access and data transfer operations
   *
   * Validation: Must be array of valid agent ARNs; required; enables SMB file system connectivity and data transfer
   **/
  readonly agentArns: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret name containing SMB credentials for secure authentication to the SMB file server. Provides secure storage and retrieval of SMB user credentials including username and password for authenticated file system access.
   *
   * Use cases: Secure authentication; Credential management; SMB access control; Secrets management integration
   *
   * AWS: AWS Secrets Manager secret for SMB authentication credentials and secure file system access
   *
   * Validation: Must be valid secret name; required; secret must contain 'user' and 'password' fields
   **/
  readonly secretName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required SMB server hostname or IP address for network connectivity enabling DataSync agent connection to the SMB file system. Provides the network endpoint for SMB file server access and data transfer operations.
   *
   * Use cases: Network connectivity; SMB server access; File system mounting; Network endpoint specification
   *
   * AWS: SMB server hostname for DataSync agent connectivity and file system access
   *
   * Validation: Must be DNS-compliant hostname or IPv4 address; required; enables SMB server connectivity
   **/
  readonly serverHostname: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required subdirectory path within the SMB file system for data transfer scope definition. Specifies the exact path within the SMB share where data will be read from or written to for targeted data transfer operations.
   *
   * Use cases: Data transfer scope; Path specification; File system navigation; Transfer target definition
   *
   * AWS: SMB subdirectory path for data transfer scope and file system access control
   *
   * Validation: Must be valid path with forward slashes; required; defines data transfer scope within SMB share
   **/
  readonly subdirectory: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Windows domain name for SMB server authentication enabling domain-based access control. Provides domain authentication context for SMB file server access when the server is part of a Windows domain environment.
   *
   * Use cases: Domain authentication; Windows domain integration; Enterprise authentication; Domain-based access control
   *
   * AWS: Windows domain name for SMB server domain authentication and access control
   *
   * Validation: Must be valid Windows domain name if provided; enables domain-based SMB authentication
   **/
  readonly domain?: string;
  readonly mountOptions?: CfnLocationSMB.MountOptionsProperty | IResolvable;
}

export interface MdaaDataSyncS3LocationProps extends MdaaConstructProps {
  readonly locationName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket ARN for data transfer destination or source specification. Defines the specific S3 bucket where data will be transferred to or from for cloud storage integration and data movement operations.
   *
   * Use cases: S3 bucket specification; Data transfer target; Cloud storage integration; Bucket access definition
   *
   * AWS: Amazon S3 bucket ARN for DataSync location target and data transfer operations
   *
   * Validation: Must be valid S3 bucket ARN; required; follows AWS ARN pattern for S3 buckets
   **/
  readonly s3BucketArn: string;
  readonly s3Config: CfnLocationS3.S3ConfigProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 storage class for cost optimization and data lifecycle management when used as transfer destination. Enables selection of appropriate storage class for cost optimization based on data access patterns and retention requirements.
   *
   * Use cases: Cost optimization; Storage class selection; Data lifecycle management; Performance optimization
   *
   * AWS: Amazon S3 storage class for cost optimization and data lifecycle management
   *
   * Validation: Must be valid S3 storage class if provided; enables cost optimization and lifecycle management
   **/
  readonly s3StorageClass?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional subdirectory path within the S3 bucket for targeted data transfer operations. Specifies the exact prefix within the S3 bucket where data will be transferred for organized data management and transfer scope control.
   *
   * Use cases: Data organization; Transfer scope control; Prefix specification; Organized data management
   *
   * AWS: S3 subdirectory prefix for organized data transfer and bucket organization
   *
   * Validation: Must be valid path with forward slashes if provided; defines transfer scope within S3 bucket
   **/
  readonly subdirectory?: string;
}

export interface MdaaDataSyncObjectStorageLocationProps extends MdaaConstructProps {
  readonly locationName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of DataSync agent ARNs for object storage location access enabling secure connection to object storage systems. Provides the agents that will handle data transfer operations between AWS and the object storage server with proper authentication and network connectivity.
   *
   * Use cases: Agent assignment; Object storage connectivity; Data transfer operations; Network access management
   *
   * AWS: AWS DataSync agent ARNs for object storage location access and data transfer operations
   *
   * Validation: Must be array of valid agent ARNs; required; enables object storage connectivity and data transfer
   **/
  readonly agentArns: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required object storage bucket name for data transfer target specification. Defines the specific bucket within the object storage system where data will be transferred to or from for storage integration and data movement operations.
   *
   * Use cases: Bucket specification; Data transfer target; Storage integration; Object storage access definition
   *
   * AWS: Object storage bucket name for DataSync location target and data transfer operations
   *
   * Validation: Must be valid bucket name string; required; defines target bucket for data transfer operations
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required object storage server hostname or IP address for network connectivity enabling DataSync agent connection to the object storage system. Provides the network endpoint for object storage server access and data transfer operations.
   *
   * Use cases: Network connectivity; Object storage server access; Storage system mounting; Network endpoint specification
   *
   * AWS: Object storage server hostname for DataSync agent connectivity and storage system access
   *
   * Validation: Must be valid hostname or IP address; required; enables object storage server connectivity
   **/
  readonly serverHostname: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret name containing object storage credentials for secure authentication. Provides secure storage and retrieval of object storage access credentials including access key and secret key for authenticated storage system access.
   *
   * Use cases: Secure authentication; Credential management; Storage access control; Secrets management integration
   *
   * AWS: AWS Secrets Manager secret for object storage authentication credentials and secure system access
   *
   * Validation: Must be valid secret name; required; secret must contain 'accessKey' and 'secretKey' fields
   **/
  readonly secretName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional server port for object storage connectivity enabling custom port configuration for different storage systems. Provides flexibility for connecting to object storage systems using non-standard ports for network configuration and security requirements.
   *
   * Use cases: Custom port configuration; Network configuration; Security requirements; Non-standard port connectivity
   *
   * AWS: Object storage server port for DataSync connectivity and network configuration
   *
   * Validation: Must be valid port number if provided; enables custom port configuration for storage connectivity
   **/
  readonly serverPort?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional server protocol specification for object storage communication enabling HTTP or HTTPS connectivity. Provides protocol selection for secure or standard communication with the object storage system based on security requirements and system capabilities.
   *
   * Use cases: Protocol selection; Security configuration; Communication method; Encryption in transit
   *
   * AWS: Object storage server protocol for DataSync communication and security configuration
   *
   * Validation: Must be valid protocol (HTTP/HTTPS) if provided; enables secure communication configuration
   **/
  readonly serverProtocol?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional object prefix for targeted data transfer operations within the object storage bucket. Specifies the exact prefix within the bucket where data will be transferred for organized data management and transfer scope control.
   *
   * Use cases: Data organization; Transfer scope control; Prefix specification; Organized data management
   *
   * AWS: Object storage subdirectory prefix for organized data transfer and bucket organization
   *
   * Validation: Must be valid path if provided; defines transfer scope within object storage bucket
   **/
  readonly subdirectory?: string;
}

/**
 * Reusable CDK construct for a compliant DataSync configuration.
 * Specifically, enforces VPC configuration, logging, and security policy
 */
export class MdaaDataSyncSmbLocation extends CfnLocationSMB {
  /** Overrides specific compliance-related properties. */
  private static setProps(scope: Construct, props: MdaaDataSyncSmbLocationProps): CfnLocationSMBProps {
    const getSecret = Secret.fromSecretNameV2(scope, `${props.locationName}-smb-secret`, props.secretName);
    const getSecretValueUser = getSecret.secretValueFromJson('user');
    const getSecretValuePassword = getSecret.secretValueFromJson('password');

    const overrideProps = {
      password: getSecretValuePassword.unsafeUnwrap(),
      user: getSecretValueUser.unsafeUnwrap(),
    };

    const allProps: CfnLocationSMBProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaDataSyncSmbLocationProps) {
    super(scope, id, MdaaDataSyncSmbLocation.setProps(scope, props));

    if (this.serverHostname) {
      new MdaaParamAndOutput(this, {
        ...{
          resourceType: 'location-smb',
          resourceId: props.locationName,
          name: 'server-hostname',
          value: this.serverHostname,
        },
        ...props,
      });
    }
    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'location-smb',
        resourceId: props.locationName,
        name: 'arn',
        value: this.attrLocationArn,
      },
      ...props,
    });
  }
}

export class MdaaDataSyncS3Location extends CfnLocationS3 {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaDataSyncS3LocationProps): CfnLocationS3Props {
    const overrideProps = {
      s3Config: props.s3Config,
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaDataSyncS3LocationProps) {
    super(scope, id, MdaaDataSyncS3Location.setProps(props));

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'location-s3',
        resourceId: props.locationName,
        name: 'arn',
        value: this.attrLocationArn,
      },
      ...props,
    });
  }
}

export class MdaaDataSyncObjectStorageLocation extends CfnLocationObjectStorage {
  /** Overrides specific compliance-related properties. */
  private static setProps(
    scope: Construct,
    props: MdaaDataSyncObjectStorageLocationProps,
  ): CfnLocationObjectStorageProps {
    const secret = Secret.fromSecretNameV2(scope, `${props.locationName}-objectstorage-secret`, props.secretName);
    const secretValueAccess = secret.secretValueFromJson('accessKey');
    const secretValueSecret = secret.secretValueFromJson('secretKey');

    const overrideProps = {
      accessKey: secretValueAccess.unsafeUnwrap(),
      secretKey: secretValueSecret.unsafeUnwrap(),
    };

    const allProps: CfnLocationObjectStorageProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaDataSyncObjectStorageLocationProps) {
    super(scope, id, MdaaDataSyncObjectStorageLocation.setProps(scope, props));

    if (this.serverHostname) {
      new MdaaParamAndOutput(this, {
        ...{
          resourceType: 'location-object-storage',
          resourceId: props.locationName,
          name: 'server-hostname',
          value: this.serverHostname,
        },
        ...props,
      });
    }

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'location-object-storage',
        resourceId: props.locationName,
        name: 'arn',
        value: this.attrLocationArn,
      },
      ...props,
    });
  }
}
