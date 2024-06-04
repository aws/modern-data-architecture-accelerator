/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefDevopsCDKApp } from "../lib/devops";

test( 'SynthTest', () => {
    const context = {
        org: "test-org",
        env: "test-env",
        domain: "test-domain",
        module_name: "test-module",
        app_configs: "./test/test-config.yaml"
    }
    const app = new CaefDevopsCDKApp( { context: context } )
    app.generateStack()
    expect( () => app.synth( {
        force: true,
        validateOnSynthesis: true
    } ) ).not.toThrow()
} );

