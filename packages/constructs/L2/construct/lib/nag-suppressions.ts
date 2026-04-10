/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Stack } from 'aws-cdk-lib';
import { NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';
import * as path from 'node:path';

export interface NagSuppressionConfig {
  /** CDK Nag rule identifier for specific security rule suppression targeting */
  readonly id: string;
  /** Justification for security rule suppression providing detailed explanation for compliance and audit purposes */
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
      .replace(/.*@aws-mdaa/, '@aws-mdaa') //NOSONAR
      .replace(/:\d+:\d+$/, ''); // Strip line:col for stable nag suppression reasons
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
    const configFileName = configFilePath ? path.relative(process.cwd(), path.resolve(configFilePath)) : configFilePath;
    const suppressionsWithSource = suppressions.map(x => {
      return {
        ...x,
        reason: `[CONFIG:${configFileName}] ${x.reason}`,
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
