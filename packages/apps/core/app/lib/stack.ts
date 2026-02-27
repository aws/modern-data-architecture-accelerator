/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Stack, StackProps } from 'aws-cdk-lib';
import { MdaaStringParameter } from '@aws-mdaa/construct';
import { Construct } from 'constructs';

export interface MdaaStackProps extends StackProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required MDAA resource naming implementation providing consistent naming conventions across all deployed resources. Enables predictable resource naming, cross-stack references, and operational management through standardized naming patterns.
   *
   * Use cases: Resource naming consistency; Cross-stack references; Operational management; Naming standardization
   *
   * AWS: Resource naming conventions for all AWS resources deployed within the MDAA stack
   *
   * Validation: Must be valid IMdaaResourceNaming implementation; required for consistent resource naming
   *   **/
  readonly naming: IMdaaResourceNaming;
  readonly useBootstrap: boolean;
}

export class MdaaStack extends Stack {
  public props: MdaaStackProps;
  public readonly roleHelper: MdaaRoleHelper;
  constructor(scope: Construct, id: string, props: MdaaStackProps) {
    super(scope, id, props);
    this.props = props;
    const iamHelperProviderServiceToken = this.props.useBootstrap
      ? MdaaStringParameter.valueForStringParameter(
          this,
          this.props.naming.ssmPath(`caef-bootstrap/role-helper-service-token`, false, false),
        )
      : undefined;
    this.roleHelper = new MdaaRoleHelper(this, this.props.naming, iamHelperProviderServiceToken);
  }
}
