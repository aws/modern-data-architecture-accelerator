/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PipelineStep, PipelineStepDefinition } from './pipeline-step';

/**
 * Condition operator for comparing metric values.
 *
 * @see https://docs.aws.amazon.com/sagemaker/latest/dg/build-and-manage-conditions.html
 */
export type ConditionOperator =
  | 'LessThan'
  | 'LessThanOrEqualTo'
  | 'GreaterThan'
  | 'GreaterThanOrEqualTo'
  | 'Equals'
  | 'NotEquals';

/** Left-hand side of a condition: a JsonGet expression referencing a property file. */
export interface JsonGetExpression {
  /** Step name containing the property file output. */
  readonly stepName: string;
  /** Property file name (as declared in SmProcessingStep.propertyFiles). */
  readonly propertyFile: string;
  /** JSON path within the property file. */
  readonly jsonPath: string;
}

/** A single condition clause. */
export interface ConditionClause {
  /** Comparison operator. */
  readonly operator: ConditionOperator;
  /** Left-hand side: a JsonGet expression referencing a processing step's property file. */
  readonly left: JsonGetExpression;
  /** Right-hand side: a numeric threshold or string value. */
  readonly right: number | string;
}

/** Configuration for a SageMaker Condition step. */
export interface SmConditionStepProps {
  /** Condition clauses (ANDed together if multiple). */
  readonly conditions: ConditionClause[];
  /** Steps to execute if the condition is true. */
  readonly ifSteps: PipelineStep[];
  /** Steps to execute if the condition is false (default: empty — pipeline stops). */
  readonly elseSteps?: PipelineStep[];
  /** Explicit step dependencies. */
  readonly dependsOn?: string[];
}

/**
 * SageMaker Condition step.
 *
 * Evaluates one or more conditions and branches execution to
 * ifSteps or elseSteps based on the result.
 */
export class SmConditionStep extends PipelineStep {
  private readonly props: SmConditionStepProps;

  constructor(name: string, props: SmConditionStepProps) {
    super(name, props.dependsOn);
    this.props = props;
  }

  public toDefinition(): PipelineStepDefinition {
    const conditions = this.props.conditions.map(cond => ({
      Type: `Condition${cond.operator}`,
      LeftValue: {
        'Std:JsonGet': {
          Step: cond.left.stepName,
          PropertyFile: cond.left.propertyFile,
          Path: cond.left.jsonPath,
        },
      },
      RightValue: cond.right,
    }));

    return {
      name: this.name,
      type: 'Condition',
      condition: {
        Conditions: conditions,
      },
      ifSteps: this.props.ifSteps.map(step => step.toDefinition()),
      elseSteps: (this.props.elseSteps ?? []).map(step => step.toDefinition()),
      ...(this.dependsOn.length > 0 && { dependsOn: this.dependsOn }),
    };
  }
}
