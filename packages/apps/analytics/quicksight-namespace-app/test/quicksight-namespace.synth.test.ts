/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuickSightNamespaceCDKApp } from "../lib/quicksight-namespace";

test( 'SynthTest LOB1', () => {
    const context = {
        org: "test-org",
        env: "test-env",
        domain: "test-domain",
        module_name: "test-module",
        module_configs: "./test/test-config-lob1.yaml"
    }
    const app = new QuickSightNamespaceCDKApp( { context: context } )
    app.generateStack()
    expect( () => app.synth( {
        force: true,
        validateOnSynthesis: true
    } ) ).not.toThrow()
} );