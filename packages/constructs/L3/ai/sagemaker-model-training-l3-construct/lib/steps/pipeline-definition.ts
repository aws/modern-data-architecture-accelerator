/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PipelineStep, PipelineStepDefinition } from './pipeline-step';

/** SageMaker Pipeline parameter type. */
export type PipelineParameterType = 'String' | 'Integer' | 'Float' | 'Boolean';

/** A pipeline-level parameter that can be overridden at execution time. */
export interface PipelineParameter {
  /** Parameter name. */
  readonly name: string;
  /** Parameter type. */
  readonly type: PipelineParameterType;
  /** Default value. */
  readonly defaultValue: string | number | boolean;
}

/** Configuration for generating a SageMaker Pipeline Definition. */
export interface SmPipelineDefinitionProps {
  /** Pipeline-level parameters. */
  readonly parameters?: PipelineParameter[];
  /** Ordered list of top-level steps (Condition steps embed their own sub-steps). */
  readonly steps: PipelineStep[];
}

/**
 * Generates a SageMaker Pipeline Definition JSON string.
 *
 * This is the JSON blob passed to CfnPipeline.pipelineDefinition.pipelineDefinitionBody.
 * It follows the SageMaker Pipeline Definition Language schema (Version 2020-12-01).
 *
 * @see https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-pipeline-structure.html
 */
export class SmPipelineDefinition {
  private readonly props: SmPipelineDefinitionProps;

  constructor(props: SmPipelineDefinitionProps) {
    this.props = props;
    this.validate();
  }

  /** Generate the pipeline definition as a JSON string. */
  public toJSON(): string {
    return JSON.stringify(this.buildDefinition());
  }

  /** Generate the pipeline definition as a parsed object (for use with CfnPipeline). */
  public toObject(): Record<string, unknown> {
    return this.buildDefinition();
  }

  /** Build the pipeline definition object. */
  private buildDefinition(): Record<string, unknown> {
    const definition: Record<string, unknown> = {
      Version: '2020-12-01',
    };

    if (this.props.parameters && this.props.parameters.length > 0) {
      definition['Parameters'] = this.props.parameters.map(param => ({
        Name: param.name,
        Type: param.type,
        DefaultValue: coerceParameterDefault(param.defaultValue, param.type),
      }));
    }

    // Cache step definitions — toDefinition() is pure but called multiple times per step.
    const stepDefs = this.props.steps.map(step => ({ step, def: step.toDefinition() }));

    // Collect step names that are embedded in Condition IfSteps/ElseSteps.
    // These must NOT appear as top-level steps (SageMaker rejects duplicates).
    const embeddedStepNames = new Set<string>();
    for (const { def } of stepDefs) {
      if (def.ifSteps) def.ifSteps.forEach(s => embeddedStepNames.add(s.name));
      if (def.elseSteps) def.elseSteps.forEach(s => embeddedStepNames.add(s.name));
    }

    definition['Steps'] = stepDefs
      .filter(({ def }) => !embeddedStepNames.has(def.name))
      .map(({ def }) => this.toPascalCase(def));

    return definition;
  }

  /**
   * Convert a camelCase PipelineStepDefinition to PascalCase for SageMaker Pipeline JSON.
   * JSII requires camelCase; SageMaker requires PascalCase.
   */
  private toPascalCase(def: PipelineStepDefinition): Record<string, unknown> {
    const result: Record<string, unknown> = {
      Name: def.name,
      Type: def.type,
    };
    if (def.arguments) result['Arguments'] = def.arguments;
    if (def.dependsOn && def.dependsOn.length > 0) result['DependsOn'] = def.dependsOn;
    // Condition steps: Conditions, IfSteps, ElseSteps go inside Arguments
    if (def.condition || def.ifSteps || def.elseSteps) {
      const condArgs: Record<string, unknown> = {};
      if (def.condition) condArgs['Conditions'] = (def.condition as Record<string, unknown>)['Conditions'];
      if (def.ifSteps) condArgs['IfSteps'] = def.ifSteps.map(s => this.toPascalCase(s));
      if (def.elseSteps && def.elseSteps.length > 0)
        condArgs['ElseSteps'] = def.elseSteps.map(s => this.toPascalCase(s));
      result['Arguments'] = condArgs;
    }
    if (def.propertyFiles && def.propertyFiles.length > 0) {
      result['PropertyFiles'] = def.propertyFiles;
    }
    return result;
  }

  /** Validate step name uniqueness and references. */
  private validate(): void {
    const names = new Set<string>();
    // Validate top-level step name uniqueness. Nested steps inside Condition branches
    // are validated by SageMaker at pipeline creation time.
    for (const step of this.props.steps) {
      if (names.has(step.name)) {
        throw new Error(`Duplicate step name: '${step.name}'. Step names must be unique within a pipeline.`);
      }
      names.add(step.name);
    }
  }
}

function coerceParameterDefault(
  value: string | number | boolean,
  type: PipelineParameterType,
): string | number | boolean {
  if (type === 'Integer' && typeof value === 'string') {
    const n = parseInt(value, 10);
    if (!isNaN(n)) return n;
    throw new Error(`Parameter default '${value}' cannot be coerced to Integer.`);
  }
  if (type === 'Float' && typeof value === 'string') {
    const n = parseFloat(value);
    if (!isNaN(n)) return n;
    throw new Error(`Parameter default '${value}' cannot be coerced to Float.`);
  }
  if (type === 'Boolean' && typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`Parameter default '${value}' cannot be coerced to Boolean. Expected 'true' or 'false'.`);
  }
  return value;
}
