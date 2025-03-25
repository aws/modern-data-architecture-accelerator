/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct';
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
  /**
   * MDAA internal attribute to get the unique location name
   */
  readonly locationName: string;
  /**
   * The Amazon Resource Names (ARNs) of agents to use for a Server Message Block (SMB) location.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-agentarns
   */
  readonly agentArns: string[];
  /**
   * The name of the secret in Secrets Manager that stores the credential (domain, user and password) of the user in SMB File Server that can mount the share and has the permissions to access files and folders in the SMB share.
   *
   * The secret must have "user" and "password" fields.
   *
   * For example (in JSON format): {"user":"<username>","password":"<password>"}
   *
   */
  readonly secretName: string;
  /**
   * The name of the SMB server. This value is the IP address or Domain Name Service (DNS) name of the SMB server. An agent that is installed on-premises uses this hostname to mount the SMB server in a network.
   *
   * > This name must either be DNS-compliant or must be an IP version 4 (IPv4) address.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-serverhostname
   */
  readonly serverHostname: string;
  /**
   * The subdirectory in the SMB file system that is used to read data from the SMB source location or write data to the SMB destination. The SMB path should be a path that's exported by the SMB server, or a subdirectory of that path. The path should be such that it can be mounted by other SMB clients in your network.
   *
   * > `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder` .
   *
   * To transfer all the data in the folder you specified, DataSync must have permissions to mount the SMB share, as well as to access all the data in that share. To ensure this, either make sure that the user name and password specified belongs to the user who can mount the share, and who has the appropriate permissions for all of the files and directories that you want DataSync to access, or use credentials of a member of the Backup Operators group to mount the share. Doing either one enables the agent to access the data. For the agent to access directories, you must additionally enable all execute access.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-subdirectory
   */
  readonly subdirectory: string;
  /**
   * The name of the Windows domain that the SMB server belongs to.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-domain
   */
  readonly domain?: string;
  /**
   * The mount options used by DataSync to access the SMB server.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-mountoptions
   */
  readonly mountOptions?: CfnLocationSMB.MountOptionsProperty | IResolvable;
}

export interface MdaaDataSyncS3LocationProps extends MdaaConstructProps {
  /**
   * MDAA internal attribute to get the unique location name
   */
  readonly locationName: string;
  /**
   * The ARN of the Amazon S3 bucket.
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-s3bucketarn
   */
  readonly s3BucketArn: string;
  /**
   * The Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that is used to access an Amazon S3 bucket.
   *
   * For detailed information about using such a role, see [Creating a Location for Amazon S3](https://docs.aws.amazon.com/datasync/latest/userguide/working-with-locations.html#create-s3-location) in the AWS DataSync User Guide.
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-s3config
   */
  readonly s3Config: CfnLocationS3.S3ConfigProperty | IResolvable;
  /**
   * The Amazon S3 storage class that you want to store your files in when this location is used as a task destination.
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-s3storageclass
   */
  readonly s3StorageClass?: string;
  /**
   * A subdirectory in the Amazon S3 bucket.
   *
   * > `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder` .
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-subdirectory
   */
  readonly subdirectory?: string;
}

export interface MdaaDataSyncObjectStorageLocationProps extends MdaaConstructProps {
  /**
   * MDAA internal attribute to get the unique location name
   */
  readonly locationName: string;
  /**
   * Specifies the Amazon Resource Names (ARNs) of the agents associated with the location.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-agentarns
   */
  readonly agentArns: string[];
  /**
   * Specifies the name of the bucket that DataSync reads from or writes to.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-bucketname
   */
  readonly bucketName: string;
  /**
   * Specifies the domain name or IP address of the object storage server. A DataSync agent uses this hostname to mount the object storage server.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-serverhostname
   */
  readonly serverHostname: string;
  /**
   * The name of the secret in Secrets Manager that stores the credential (accessKey/user name and secretKey) of the object storage server.
   *
   * The secret must have "accessKey" and "secretKey" fields.
   *
   * For example (in JSON format): {"accessKey":"<access_key>","secretKey":"<secret_key>"}
   *
   */
  readonly secretName: string;
  /**
   * Specifies the port that your object storage server accepts inbound network traffic on. Set to port 80 (HTTP), 443 (HTTPS), or a custom port if needed.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-serverport
   */
  readonly serverPort?: number;
  /**
   * Specifies the protocol that your object storage server uses to communicate.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-serverprotocol
   */
  readonly serverProtocol?: string;
  /**
   * Specifies the object prefix that DataSync reads from or writes to.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-subdirectory
   */
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
