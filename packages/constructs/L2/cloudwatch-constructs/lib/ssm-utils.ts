/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Construct } from 'constructs';

/**
 * Create an SSM parameter with CDK-NAG suppression.
 * This utility function encapsulates the common pattern of creating an SSM parameter
 * and adding a CDK-NAG suppression for AwsSolutions-SSM4.
 *
 * @param construct - The construct to create the parameter in
 * @param scope - The scope for the parameter
 * @param paramConfig - Configuration for the MdaaParamAndOutput
 * @param suppressionReason - Reason for the CDK-NAG suppression
 */
export function createSsmParamWithSuppression(
  construct: Construct,
  scope: Construct,
  paramConfig: {
    resourceType: string;
    resourceId: string;
    name: string;
    value: string;
    naming: IMdaaResourceNaming;
    createOutputs: boolean;
    createParams: boolean;
  },
  suppressionReason: string,
): void {
  const param = new MdaaParamAndOutput(construct, paramConfig, scope);

  if (param.param) {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      param.param,
      [
        {
          id: 'AwsSolutions-SSM4',
          reason: suppressionReason,
        },
      ],
      true,
    );
  }
}
