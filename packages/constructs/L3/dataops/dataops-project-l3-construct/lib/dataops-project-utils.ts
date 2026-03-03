/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import { Construct } from 'constructs';

export class DataOpsProjectUtils {
  public static createProjectSSMParam(
    scope: Construct,
    naming: IMdaaResourceNaming,
    projectName: string,
    key: string,
    value: string,
    id?: string,
    description?: string,
  ): MdaaStringParameter {
    const ssmPath = naming.ssmPath(`${projectName}/${key}`, false, false);
    console.log(`Creating Project SSM Param: ${ssmPath}`);
    return new MdaaStringParameter(scope, id ?? `${projectName}/${key}`, {
      parameterName: ssmPath,
      stringValue: value,
      description: description,
    });
  }
}
