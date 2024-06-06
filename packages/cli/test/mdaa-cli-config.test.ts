/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCliConfig } from "../lib/mdaa-cli-config-parser";

test( 'ConfigParseTest', () => {
    expect( () => new MdaaCliConfig( { filename: "test/mdaa.yaml" } ) ).not.toThrow()
} );

