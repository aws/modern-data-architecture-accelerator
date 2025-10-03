/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import { ProductStack } from 'aws-cdk-lib/aws-servicecatalog';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
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

export interface MdaaProductStackProps extends MdaaStackProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required module name for Service Catalog product identification and naming scope definition. Provides module-specific naming context for Service Catalog products and enables organized product deployment with consistent naming patterns.
   *
   * Use cases: Module identification; Product naming; Service Catalog organization; Deployment scoping
   *
   * AWS: Service Catalog product naming and module-specific resource organization
   *
   * Validation: Must be valid module name string; required; used for product naming and resource scoping
   **/
  readonly moduleName: string;
}

export class MdaaStack extends Stack {
  public props: MdaaStackProps;
  public readonly roleHelper: MdaaRoleHelper;
  constructor(scope: Construct, id: string, props: MdaaStackProps) {
    super(scope, id, props);
    this.props = props;
    const iamHelperProviderServiceToken = this.props.useBootstrap
      ? StringParameter.valueForStringParameter(
          this,
          this.props.naming.ssmPath(`caef-bootstrap/role-helper-service-token`, false, false),
        )
      : undefined;
    this.roleHelper = new MdaaRoleHelper(this, this.props.naming, iamHelperProviderServiceToken);
  }
}

export class MdaaProductStack extends ProductStack {
  public props: MdaaStackProps;
  public readonly roleHelper: MdaaRoleHelper;
  constructor(scope: Construct, id: string, props: MdaaProductStackProps) {
    super(scope, id);
    new CfnParameter(this, 'PROVISIONEDID', {
      description: 'A unique id for the deployed product instance.',
      /**
       * Q-ENHANCED-PROPERTY
       * Required regular expression pattern for CloudFormation parameter validation ensuring alphanumeric characters only. Defines the allowed character pattern for the provisioned product ID parameter enabling input validation and preventing invalid characters in resource naming.
       *
       * Use cases: Input validation; Parameter constraints; Resource naming validation; Character restriction enforcement
       *
       * AWS: CloudFormation parameter allowed pattern for input validation and constraint enforcement
       *
       * Validation: Must be valid regex pattern; required for parameter input validation; restricts to word characters only
       */
      allowedPattern: '\\w+',
      constraintDescription: 'Should contain only alpha-numeric characters.',
      /**
       * Q-ENHANCED-PROPERTY
       * Required minimum length constraint for CloudFormation parameter ensuring adequate identifier length for unique product identification. Defines the minimum character count for the provisioned product ID parameter enabling proper identification and preventing overly short identifiers.
       *
       * Use cases: Identifier length validation; Uniqueness assurance; Parameter constraints; Minimum length enforcement
       *
       * AWS: CloudFormation parameter minimum length constraint for input validation and identifier adequacy
       *
       * Validation: Must be positive integer; required for parameter length validation; ensures minimum identifier length
       */
      minLength: 2,
      /**
       * Q-ENHANCED-PROPERTY
       * Required maximum length constraint for CloudFormation parameter preventing excessively long identifiers that could cause resource naming issues. Defines the maximum character count for the provisioned product ID parameter enabling resource name compatibility and preventing naming conflicts.
       *
       * Use cases: Length limitation; Resource naming compatibility; Parameter constraints; Maximum length enforcement
       *
       * AWS: CloudFormation parameter maximum length constraint for input validation and resource naming compatibility
       *
       * Validation: Must be positive integer; required for parameter length validation; ensures maximum identifier length compatibility
       */
      maxLength: 64,
    });
    this.props = {
      useBootstrap: props.useBootstrap,
      naming: props.naming.withModuleName(`${props.moduleName}-__PROVISIONED_ID__`),
    };
    const iamHelperProviderServiceToken = this.props.useBootstrap
      ? StringParameter.valueForStringParameter(
          this,
          this.props.naming.ssmPath(`caef-bootstrap/role-helper-service-token`, false, false),
        )
      : undefined;
    this.roleHelper = new MdaaRoleHelper(this, this.props.naming, iamHelperProviderServiceToken);
  }
}
