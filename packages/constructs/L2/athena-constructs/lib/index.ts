/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct';
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { IMdaaBucket } from '@aws-mdaa/s3-constructs';
import { IResolvable, CfnTag } from 'aws-cdk-lib';
import { CfnWorkGroup, CfnWorkGroupProps } from 'aws-cdk-lib/aws-athena';
import { Construct } from 'constructs';

/**
 * Props for creating a MDAA Athena Workgroup.
 */
export interface MdaaAthenaWorkgroupProps extends MdaaConstructProps {
  /** The KMS CMK to be used to encrypt all Athena query results */
  readonly kmsKey: IMdaaKmsKey;
  /** The S3 Bucket where Athena query results will be stored. */
  readonly bucket: IMdaaBucket;
  /** The S3 prefix under which results will be stored */
  readonly resultsPrefix?: string;
  /**
   * The workgroup name.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-athena-workgroup.html#cfn-athena-workgroup-name
   */
  readonly name?: string;
  /**
   * The workgroup description.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-athena-workgroup.html#cfn-athena-workgroup-description
   */
  readonly description?: string;
  /**
   * The option to delete a workgroup and its contents even if the workgroup contains any named queries. The default is false.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-athena-workgroup.html#cfn-athena-workgroup-recursivedeleteoption
   */
  readonly recursiveDeleteOption?: boolean | IResolvable;
  /**
   * The state of the workgroup: ENABLED or DISABLED.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-athena-workgroup.html#cfn-athena-workgroup-state
   */
  readonly state?: string;
  /**
   * Workgroup Configuration
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-athena-workgroup-workgroupconfiguration.html
   */
  readonly workGroupConfiguration?: MdaaAthenaWorkgroupConfigurationProps;
  /**
   * The tags (key-value pairs) to associate with this resource.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-athena-workgroup.html#cfn-athena-workgroup-tags
   */
  readonly tags?: CfnTag[];
}

export interface MdaaAthenaWorkgroupConfigurationProps {
  /**
   * The upper limit (cutoff) for the amount of bytes a single query in a workgroup is allowed to scan. No default is defined.
   *
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-athena-workgroup-workgroupconfiguration.html#cfn-athena-workgroup-workgroupconfiguration-bytesscannedcutoffperquery
   */
  readonly bytesScannedCutoffPerQuery?: number;
}

/**
 * Reusable CDK construct for a compliant Athena Workgroup.
 * Specifically, enforces KMS and bucket configurations
 * for Athena query results.
 */
export class MdaaAthenaWorkgroup extends CfnWorkGroup {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaAthenaWorkgroupProps): CfnWorkGroupProps {
    const overrideProps = {
      // Add a workgroup name using the MDAA naming implementation.
      name: props.naming.resourceName(props.name),
      // Enforce the workgroup results configuration using the provided KMS key and S3 Bucket.
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        resultConfiguration: {
          encryptionConfiguration: {
            encryptionOption: 'SSE_KMS',
            kmsKey: props.kmsKey.keyArn,
          },
          outputLocation: props.resultsPrefix
            ? `s3://${props.bucket.bucketName}/${props.resultsPrefix}`
            : `s3://${props.bucket.bucketName}/`,
        },
        bytesScannedCutoffPerQuery: props.workGroupConfiguration?.bytesScannedCutoffPerQuery,
      },
    };

    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaAthenaWorkgroupProps) {
    super(scope, id, MdaaAthenaWorkgroup.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'workgroup',
        resourceId: props.name,
        name: 'name',
        value: this.name,
      },
      scope,
    );
  }
}
