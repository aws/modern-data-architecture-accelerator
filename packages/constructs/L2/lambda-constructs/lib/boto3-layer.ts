/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { LayerVersion, LayerVersionProps } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { MdaaPythonCodeAsset } from './code-asset';

interface MdaaBoto3LayerVersionProps extends MdaaConstructProps {
  readonly layerPath?: string;
}

/**
 * Construct for creating a Boto3 Lambda Layer
 */
export class MdaaBoto3LayerVersion extends LayerVersion {
  private static setProps(props: MdaaBoto3LayerVersionProps, scope: Construct): LayerVersionProps {
    const codeAsset = new MdaaPythonCodeAsset(scope, 'python-code-asset', {
      pythonRequirementsPath: `${__dirname}/../src/boto3-layer/requirements.txt`,
    });
    const overrideProps = {
      layerVersionName: props.naming.resourceName(`boto3`),
      code: codeAsset.code,
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaConstructProps) {
    super(scope, id, MdaaBoto3LayerVersion.setProps(props, scope));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'layer-version',
          name: 'arn',
          value: this.layerVersionArn,
        },
        ...props,
      },
      scope,
    );
  }
}
