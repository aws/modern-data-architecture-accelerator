/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming, MdaaResourceNamingConfig, MdaaDefaultResourceNaming } from '@aws-mdaa/naming'

export class CustomNaming implements IMdaaResourceNaming {
    constructor( props: MdaaResourceNamingConfig ) {
        console.log( 'Using CustomNaming' );
    }
    props: MdaaResourceNamingConfig;
    withModuleName ( moduleName: string ): IMdaaResourceNaming {
        throw new Error( 'Method not implemented.' );
    }
    exportName ( path: string, includeModuleName?: boolean | undefined, lowerCase?: boolean | undefined ): string {
        throw new Error( 'Method not implemented.' );
    }
    stackName ( stackName?: string ): string {
        throw new Error( 'Method not implemented.' );
    }
    resourceName ( functionName: string ): string {
        throw new Error( 'Method not implemented.' );
    }
    ssmPath ( path: string ): string {
        throw new Error( 'Method not implemented.' );
    }
    templateName ( resourceName: string ): string {
        throw new Error( 'Method not implemented.' );
    }
}

export class ExtendedDefaultNaming extends MdaaDefaultResourceNaming {
    constructor( props: MdaaResourceNamingConfig ) {
        super( props )
        console.log( 'Using ExtendedDefaultNaming2' );
    }
}