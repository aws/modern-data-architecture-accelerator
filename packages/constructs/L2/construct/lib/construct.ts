/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Construct } from 'constructs';
import { CfnOutput, Token } from 'aws-cdk-lib';
import { ParameterTier, StringParameter, StringParameterProps } from 'aws-cdk-lib/aws-ssm';

export interface MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required MDAA naming implementation for consistent resource naming across all MDAA constructs enabling standardized naming conventions and operational consistency. Provides the naming strategy that will be applied to all resources created by MDAA constructs for consistent identification and management.
   *
   * Use cases: Consistent naming; Resource identification; Naming conventions; Operational consistency
   *
   * AWS: MDAA resource naming for consistent resource identification and naming convention compliance
   *
   * Validation: Must be valid IMdaaResourceNaming implementation; required for all MDAA construct naming
   *   **/
  readonly naming: IMdaaResourceNaming;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling SSM parameter creation for construct resource references enabling infrastructure integration and cross-stack communication. When enabled, creates SSM parameters for construct resources allowing other stacks and applications to reference deployed resources.
   *
   * Use cases: Infrastructure integration; Cross-stack references; Resource discovery; Parameter management
   *
   * AWS: SSM parameter creation for MDAA construct resource references and infrastructure integration
   *
   * Validation: Boolean value; defaults to true; enables SSM parameter creation for resource references
   **/
  readonly createParams?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling CloudFormation output and stack export creation for construct resources enabling infrastructure integration and external references. When enabled, creates CloudFormation outputs and exports for construct resources allowing external access and integration.
   *
   * Use cases: CloudFormation outputs; Stack exports; External integration; Infrastructure references
   *
   * AWS: CloudFormation outputs and exports for MDAA construct resource references and external integration
   *
   * Validation: Boolean value; defaults to true; enables CloudFormation output and export creation
   **/
  readonly createOutputs?: boolean;
}

export interface MdaaParamAndOutputProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name component for SSM parameter and CloudFormation output naming enabling consistent resource identification and reference management. Provides the primary name component that will be processed through MDAA naming conventions for parameter and output generation.
   *
   * Use cases: Resource naming; Parameter identification; Output naming; Reference management
   *
   * AWS: Name component for SSM parameter and CloudFormation output naming and resource identification
   *
   * Validation: Must be descriptive name string; required; processed through MDAA naming conventions
   **/
  readonly name: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly overrideResourceId?: string;
  /** Will be the value of the SSM Param and Cfn Output */
  readonly value: string;

  readonly tier?: ParameterTier;
}

/** A construct which creates SSM Params and Cfn Outputs/Exports in a standard fashion. */
export class MdaaParamAndOutput extends Construct {
  public static readonly LEGACY_PARAM_SCOPE_CONTEXT_KEY = '@aws-mdaa/legacyParamScope';
  public static readonly SKIP_CREATE_PARAMS = '@aws-mdaa/skipCreateParams';
  public param?: StringParameter;
  public paramName: string;
  private static createId(props: MdaaParamAndOutputProps): string {
    if (props.overrideResourceId) {
      return `${props.resourceType}-${props.overrideResourceId}`;
    }

    const id = props.resourceId
      ? `${props.resourceType}-${props.resourceId}-${props.name}`
      : `${props.resourceType}-${props.name}`;
    return id;
  }

  private static determineScope(thisScope: Construct, legacyScope?: Construct): Construct {
    const contextValue = thisScope.node.tryGetContext(MdaaParamAndOutput.LEGACY_PARAM_SCOPE_CONTEXT_KEY)?.valueOf();
    // nosemgrep
    const useLegacyParamScope = contextValue ? /true/i.test(contextValue) : false;
    return useLegacyParamScope ? legacyScope || thisScope : thisScope;
  }

  constructor(scope: Construct, props: MdaaParamAndOutputProps, legacyScope?: Construct) {
    super(MdaaParamAndOutput.determineScope(scope, legacyScope), MdaaParamAndOutput.createId(props));
    const ssmPath = props.resourceId
      ? `${props.resourceType}/${props.resourceId}/${props.name}`
      : `${props.resourceType}/${props.name}`;
    this.paramName = props.naming.ssmPath(ssmPath);

    const skipCreateParamsContextString = this.node.tryGetContext(MdaaParamAndOutput.SKIP_CREATE_PARAMS);
    const skipCreateParamsContext =
      skipCreateParamsContextString != undefined ? /true/i.test(skipCreateParamsContextString) : undefined;
    const createParamsProps =
      props.createParams == undefined || (props.createParams != undefined && props.createParams.valueOf());
    const createParams = skipCreateParamsContext == undefined || !skipCreateParamsContext ? createParamsProps : false;

    if (createParams) {
      console.log(`Creating SSM Param: ${this.paramName}`);
      this.param = new MdaaStringParameter(this, `ssm`, {
        parameterName: this.paramName,
        stringValue: props.value,
        simpleName: Token.isUnresolved(this.paramName),
        tier: props.tier,
      });
    }

    if (props.createOutputs == undefined || (props.createOutputs != undefined && props.createOutputs.valueOf())) {
      const exportName = props.resourceId
        ? `${props.resourceType}:${props.resourceId.replace(/\W/g, '').replace(/_/g, '-')}:${props.name}`
        : `${props.resourceType}:${props.name}`;
      new CfnOutput(this, `out`, { value: props.value, exportName: props.naming.exportName(exportName) });
    }
  }
}

/**
 * A StringParameter which automatically handles tokens in the path
 */
export class MdaaStringParameter extends StringParameter {
  constructor(scope: Construct, id: string, props: StringParameterProps) {
    super(scope, id, { ...props, simpleName: Token.isUnresolved(props.parameterName) });
  }
}
