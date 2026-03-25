/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaConfigValueTransformer } from '@aws-mdaa/config';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

export class MdaaGeneratedRoleConfigValueTransformer implements IMdaaConfigValueTransformer {
  naming: IMdaaResourceNaming;
  constructor(naming: IMdaaResourceNaming) {
    this.naming = naming;
  }
  public transformValue(value: string): string {
    if (value.startsWith('generated-role-id:')) {
      return `ssm:${this.naming.ssmPath(
        'generated-role/' + value.replace(/^generated-role-id:\s*/, '') + '/id',
        false,
      )}`;
    } else if (value.startsWith('generated-role-arn:')) {
      return `ssm:${this.naming.ssmPath(
        'generated-role/' + value.replace(/^generated-role-arn:\s*/, '') + '/arn',
        false,
      )}`;
    } else {
      return value;
    }
  }
}
