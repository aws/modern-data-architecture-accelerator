/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCliConfig, MdaaConfigContents } from "../lib/mdaa-cli-config-parser";

test( 'ConfigParseTest', () => {
    expect( () => new MdaaCliConfig( { filename: "test/mdaa.yaml" } ) ).not.toThrow()
} );

test( 'BadOrgNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test_bad_org",
        domains: {}
    }

    expect( () => new MdaaCliConfig( {configContents: configContents} ) ).toThrow()
} );

test( 'GoodOrgNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {}
    }

    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).not.toThrow()
} );

test( 'BadDomainNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {
            "test_bad_domain": {
                environments: {}
            }
        }
    }
    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).toThrow()
} );

test( 'GoodDomainNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {
            "test-good-domain": {
                environments: {}
            }
        }
    }
    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).not.toThrow()
} );

test( 'BadEnvNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {
            "test-good-domain": {
                environments: {
                    "test_bad_env": {
                        modules: {}
                    }
                }
            }
        }
    }
    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).toThrow()
} );

test( 'GoodEnvNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {
            "test-good-domain": {
                environments: {
                    "test-good-env": {
                        modules: {}
                    }
                }
            }
        }
    }
    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).not.toThrow()
} );

test( 'BadModuleNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {
            "test-good-domain": {
                environments: {
                    "test-good-env": {
                        modules: {
                            "test_bad_module": {
                                cdk_app: "test"
                            }
                        }
                    }
                }
            }
        }
    }
    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).toThrow()
} );

test( 'GoodModuleNameTest', () => {

    const configContents: MdaaConfigContents = {
        organization: "test-good-org",
        domains: {
            "test-good-domain": {
                environments: {
                    "test-good-env": {
                        modules: {
                            "test-good-module": {
                                cdk_app: "test"
                            }
                        }
                    }
                }
            }
        }
    }
    expect( () => new MdaaCliConfig( { configContents: configContents } ) ).not.toThrow()
} );