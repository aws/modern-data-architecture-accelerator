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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataSync location management organized by storage type enabling data source and destination configuration. Provides type-specific location configuration for different storage systems including S3, SMB, NFS, and object storage for flexible data movement operations.
 *
 * Use cases: Multi-protocol data source configuration; Storage type organization; location management
 *
 * AWS: Configures AWS DataSync locations for different storage types and protocols for data movement operations
 *
 * Validation: All properties are optional; each must be valid location configuration map if provided
 */
export interface LocationsByTypeConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of S3 location names to S3 location configurations enabling cloud-native data storage integration. Provides S3 bucket and prefix configuration for cloud data movement operations with encryption and access control capabilities.
   *
   * Use cases: S3 data integration; Cloud storage operations; Encrypted data movement; Cloud-to-cloud data synchronization
   *
   * AWS: AWS DataSync S3 locations for cloud storage integration and data movement
   *
   * Validation: Must be object with string keys and valid LocationS3Props values if provided; defines S3 storage locations
   *   **/
  readonly s3?: { [name: string]: LocationS3Props };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of SMB location names to SMB share configurations enabling Windows file share integration. Provides SMB/CIFS protocol support for Windows-based file systems and network attached storage integration.
   *
   * Use cases: Windows file share integration; SMB/CIFS protocol support; Network attached storage connectivity
   *
   * AWS: AWS DataSync SMB locations for Windows file share integration and SMB protocol support
   *
   * Validation: Must be object with string keys and valid LocationSmbProps values if provided; defines SMB share locations
   *   **/
  readonly smb?: { [name: string]: LocationSmbProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of NFS location names to NFS mount configurations enabling Unix/Linux file system integration. Provides NFS protocol support for Unix-based file systems and network file system connectivity.
   *
   * Use cases: Unix/Linux file system integration; NFS protocol support; Network file system connectivity
   *
   * AWS: AWS DataSync NFS locations for Unix file system integration and NFS protocol support
   *
   * Validation: Must be object with string keys and valid LocationNfsProps values if provided; defines NFS mount locations
   *   **/
  readonly nfs?: { [name: string]: LocationNfsProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of object storage location names to object storage configurations enabling S3-compatible storage integration. Provides support for S3-compatible object storage systems and third-party cloud storage services.
   *
   * Use cases: S3-compatible storage integration; Third-party cloud storage; Object storage protocol support
   *
   * AWS: AWS DataSync object storage locations for S3-compatible storage integration and connectivity
   *
   * Validation: Must be object with string keys and valid LocationObjectStorageProps values if provided; defines object storage locations
   *   **/
  readonly objectStorage?: { [name: string]: LocationObjectStorageProps };
}

export interface DataSyncConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC configuration for DataSync agent deployment enabling secure network connectivity and private data transfer operations. Provides VPC networking setup for agents requiring private network access to on-premises or VPC-based storage systems.
   *
   * Use cases: Private network connectivity; Secure data transfer; VPC-based agent deployment for on-premises integration
   *
   * AWS: Amazon VPC configuration for DataSync agent networking and private connectivity
   *
   * Validation: Must be valid VpcProps if provided; enables VPC networking for DataSync agents and secure connectivity
   **/
  readonly vpc?: VpcProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of agent names to DataSync agent configurations enabling on-premises and hybrid connectivity. Provides agent deployment for connecting on-premises storage systems to AWS for data movement and synchronization operations.
   *
   * Use cases: On-premises connectivity; Hybrid data movement; Agent-based data transfer for local storage systems
   *
   * AWS: AWS DataSync agents for on-premises and hybrid storage connectivity and data movement
   *
   * Validation: Must be object with string keys and valid AgentProps values if provided; defines agent deployment configuration
   *   **/
  readonly agents?: { [name: string]: AgentProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional location configuration organized by storage type enabling data source and destination management. Provides structured location configuration for different storage protocols and systems for flexible data movement operations.
   *
   * Use cases: Multi-protocol location management; Storage system integration; data source configuration
   *
   * AWS: AWS DataSync locations for various storage types and protocols for data movement operations
   *
   * Validation: Must be valid LocationsByTypeConfig if provided; defines all storage location configurations by type
   *   **/
  readonly locations?: LocationsByTypeConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of task names to DataSync task configurations enabling automated data transfer and synchronization workflows. Provides task configuration for scheduled and on-demand data movement between configured locations with filtering and scheduling capabilities.
   *
   * Use cases: Automated data transfer; Scheduled synchronization; Data movement workflow management
   *
   * AWS: AWS DataSync tasks for automated data transfer and synchronization between storage locations
   *
   * Validation: Must be object with string keys and valid TaskProps values if provided; defines data transfer task configuration
   *   **/
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
