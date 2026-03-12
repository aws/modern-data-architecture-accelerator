/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnRuleset, CfnRulesetProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewRulesetProps extends MdaaConstructProps {
  /** Unique name for the DataBrew ruleset. */
  readonly name: string;
  /** Array of data quality rules for validation and profiling. */
  readonly rules: IResolvable | (CfnRuleset.RuleProperty | IResolvable)[];
  readonly targetArn: string;
  /** Description of the ruleset's purpose and validation criteria. */
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
