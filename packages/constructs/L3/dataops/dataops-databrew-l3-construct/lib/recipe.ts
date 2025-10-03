/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnRecipe, CfnRecipeProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a Mdaa Databrew Recipe
 */
export interface MdaaDataBrewRecipeProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the DataBrew recipe enabling recipe identification and management. Provides the recipe identifier for DataBrew operations and serves as the primary reference for data transformation and processing workflows.
   *
   * Use cases: Recipe identification; Transformation workflows; Data processing; Recipe management
   *
   * AWS: AWS Glue DataBrew recipe name for identification and transformation operations
   *
   * Validation: Must be unique recipe name string; required for recipe creation and identification
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of transformation steps defining the data processing workflow and operations sequence. Specifies the data transformation steps that will be applied to datasets for automated data preparation, cleansing, and transformation operations.
   *
   * Use cases: Data transformation; Processing steps; Workflow definition; Automated preparation
   *
   * AWS: AWS Glue DataBrew recipe steps for data transformation and processing workflows
   *
   * Validation: Must be array of valid CfnRecipe.RecipeStepProperty objects; required for data transformation
   *   **/
  readonly steps: IResolvable | (IResolvable | CfnRecipe.RecipeStepProperty)[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the recipe explaining its purpose and transformation logic for documentation and management. Provides human-readable description of the recipe's purpose and the data transformations it performs.
   *
   * Use cases: Recipe documentation; Management clarity; Transformation explanation; Operational understanding
   *
   * AWS: AWS Glue DataBrew recipe description for documentation and management
   *
   * Validation: Must be descriptive text if provided; recommended for recipe documentation and clarity
   **/
  readonly description?: string;
}

/**
 * A construct which creates a compliant Databrew Recipe.
 */
export class MdaaDataBrewRecipe extends CfnRecipe {
  private static setProps(props: MdaaDataBrewRecipeProps): CfnRecipeProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaDataBrewRecipeProps) {
    super(scope, id, MdaaDataBrewRecipe.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Recipe',
          resourceId: props.name,
          name: props.name,
          value: this.name,
        },
        ...props,
      },
      scope,
    );
  }
}
