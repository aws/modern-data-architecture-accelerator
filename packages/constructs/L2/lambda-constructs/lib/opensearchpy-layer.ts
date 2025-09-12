/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import {
  MdaaPythonRequirementsLayerVersion,
  MdaaPythonRequirementsLayerVersionProps,
} from './python-requirements-layer';

/**
 * Construct for creating a Boto3 Lambda Layer
 */
export class MdaaOpensearchPyLayerVersion extends MdaaPythonRequirementsLayerVersion {
  private static setOpensearchPyProps(props: MdaaConstructProps): MdaaPythonRequirementsLayerVersionProps {
    const overrideProps = {
      pythonRequirementsPath: `${__dirname}/../src/opensearchpy-layer/requirements.txt`,
      layerVersionName: 'opensarchpy',
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaConstructProps) {
    super(scope, id, MdaaOpensearchPyLayerVersion.setOpensearchPyProps(props));
    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'layer-version',
        name: 'arn',
        value: this.layerVersionArn,
        ...props,
      },
      scope,
    );
  }
}
