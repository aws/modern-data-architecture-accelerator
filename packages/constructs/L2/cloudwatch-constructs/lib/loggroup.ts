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
            /**
             * Q-ENHANCED-PROPERTY
             * Required CDK Nag rule identifier for CloudWatch log group retention period compliance suppression. Specifies the exact NIST 800-53 R5 security rule being suppressed for log retention configuration enabling compliance exception management and audit documentation.
             *
             * Use cases: Compliance exception management; Security rule suppression; Audit documentation; Log retention policy exceptions
             *
             * AWS: CDK Nag NIST 800-53 R5 rule identifier for CloudWatch log group retention compliance validation
             *
             * Validation: Must be valid CDK Nag rule ID; required for specific security rule suppression targeting
             */
            id: 'NIST.800.53.R5-CloudWatchLogGroupRetentionPeriod',
            /**
             * Q-ENHANCED-PROPERTY
             * Required justification for suppressing CloudWatch log group retention period security rule providing audit trail and compliance documentation. Documents the business reason for using infinite retention enabling compliance review and security audit processes.
             *
             * Use cases: Compliance documentation; Audit justification; Security review; Exception reasoning for infinite retention
             *
             * AWS: CDK Nag suppression reason for CloudWatch log group retention compliance exception documentation
             *
             * Validation: Must be descriptive justification text; required for audit trail and compliance documentation
             */
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
