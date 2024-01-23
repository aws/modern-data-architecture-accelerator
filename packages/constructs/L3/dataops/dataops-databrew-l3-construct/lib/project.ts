/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { IResolvable } from 'aws-cdk-lib';
import { CfnProject, CfnProjectProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a compliant Caef Databrew Project
 */
export interface CaefDataBrewProjectProps extends CaefConstructProps {

    // The unique name of a project.
    readonly name: string
    // The dataset that the project is to act upon.
    readonly datasetName: string
    // The name of a recipe that will be developed during a project session.
    readonly recipeName: string
    // The Amazon Resource Name (ARN) of the role that will be assumed for this project.
    readonly roleArn: string
    // The sample size and sampling type to apply to the data.
    readonly sample?: CfnProject.SampleProperty | IResolvable

}

/**
 * A construct which creates a compliant Databrew Project.
 */
export class CaefDataBrewProject extends CfnProject {

    private static setProps ( props: CaefDataBrewProjectProps ): CfnProjectProps {
        const overrideProps = {
            name: props.naming.resourceName( props.name, 80 )
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: CaefDataBrewProjectProps ) {
        super( scope, id, CaefDataBrewProject.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "Project",
                resourceId: props.name,
                name: props.name,
                value: this.name
            }, ...props
        },scope )
        new CaefParamAndOutput( this, {
            ...{
                resourceType: "Project",
                resourceId: props.datasetName,
                name: "datasetName",
                value: this.datasetName
            }, ...props
        },scope )
        new CaefParamAndOutput( this, {
            ...{
                resourceType: "Project",
                resourceId: props.recipeName,
                name: "recipeName",
                value: this.recipeName
            }, ...props
        },scope )
    }
}

