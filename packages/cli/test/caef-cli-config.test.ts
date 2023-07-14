/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefCliConfig } from "../lib/caef-cli-config-parser";

test( 'ConfigParseTest', () => {
    expect( () => new CaefCliConfig( { filename: "test/caef.yaml" } ) ).not.toThrow()
} );

