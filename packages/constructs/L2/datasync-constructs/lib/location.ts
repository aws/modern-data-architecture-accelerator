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
  /** Array of DataSync agent ARNs for SMB location access enabling secure connection to SMB file systems */
  readonly agentArns: string[];
  /** Secrets Manager secret name containing SMB credentials for secure authentication to the SMB file server */
  readonly secretName: string;
  /** SMB server hostname or IP address for network connectivity enabling DataSync agent */
  readonly serverHostname: string;
  /** Subdirectory path within the SMB file system for data transfer scope definition */
  readonly subdirectory: string;
  /** Windows domain name for SMB server authentication enabling domain-based access control */
  readonly domain?: string;
  readonly mountOptions?: CfnLocationSMB.MountOptionsProperty | IResolvable;
}

export interface MdaaDataSyncS3LocationProps extends MdaaConstructProps {
  readonly locationName: string;
  /** S3 bucket ARN for data transfer destination or source specification */
  readonly s3BucketArn: string;
  readonly s3Config: CfnLocationS3.S3ConfigProperty | IResolvable;
  /** S3 storage class for cost optimization and data lifecycle management when used as transfer destination */
  readonly s3StorageClass?: string;
  /** Subdirectory path within the S3 bucket for targeted data transfer operations */
  readonly subdirectory?: string;
}

export interface MdaaDataSyncObjectStorageLocationProps extends MdaaConstructProps {
  readonly locationName: string;
  /** Array of DataSync agent ARNs for object storage location access enabling secure connection */
  readonly agentArns: string[];
  /** Object storage bucket name for data transfer target specification */
  readonly bucketName: string;
  /** Object storage server hostname or IP address for network connectivity enabling DataSync */
  readonly serverHostname: string;
  /** Secrets Manager secret name containing object storage credentials for secure authentication */
  readonly secretName: string;
  /** Server port for object storage connectivity enabling custom port configuration for different storage systems */
  readonly serverPort?: number;
  /** Server protocol specification for object storage communication enabling HTTP or HTTPS connectivity */
  readonly serverProtocol?: string;
  /** Object prefix for targeted data transfer operations within the object storage bucket */
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
