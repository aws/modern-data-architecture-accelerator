/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  AgentProps,
  AgentWithNameProps,
  LocationNfsProps,
  LocationObjectStorageProps,
  LocationS3Props,
  LocationsByTypeWithNameProps,
  LocationSmbProps,
  TaskProps,
  TaskWithNameProps,
  VpcProps,
} from '@aws-mdaa/datasync-l3-construct';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

/**
 * DataSync location configuration organized by storage protocol type.
 * Each property maps location names to protocol-specific location settings.
 *
 * Use cases: Multi-protocol data source/destination setup; Organizing locations by S3, SMB, NFS, or object storage type
 *
 * AWS: AWS DataSync locations grouped by storage protocol
 *
 * Validation: All properties optional; each must be a valid map of location names to LocationProps
 */
export interface LocationsByTypeConfig {
  /**
   * Map of S3 location names to S3 location configurations.
   * Each entry creates a DataSync S3 location for cloud-native data transfers.
   *
   * Use cases: S3-to-S3 data migration; Cloud storage as transfer source or destination
   *
   * AWS: DataSync LocationS3 resources
   *
   * Validation: Optional; keys are location names, values must be valid LocationS3Props
   */
  readonly s3?: { [name: string]: LocationS3Props };
  /**
   * Map of SMB location names to SMB share configurations.
   * Each entry creates a DataSync SMB location for Windows file share transfers.
   * Credentials must be pre-stored in Secrets Manager.
   *
   * Use cases: Windows file share migration; On-premises NAS data transfer via SMB protocol
   *
   * AWS: DataSync LocationSMB resources
   *
   * Validation: Optional; keys are location names, values must be valid LocationSmbProps
   */
  readonly smb?: { [name: string]: LocationSmbProps };
  /**
   * Map of NFS location names to NFS mount configurations.
   * Each entry creates a DataSync NFS location for Unix/Linux file system transfers.
   *
   * Use cases: Linux NFS export migration; Unix file system data transfer to AWS
   *
   * AWS: DataSync LocationNFS resources
   *
   * Validation: Optional; keys are location names, values must be valid LocationNfsProps
   */
  readonly nfs?: { [name: string]: LocationNfsProps };
  /**
   * Map of object storage location names to S3-compatible object storage configurations.
   * Each entry creates a DataSync object storage location for third-party cloud storage transfers.
   * Credentials must be pre-stored in Secrets Manager.
   *
   * Use cases: Google Cloud Storage to S3 migration; Third-party object storage synchronization
   *
   * AWS: DataSync LocationObjectStorage resources
   *
   * Validation: Optional; keys are location names, values must be valid LocationObjectStorageProps
   */
  readonly objectStorage?: { [name: string]: LocationObjectStorageProps };
}

export interface DataSyncConfigContents extends MdaaBaseConfigContents {
  /**
   * VPC for DataSync agent deployment. MDAA creates a security group with required
   * ingress rules and a VPC endpoint for the DataSync service.
   * Two-stage deployment: first pass creates networking, second pass registers agents.
   *
   * Use cases: Private agent-to-service communication; VPC endpoint automation; Security group creation
   *
   * AWS: VPC, VPC endpoints, security groups for DataSync service
   *
   * Validation: Optional; requires vpcId and vpcCidrBlock
   */
  readonly vpc?: VpcProps;
  /**
   * Map of agent names to DataSync agent configurations.
   * Agents must be deployed (e.g. EC2 with DataSync AMI) before activation.
   * Omit activationKey on first pass to create networking; add it on second pass to register.
   *
   * Use cases: On-premises storage connectivity; Multi-AZ agent resiliency; Two-stage agent activation
   *
   * AWS: DataSync agents for on-premises and hybrid data transfer
   *
   * Validation: Optional; keys are agent names, values must be valid AgentProps
   */
  readonly agents?: { [name: string]: AgentProps };
  /**
   * DataSync locations organized by storage protocol type (S3, SMB, NFS, object storage).
   * Locations serve as source or destination endpoints for DataSync tasks.
   *
   * Use cases: Multi-protocol location setup; Source/destination endpoint configuration
   *
   * AWS: DataSync locations (S3, SMB, NFS, ObjectStorage)
   *
   * Validation: Optional; must be valid LocationsByTypeConfig
   */
  readonly locations?: LocationsByTypeConfig;
  /**
   * Map of task names to DataSync task configurations.
   * Tasks define data transfer operations between source and destination locations
   * with optional scheduling, filtering, and transfer options.
   *
   * Use cases: Scheduled data synchronization; One-time migration; Incremental transfers with filtering
   *
   * AWS: DataSync tasks with CloudWatch logging
   *
   * Validation: Optional; keys are task names, values must be valid TaskProps
   */
  readonly tasks?: { [name: string]: TaskProps };
}

export class DataSyncConfigParser extends MdaaAppConfigParser<DataSyncConfigContents> {
  public readonly vpc?: VpcProps;
  public readonly agents?: AgentWithNameProps[];
  public readonly locations?: LocationsByTypeWithNameProps;
  public readonly tasks?: TaskWithNameProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.vpc = this.configContents.vpc;
    this.agents = Object.entries(this.configContents.agents || {}).map(x => {
      return {
        agentName: x[0],
        ...x[1],
      };
    });

    this.locations = {
      s3: Object.entries(this.configContents.locations?.s3 || {}).map(x => {
        return { locationName: x[0], ...x[1] };
      }),
      smb: Object.entries(this.configContents.locations?.smb || {}).map(x => {
        return { locationName: x[0], ...x[1] };
      }),
      nfs: Object.entries(this.configContents.locations?.nfs || {}).map(x => {
        return { locationName: x[0], ...x[1] };
      }),
      objectStorage: Object.entries(this.configContents.locations?.objectStorage || {}).map(x => {
        return { locationName: x[0], ...x[1] };
      }),
    };

    this.tasks = Object.entries(this.configContents.tasks || {}).map(x => {
      return {
        name: x[0],
        ...x[1],
      };
    });
  }
}
