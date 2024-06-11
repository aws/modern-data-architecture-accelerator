/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from "../lib/mdaa-cli";
import * as fs from 'fs';


test( 'Default Config File Test', () => {
    fs.copyFileSync( './test/mdaa.yaml', './mdaa.yaml' )
    const options = {
        dryrun: "true",
        action: "dryrun"
    }
    expect( () => {
        const mdaa = new MdaaDeploy( options )
        mdaa.deploy()
    } ).not.toThrow()
    fs.rmSync( './mdaa.yaml' )
} );


test( 'Default CAEF Config File Test', () => {
    fs.copyFileSync( './test/mdaa.yaml', './caef.yaml' )
    const options = {
        dryrun: "true",
        action: "dryrun"
    }
    expect( () => {
        const mdaa = new MdaaDeploy( options )
        mdaa.deploy()
    } ).not.toThrow()
    fs.rmSync( './caef.yaml' )
} );


test( 'Missing Default CAEF Config File Test', () => {
    const options = {
        dryrun: "true",
        action: "dryrun"
    }
    expect( () => {
        const mdaa = new MdaaDeploy( options )
        mdaa.deploy()
    } ).toThrow()
} );

test( 'Missing Config File Test', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag",
        config: "missing.yaml"
    }
    expect( () => {
        const mdaa = new MdaaDeploy( options )
        mdaa.deploy()
    } ).toThrow()
} );

test( 'LocalMode', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        config: "./test/mdaa_local.yaml",
        local_mode: "true"
    }
    const mdaa = new MdaaDeploy( options, [ "test-extra-cdk-param" ] )
    mdaa.deploy()
} );

test( 'CdkCmdTest', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag"
    }

    const configContents = {
        "mdaa_version": "test_global_version",
        "organization": "sample-org",
        "naming_class": "TestNaming",
        "naming_module": "test-module",
        "context": {
            "global_context_key": "global_context_value",
            "global_override_key": "global_value",
            "global_object_key": {
                "objkey": "objvalue"
            },
            "global_array_key": [
                "arrayitem1",
                "arrayitem2"
            ]
        },
        "domains": {
            "shared": {
                "context": {
                    "domain_context_key": "domain_context_value"
                },
                "environments": {
                    "dev": {
                        "mdaa_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test-module": {
                                "mdaa_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-mdaa/test",
                                "app_configs": [
                                    "./test.yaml"
                                ]
                            }
                        }
                    }
                }
            }
        }
    }

    const mdaa = new MdaaDeploy( options, ["test-extra-cdk-param"],configContents )
    mdaa.deploy()
} );

test( 'CdkCmdTest2', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        clear: "true",
        role_arn: "test_role_arn"
    }

    const configContents = {
        "mdaa_version": "test_global_version",
        "organization": "sample-org",
        "context": {
            "global_context_key": "global_context_value",
            "global_override_key": "global_value",
            "global_object_key": {
                "objkey": "objvalue"
            },
            "global_array_key": [
                "arrayitem1",
                "arrayitem2"
            ]
        },
        "domains": {
            "shared": {
                "context": {
                    "domain_context_key": "domain_context_value"
                },
                "environments": {
                    "dev": {
                        "mdaa_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test-module": {
                                "mdaa_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-mdaa/test",
                                "app_configs": [
                                    "./test.yaml"
                                ]
                            }
                        }
                    }
                }
            }
        }
    }

    const mdaa = new MdaaDeploy( options, undefined,configContents )
    mdaa.deploy()
} );

test( 'CdkCmdTest3', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        working_dir: "test/test_working",
        tag: "testtag"
    }

    const configContents = {
        "mdaa_version": "test_global_version",
        "organization": "sample-org",
        "naming_class": "TestNaming",
        "naming_module": "test-module",
        "custom_aspects": [
            {
                "aspect_module": "./some_local_module",
                "aspect_class": "SomeAspectClass",
                "aspect_props": {
                    "prop1": "propvalue1",
                    "prop2": {
                        "prop2prop1": "propvalue2"
                    }
                }
            }
        ],
        "context": {
            "global_context_key": "global_context_value",
            "global_override_key": "global_value",
            "global_object_key": {
                "objkey": "objvalue"
            },
            "global_array_key": [
                "arrayitem1",
                "arrayitem2"
            ]
        },
        "domains": {
            "shared": {
                "context": {
                    "domain_context_key": "domain_context_value"
                },
                "environments": {
                    "dev": {
                        "mdaa_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test-module": {
                                "mdaa_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-mdaa/test",
                                "app_configs": [
                                    "./test.yaml"
                                ]
                            }
                        }
                    }
                }
            }
        }
    }

    const mdaa = new MdaaDeploy( options,undefined, configContents )
    mdaa.deploy()
} );

test( 'Pipelines Test', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        working_dir: "test/test_working",
        tag: "testtag",
        devops: "true"
    }

    const configContents = {
        "devops": {
            mdaaCodeCommitRepo: "test-repo",
            configsCodeCommitRepo: "test-config-repo",
            pipelines: {
                "test": {
                    domainFilter: ["shared"],
                    envFilter: ["dev"],
                    moduleFilter: ["test-module"]
                }
            }
        },
        "mdaa_version": "test_global_version",
        "organization": "sample-org",
        "naming_class": "TestNaming",
        "naming_module": "test-module",
        "custom_aspects": [
            {
                "aspect_module": "./some_local_module",
                "aspect_class": "SomeAspectClass",
                "aspect_props": {
                    "prop1": "propvalue1",
                    "prop2": {
                        "prop2prop1": "propvalue2"
                    }
                }
            }
        ],
        "context": {
            "global_context_key": "global_context_value",
            "global_override_key": "global_value",
            "global_object_key": {
                "objkey": "objvalue"
            },
            "global_array_key": [
                "arrayitem1",
                "arrayitem2"
            ]
        },
        "domains": {
            "shared": {
                "context": {
                    "domain_context_key": "domain_context_value"
                },
                "environments": {
                    "dev": {
                        "mdaa_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test-module": {
                                "mdaa_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-mdaa/test",
                                "app_configs": [
                                    "./test.yaml"
                                ]
                            }
                        }
                    }
                }
            }
        }
    }

    const mdaa = new MdaaDeploy( options, undefined, configContents )
    mdaa.deploy()
} );

test( 'Config File Test', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag",
        config: "./test/mdaa.yaml"
    }
    const mdaa = new MdaaDeploy( options, [ "test-extra-cdk-param" ] )
    mdaa.deploy()
} );

