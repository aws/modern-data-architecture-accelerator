/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAspect } from 'aws-cdk-lib';

import { IConstruct } from 'constructs';
import { ConfigurationElement } from '@aws-mdaa/config';

export class SampleCustomAspect implements IAspect {
  constructor(_props: ConfigurationElement) {
    console.log(_props);
  }

  public visit(_construct: IConstruct): void {
    console.log(`visiting construct: ${_construct}`);
  }
}
