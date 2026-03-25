/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaConfigValueTransformer } from '@aws-mdaa/config';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

export class MdaaOrgDomainEnvConfigValueTransformer implements IMdaaConfigValueTransformer {
  naming: IMdaaResourceNaming;

  constructor(naming: IMdaaResourceNaming) {
    this.naming = naming;
  }

  public transformValue(value: string): string {
    if (value.startsWith('ssm-org:')) {
      return `{{resolve:ssm:${this.naming.ssmOrgPath(value.replace(/^ssm-org:\s*/, ''), false)}}}`;
    }
    if (value.startsWith('ssm-domain:')) {
      return `{{resolve:ssm:${this.naming.ssmDomainPath(value.replace(/^ssm-domain:\s*/, ''), false)}}}`;
    }
    if (value.startsWith('ssm-env:')) {
      return `{{resolve:ssm:${this.naming.ssmEnvPath(value.replace(/^ssm-env:\s*/, ''), false)}}}`;
    }
    return value;
  }
}
