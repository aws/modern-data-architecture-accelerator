/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnRuleset, CfnRulesetProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewRulesetProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the DataBrew ruleset enabling ruleset identification and management. Provides the ruleset identifier for DataBrew operations and serves as the primary reference for data quality validation and profiling workflows.
   *
   * Use cases: Ruleset identification; Quality management; Validation workflows; Rule organization
   *
   * AWS: AWS Glue DataBrew ruleset name for identification and quality management
   *
   * Validation: Must be unique ruleset name string; required for ruleset creation and identification
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of data quality rules defining validation logic and profiling criteria for dataset assessment. Specifies the data quality rules that will be applied to datasets for automated validation, profiling, and quality assessment operations.
   *
   * Use cases: Data quality validation; Rule definition; Quality criteria; Automated assessment
   *
   * AWS: AWS Glue DataBrew rule definitions for data quality validation and assessment
   *
   * Validation: Must be array of valid CfnRuleset.RuleProperty objects; required for data quality validation
   *   **/
  readonly rules: IResolvable | (CfnRuleset.RuleProperty | IResolvable)[];
  readonly targetArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the ruleset explaining its purpose and validation criteria for documentation and management. Provides human-readable description of the ruleset's purpose and the data quality criteria it enforces.
   *
   * Use cases: Ruleset documentation; Management clarity; Quality criteria explanation; Operational understanding
   *
   * AWS: AWS Glue DataBrew ruleset description for documentation and management
   *
   * Validation: Must be descriptive text if provided; recommended for ruleset documentation and clarity
   **/
  readonly description?: string;
}

/**
 * A construct which creates a compliant Databrew Ruleset.
 */
export class MdaaDataBrewRuleset extends CfnRuleset {
  private static setProps(props: MdaaDataBrewRulesetProps): CfnRulesetProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaDataBrewRulesetProps) {
    super(scope, id, MdaaDataBrewRuleset.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Ruleset',
          resourceId: props.name,
          name: 'name',
          value: this.name,
        },
        ...props,
      },
      scope,
    );
  }
}
