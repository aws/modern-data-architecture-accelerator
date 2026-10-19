/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IKey } from 'aws-cdk-lib/aws-kms';
import { ILogGroup, LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { updateProps } from './loggroup-utils';

export interface MdaaLogGroupProps extends MdaaConstructProps {
  readonly encryptionKey: IKey;
  readonly logGroupNamePathPrefix: string;
  readonly logGroupName?: string;
  /**
   * Flag to append `logGroupName` to the path prefix as given, without MDAA naming convention
   * processing. Use when another service owns the name of the group it writes to, such as a Lambda
   * function, which only ever writes to `/aws/lambda/<its function name>`. Requires `logGroupName`.
   */
  readonly verbatimLogGroupName?: boolean;
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
        resourceType: 'loggroup',
        resourceId: props.logGroupName,
        name: 'name',
        value: this.logGroupPhysicalName(),
        ...props,
      },
      scope,
    );
  }
}
