/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICaefResourceNaming, CaefResourceNamingConfig, CaefDefaultResourceNaming } from '@aws-caef/naming'

export class CustomNaming implements ICaefResourceNaming {
    constructor( props: CaefResourceNamingConfig ) {
        console.log( 'Using CustomNaming' );
    }
    props: CaefResourceNamingConfig;
    withModuleName ( moduleName: string ): ICaefResourceNaming {
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

export class ExtendedDefaultNaming extends CaefDefaultResourceNaming {
    constructor( props: CaefResourceNamingConfig ) {
        super( props )
        console.log( 'Using ExtendedDefaultNaming2' );
    }
}