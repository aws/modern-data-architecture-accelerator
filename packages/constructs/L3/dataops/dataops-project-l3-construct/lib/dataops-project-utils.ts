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
    /**
     * Q-ENHANCED-PROPERTY
     * Required DataOps project name for SSM parameter organization and project-scoped resource management. Provides project-specific namespace for SSM parameters enabling organized parameter storage and cross-service project identification.
     *
     * Use cases: Project parameter organization; Cross-service identification; Project-scoped configuration; Parameter namespace management
     *
     * AWS: SSM parameter path prefix for DataOps project-specific parameter organization
     *
     * Validation: Must be valid project name string; required; used for SSM parameter path construction
     */
    projectName: string,
    /**
     * Q-ENHANCED-PROPERTY
     * Required SSM parameter key for project-specific configuration storage and retrieval enabling organized parameter management. Provides the parameter key within the project namespace for storing configuration values and enabling cross-service parameter access.
     *
     * Use cases: Configuration storage; Parameter identification; Cross-service access; Project configuration management
     *
     * AWS: SSM parameter key for DataOps project-specific configuration storage and retrieval
     *
     * Validation: Must be valid parameter key string; required; used for SSM parameter identification within project namespace
     */
    key: string,
    /**
     * Q-ENHANCED-PROPERTY
     * Required SSM parameter value for project configuration data storage enabling configuration management and cross-service data sharing. Provides the configuration value to be stored in the project-scoped SSM parameter for operational and configuration purposes.
     *
     * Use cases: Configuration data storage; Cross-service data sharing; Project configuration; Operational parameters
     *
     * AWS: SSM parameter value for DataOps project configuration data storage and management
     *
     * Validation: Must be valid parameter value string; required; stored as project-scoped configuration data
     */
    value: string,
  ) {
    const ssmPath = naming.ssmPath(`${projectName}/${key}`, false, false);
    console.log(`Creating Project SSM Param: ${ssmPath}`);
    new MdaaStringParameter(scope, `${projectName}/${key}`, {
      parameterName: ssmPath,
      stringValue: value,
    });
  }
}
