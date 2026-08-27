/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import { Construct } from 'constructs';

export class DataOpsProjectUtils {
  /**
   * SSM key (relative to a dataops project) under which a SMUS/DataZone-integrated
   * dataops-project publishes its DataZone project ID. Sibling modules (e.g.
   * dataops-job) read this key to associate their resources with the SMUS project.
   * Kept here so the write (dataops-project) and the read (dataops-job) share a
   * single source of truth for the parameter layout.
   */
  public static readonly SAGEMAKER_PROJECT_ID_KEY = 'sagemaker/project/id/default';

  /**
   * Build the SSM parameter path for a value published under a dataops project, as
   * read by a sibling module. Centralizes the cross-module naming convention so
   * readers don't hand-construct another module's SSM layout inline.
   */
  public static projectSSMParamPath(naming: IMdaaResourceNaming, projectName: string, key: string): string {
    return naming.ssmPath(`${projectName}/${key}`, false, false);
  }

  public static createProjectSSMParam(
    scope: Construct,
    naming: IMdaaResourceNaming,
    projectName: string,
    key: string,
    value: string,
    id?: string,
    description?: string,
  ): MdaaStringParameter {
    const ssmPath = DataOpsProjectUtils.projectSSMParamPath(naming, projectName, key);
    console.log(`Creating Project SSM Param: ${ssmPath}`);
    return new MdaaStringParameter(scope, id ?? `${projectName}/${key}`, {
      parameterName: ssmPath,
      stringValue: value,
      description: description,
    });
  }
}
