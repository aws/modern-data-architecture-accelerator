/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefDeploy } from "../lib/caef-cli";

test( 'CdkCmdTest', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag"
    }

    const configContents = {
        "caef_version": "test_global_version",
        "organization": "sample-org",
        "naming_class": "TestNaming",
        "naming_module": "test_module",
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
                        "caef_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test_module": {
                                "caef_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-caef/test",
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

    const caef = new CaefDeploy( options, ["test-extra-cdk-param"],configContents )
    caef.deploy()
} );

test( 'CdkCmdTest2', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        clear: "true",
        role_arn: "test_role_arn"
    }

    const configContents = {
        "caef_version": "test_global_version",
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
                        "caef_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test_module": {
                                "caef_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-caef/test",
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

    const caef = new CaefDeploy( options, undefined,configContents )
    caef.deploy()
} );

test( 'CdkCmdTest3', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        working_dir: "test/test_working",
        tag: "testtag"
    }

    const configContents = {
        "caef_version": "test_global_version",
        "organization": "sample-org",
        "naming_class": "TestNaming",
        "naming_module": "test_module",
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
                        "caef_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test_module": {
                                "caef_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-caef/test",
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

    const caef = new CaefDeploy( options,undefined, configContents )
    caef.deploy()
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
            caefCodeCommitRepo: "test-repo",
            configsCodeCommitRepo: "test-config-repo",
            pipelines: {
                "test": {
                    domainFilter: ["shared"],
                    envFilter: ["dev"],
                    moduleFilter: ["test_module"]
                }
            }
        },
        "caef_version": "test_global_version",
        "organization": "sample-org",
        "naming_class": "TestNaming",
        "naming_module": "test_module",
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
                        "caef_version": "test_env_version",
                        "context": {
                            "env_context_key": "env_context_value"
                        },
                        "modules": {
                            "test_module": {
                                "caef_version": "test_mod_version",
                                "context": {
                                    "module_context_key": "module_context_value",
                                    "global_override_key": "module_value"
                                },
                                "cdk_app": "@aws-caef/test",
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

    const caef = new CaefDeploy( options, undefined, configContents )
    caef.deploy()
} );

test( 'Config File Test', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag",
        config: "./test/caef.yaml"
    }
    const caef = new CaefDeploy( options, [ "test-extra-cdk-param" ] )
    caef.deploy()
} );

test( 'LocalMode', () => {
    const options = {
        dryrun: "true",
        action: "dryrun",
        npm_debug: "true",
        working_dir: "test/test_working",
        config: "./test/caef_local.yaml",
        local_mode: "true"
    }
    const caef = new CaefDeploy( options, [ "test-extra-cdk-param" ] )
    caef.deploy()
} );