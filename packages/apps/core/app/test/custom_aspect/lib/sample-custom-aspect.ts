import { IAspect } from "aws-cdk-lib";

import { IConstruct } from "constructs";

export class SampleCustomAspect implements IAspect {

    constructor( _props: { [ key: string ]: any } ) {

    }

    public visit ( _construct: IConstruct ): void {
    }

}