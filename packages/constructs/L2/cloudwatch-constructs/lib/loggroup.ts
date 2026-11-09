/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnLogGroup, ILogGroup, LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { buildDataProtectionPolicy, DataProtectionProperty } from './data-protection';
import { updateProps } from './loggroup-utils';

/**
 * PII masking for an {@link MdaaLogGroup}: a CloudWatch Logs data protection policy masking the
 * built-in identifier floor plus any additional identifiers.
 */
export interface MdaaLogGroupDataProtection extends DataProtectionProperty {
  /** The data protection policy `Name`, unique per module (e.g. `bedrock-invocation-data-protection`). */
  readonly policyName: string;
}

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
  /**
   * Masks PII in log events on ingestion with a CloudWatch Logs data protection policy.
   * @default - no data protection policy
   */
  readonly dataProtection?: MdaaLogGroupDataProtection;
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
    if (props.dataProtection) {
      // The L2 dataProtectionPolicy prop takes a DataProtectionPolicy class; the built policy document
      // is set on the L1 resource instead.
      (this.node.defaultChild as CfnLogGroup).dataProtectionPolicy = buildDataProtectionPolicy(
        props.dataProtection.policyName,
        props.dataProtection,
      );
    }
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
