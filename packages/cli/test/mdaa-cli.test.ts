/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from "../lib/mdaa-cli";
import * as fs from 'fs';


test( 'Default Config File Test', () => {
    fs.copyFileSync( './test/mdaa.yaml', './mdaa.yaml' )
    const options = {
        testing: "true",
        action: "synth"
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
        testing: "true",
        action: "synth"
    }
    expect( () => {
        const mdaa = new MdaaDeploy( options )
        mdaa.deploy()
    } ).not.toThrow()
    fs.rmSync( './caef.yaml' )
} );


test( 'Missing Default CAEF Config File Test', () => {
    const options = {
        testing: "true",
        action: "synth"
    }
    expect( () => {
        const mdaa = new MdaaDeploy( options )
        mdaa.deploy()
    } ).toThrow()
} );

test( 'Missing Config File Test', () => {
    const options = {
        testing: "true",
        action: "synth",
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
        testing: "true",
        action: "synth",
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
        testing: "true",
        action: "synth",
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
                                "module_path": "@aws-mdaa/test",
                                "module_configs": [
                                    "./test.yaml"
                                ]
                            }
                        }
                    }
                }
            }
        }
    }

    const mdaa = new MdaaDeploy( options, [ "test-extra-cdk-param" ], configContents )
    mdaa.deploy()
} );

test( 'CdkCmdTest2', () => {
    const options = {
        testing: "true",
        action: "synth",
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
                                "module_path": "@aws-mdaa/test",
                                "module_configs": [
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

test( 'CdkCmdTest3', () => {
    const options = {
        testing: "true",
        action: "synth",
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
                                "module_path": "@aws-mdaa/test",
                                "module_configs": [
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

test( 'Pipelines Test', () => {
    const options = {
        testing: "true",
        action: "synth",
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
                    domainFilter: [ "shared" ],
                    envFilter: [ "dev" ],
                    moduleFilter: [ "test-module" ]
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
                                "module_path": "@aws-mdaa/test",
                                "module_configs": [
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
        testing: "true",
        action: "synth",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag",
        config: "./test/mdaa.yaml"
    }
    const mdaa = new MdaaDeploy( options, [ "test-extra-cdk-param" ] )
    mdaa.deploy()
} );

test( 'EnvTemplateTest', () => {
    const options = {
        testing: "true",
        action: "synth",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag"
    }

    const configContents = {
        "organization": "sample-org",
        "env_templates": {
            "test_global_template": {
                "modules": {
                    "test-module": {
                        "mdaa_version": "test_mod_version",
                        "module_path": "@aws-mdaa/test",
                        "module_configs": [
                            "./test.yaml"
                        ]
                    }
                }
            }
        },
        "domains": {
            "domain1": {
                "env_templates": {
                    "test_domain_template": {
                        "modules": {
                            "test-module": {
                                "mdaa_version": "test_mod_version",
                                "module_path": "@aws-mdaa/test",
                                "module_configs": [
                                    "./test.yaml"
                                ]
                            }
                        }
                    }
                },
                "environments": {
                    "dev-global": {
                        "template": "test_global_template",
                        "modules": {
                            "test-module2": {
                                "module_path": "@aws-mdaa/test",
                                "module_configs": [
                                    "./test2.yaml"
                                ]
                            }
                        }
                    },
                    "dev-domain": {
                        "template": "test_domain_template"
                    }
                }
            }
        }
    }

    const mdaa = new MdaaDeploy( options, [ "test-extra-cdk-param" ], configContents )
    mdaa.deploy()
} );

describe( "Terraform", () => {

    const options = {
        testing: "true",
        npm_debug: "true",
        working_dir: "test/test_working",
        tag: "testtag"
    }

    const configContents = {
        "organization": "sample-org",
        "domains": {
            "test-tf": {
                "environments": {
                    "dev": {
                        "modules": {
                            "test-tf-mdaa": {
                                "terraform": {
                                    // "override": {
                                    //     "terraform": {
                                    //         "backend": {"s3": {"bucket": "test-bucket",
                                    //         "lock_table": "test-table"}}
                                    //     }
                                    // }
                                },
                                "module_path": "aws-mdaa/datalake",
                                "module_type": "tf"
                            },
                            "test-tf-3p-mdaa": {
                                "mdaa_compliant": true,
                                "module_path": "../../../terraform/aws-mdaa/datalake",
                                "module_type": "tf"
                            },
                            "test-tf-3p": {
                                "module_path": "../../../terraform/aws-mdaa/datalake",
                                "module_type": "tf"
                            }
                        }
                    }
                }
            }
        }
    }
    test( 'TfTestValidate', () => {
        const cmdOptions = {
            ...options,
            action: 'validate'
        }
        const mdaa = new MdaaDeploy( cmdOptions, undefined, configContents )
        mdaa.deploy()
    } );
    test( 'TfTestPlan', () => {
        const cmdOptions = {
            ...options,
            action: 'plan'
        }
        const mdaa = new MdaaDeploy( cmdOptions, undefined, configContents )
        mdaa.deploy()
    } );
    test( 'TfTestApply', () => {
        const cmdOptions = {
            ...options,
            action: 'apply'
        }
        const mdaa = new MdaaDeploy( cmdOptions, undefined, configContents )
        mdaa.deploy()
    } );
} )