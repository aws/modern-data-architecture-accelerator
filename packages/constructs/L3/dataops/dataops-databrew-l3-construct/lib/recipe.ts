/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { IResolvable } from 'aws-cdk-lib';
import { CfnRecipe, CfnRecipeProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a Caef Databrew Recipe
 */
export interface CaefDataBrewRecipeProps extends CaefConstructProps {

    // The unique name for the recipe.
    readonly name: string;

    // A list of steps that are defined by the recipe.
    readonly steps: IResolvable | ( IResolvable | CfnRecipe.RecipeStepProperty )[]

    // The description of the recipe.
    readonly description?: string;

}

/**
 * A construct which creates a compliant Databrew Recipe.
 */
export class CaefDataBrewRecipe extends CfnRecipe {

    private static setProps ( props: CaefDataBrewRecipeProps ): CfnRecipeProps {
        const overrideProps = {
            name: props.naming.resourceName( props.name, 80 )
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: CaefDataBrewRecipeProps ) {
        super( scope, id, CaefDataBrewRecipe.setProps( props ) )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "Recipe",
                resourceId: props.name,
                name: props.name,
                value: this.name
            }, ...props
        } )
    }
}

