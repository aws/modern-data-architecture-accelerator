/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';

export interface NagSuppressionConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CDK Nag rule identifier for specific security rule suppression targeting. Identifies the exact security validation rule to suppress, enabling precise exception management and targeted suppression application.
   *
   * Use cases: Specific rule targeting; Security exception management; Precise suppression control; Rule identification
   *
   * AWS: CDK Nag rule identifier for CloudFormation security validation suppression
   *
   * Validation: Must be valid CDK Nag rule ID; required; identifies specific security rule for suppression
   **/
  readonly id: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required justification for security rule suppression providing detailed explanation for compliance and audit purposes. Documents the business or technical reason for suppressing the security rule, enabling compliance review and audit trail maintenance.
   *
   * Use cases: Compliance documentation; Audit justification; Security review; Exception reasoning
   *
   * AWS: CDK Nag suppression reason for security compliance documentation and audit trails
   *
   * Validation: Must be descriptive justification text; required; provides audit trail for security exceptions
   **/
  readonly reason: string;
}

export class MdaaNagSuppressions {
  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children
   * @param construct The IConstruct(s) to apply the suppression to
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addCodeResourceSuppressions(
    construct: IConstruct,
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const oldLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 2;
    const location = new Error().stack
      ?.split('\n')[2]
      .replace(/.*\(/, '') //NOSONAR
      .replace(/\).*/, '')
      .replace(/.*\/constructs\/L./, '@aws-mdaa') //NOSONAR
      .replace(/.*@aws-mdaa/, '@aws-mdaa'); //NOSONAR
    Error.stackTraceLimit = oldLimit;
    Error.stackTraceLimit = oldLimit;
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[MDAA:${location}] ${x.reason}`,
      };
    });
    NagSuppressions.addResourceSuppressions(construct, suppressionsWithSource, applyToChildren);
  }

  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children
   * @param construct The IConstruct(s) to apply the suppression to
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addConfigResourceSuppressions(
    construct: IConstruct,
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const configFilePath = construct.node.tryGetContext('module_configs');
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[CONFIG:${configFilePath}] ${x.reason}`,
      };
    });
    NagSuppressions.addResourceSuppressions(construct, suppressionsWithSource, applyToChildren);
  }

  /**
   * Add cdk-nag suppressions to a CfnResource and optionally its children via its path
   * @param stack The Stack the construct belongs to
   * @param path The path(s) to the construct in the provided stack
   * @param suppressions A list of suppressions to apply to the resource
   * @param applyToChildren Apply the suppressions to children CfnResources  (default:false)
   */
  static addConfigResourceSuppressionsByPath(
    stack: Stack,
    path: string | string[],
    suppressions: NagPackSuppression[],
    applyToChildren?: boolean,
  ): void {
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[CONFIG] ${x.reason}`,
      };
    });
    NagSuppressions.addResourceSuppressionsByPath(stack, path, suppressionsWithSource, applyToChildren);
  }
}
