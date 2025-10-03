/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { LayerVersion, LayerVersionProps } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { MdaaPythonCodeAsset, PythonVersion } from './code-asset';

export interface MdaaPythonRequirementsLayerVersionProps extends MdaaConstructProps {
  readonly pythonRequirementsPath: string;
  readonly layerVersionName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Python version specification for dependency compatibility and runtime alignment. Determines the Python runtime version for package compilation and ensures compatibility with target Lambda function runtimes.
   *
   * Use cases: Runtime compatibility; Python version alignment; Package compilation; Dependency compatibility
   *
   * AWS: Python runtime version for Lambda layer package compilation and compatibility
   *
   * Validation: Must be valid PythonVersion enum if provided; defaults to compatible Python version
   *   **/
  readonly pythonVersion?: PythonVersion;
}

/**
 * Construct for creating a PythonRequirements Lambda Layer
 */
export class MdaaPythonRequirementsLayerVersion extends LayerVersion {
  private static setProps(
    props: MdaaPythonRequirementsLayerVersionProps,
    id: string,
    scope: Construct,
  ): LayerVersionProps {
    const codeAsset = new MdaaPythonCodeAsset(scope, `${id}-python-code-asset`, {
      pythonRequirementsPath: props.pythonRequirementsPath,
      pythonVersion: props.pythonVersion,
    });
    const overrideProps = {
      layerVersionName: props.naming.resourceName(props.layerVersionName),
      code: codeAsset.code,
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaPythonRequirementsLayerVersionProps) {
    super(scope, id, MdaaPythonRequirementsLayerVersion.setProps(props, id, scope));
  }
}
