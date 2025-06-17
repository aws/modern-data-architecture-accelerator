/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IKey } from 'aws-cdk-lib/aws-kms';
import { ILogGroup, LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { updateProps } from './utils';

export interface MdaaLogGroupProps extends MdaaConstructProps {
  /**
   * The KMS customer managed key to encrypt the log group with.
   *
   * @default Server-side encryption managed by the CloudWatch Logs service
   */
  readonly encryptionKey: IKey;
  /**
   * Path Prefix Name of the log group.
   *
   */
  readonly logGroupNamePathPrefix: string;
  /**
   * Name of the log group.
   *
   * @default Automatically generated
   */
  readonly logGroupName?: string;
  /**
   * How long, in days, the log contents will be retained.
   *
   * To retain all logs, set this value to RetentionDays.INFINITE.
   *
   */
  readonly retention: RetentionDays;
}

/**
 * Interface for IMdaaLogGroup.
 */
export type IMdaaLogGroup = ILogGroup;

/**
 * Construct for a compliant CloudWatch Log Group
 */
export class MdaaLogGroup extends LogGroup implements IMdaaLogGroup {
  constructor(scope: Construct, id: string, props: MdaaLogGroupProps) {
    super(scope, id, updateProps(props));

    if (props.retention == RetentionDays.INFINITE) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        this,
        [
          {
            id: 'NIST.800.53.R5-CloudWatchLogGroupRetentionPeriod',
            reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
          },
          {
            id: 'HIPAA.Security-CloudWatchLogGroupRetentionPeriod',
            reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
          },
          {
            id: 'PCI.DSS.321-CloudWatchLogGroupRetentionPeriod',
            reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
          },
        ],
        true,
      );
    }

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'loggroup',
          resourceId: props.logGroupName,
          name: 'name',
          value: this.logGroupPhysicalName(),
        },
        ...props,
      },
      scope,
    );
  }
}
