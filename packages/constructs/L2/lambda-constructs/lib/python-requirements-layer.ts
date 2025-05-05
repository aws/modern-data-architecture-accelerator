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
