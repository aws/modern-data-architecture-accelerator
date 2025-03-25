/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { IResolvable } from 'aws-cdk-lib';
import { CfnRuleset, CfnRulesetProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a Mdaa Databrew Ruleset
 */
export interface MdaaDataBrewRulesetProps extends MdaaConstructProps {
  // The name of the ruleset.
  readonly name: string;

  // A list of steps that are defined by the recipe.
  readonly rules: IResolvable | (CfnRuleset.RuleProperty | IResolvable)[];

  //The Amazon Resource Name (ARN) of a resource (dataset) that the ruleset is associated with.
  readonly targetArn: string;

  // The description of the ruleset.
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
