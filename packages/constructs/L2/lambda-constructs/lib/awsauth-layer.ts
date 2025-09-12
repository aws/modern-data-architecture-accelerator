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
export class MdaaAwsAuthLayerVersion extends MdaaPythonRequirementsLayerVersion {
  private static setAwsAuthProps(props: MdaaConstructProps): MdaaPythonRequirementsLayerVersionProps {
    const overrideProps = {
      pythonRequirementsPath: `${__dirname}/../src/awsauth-layer/requirements.txt`,
      layerVersionName: 'awsauth',
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaConstructProps) {
    super(scope, id, MdaaAwsAuthLayerVersion.setAwsAuthProps(props));
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
