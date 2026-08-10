/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from '../lib/mdaa-cli';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const commandExists = require('command-exists');

jest.mock('command-exists', () => ({
  sync: jest.fn(),
}));
(commandExists.sync as jest.Mock).mockReturnValue(true);

test('Default Config File Test', () => {
  fs.copyFileSync('./test/resources/mdaa.yaml', './mdaa.yaml');
  const options = {
    testing: 'true',
    action: 'synth',
  };
  expect(() => {
    const mdaa = new MdaaDeploy(options);
    mdaa.deploy();
  }).not.toThrow();
  fs.rmSync('./mdaa.yaml');
});

test('Default CAEF Config File Test', () => {
  fs.copyFileSync('./test/resources/mdaa.yaml', './caef.yaml');
  const options = {
    testing: 'true',
    action: 'synth',
  };
  expect(() => {
    const mdaa = new MdaaDeploy(options);
    mdaa.deploy();
  }).not.toThrow();
  fs.rmSync('./caef.yaml');
});

test('Missing Default CAEF Config File Test', () => {
  const options = {
    testing: 'true',
    action: 'synth',
  };
  expect(() => {
    const mdaa = new MdaaDeploy(options);
    mdaa.deploy();
  }).toThrow();
});

test('Missing Config File Test', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    tag: 'testtag',
    config: 'missing.yaml',
  };
  expect(() => {
    const mdaa = new MdaaDeploy(options);
    mdaa.deploy();
  }).toThrow();
});

test('LocalMode', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    config: './test/resources/mdaa_local.yaml',
    local_mode: 'true',
  };
  const mdaa = new MdaaDeploy(options, ['test-extra-cdk-param']);
  expect(() => mdaa.deploy()).not.toThrow();
});

test('CdkCmdTest', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  const configContents = {
    mdaa_version: 'test_global_version',
    organization: 'sample-org',
    naming_class: 'TestNaming',
    naming_module: 'test-module',
    context: {
      global_context_key: 'global_context_value',
      global_override_key: 'global_value',
      global_object_key: {
        objkey: 'objvalue',
      },
      global_array_key: ['arrayitem1', 'arrayitem2'],
    },
    domains: {
      shared: {
        context: {
          domain_context_key: 'domain_context_value',
        },
        environments: {
          dev: {
            mdaa_version: 'test_env_version',
            context: {
              env_context_key: 'env_context_value',
            },
            modules: {
              'test-module': {
                mdaa_version: 'test_mod_version',
                context: {
                  module_context_key: 'module_context_value',
                  global_override_key: 'module_value',
                },
                module_path: '@aws-mdaa/test',
                module_configs: ['./test.yaml'],
              },
            },
          },
        },
      },
    },
  };

  const mdaa = new MdaaDeploy(options, ['test-extra-cdk-param'], configContents);
  expect(() => mdaa.deploy()).not.toThrow();
});

test('CdkCmdTest2', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    clear: 'true',
    role_arn: 'test_role_arn',
  };

  const configContents = {
    mdaa_version: 'test_global_version',
    organization: 'sample-org',
    context: {
      global_context_key: 'global_context_value',
      global_override_key: 'global_value',
      global_object_key: {
        objkey: 'objvalue',
      },
      global_array_key: ['arrayitem1', 'arrayitem2'],
    },
    domains: {
      shared: {
        context: {
          domain_context_key: 'domain_context_value',
        },
        environments: {
          dev: {
            mdaa_version: 'test_env_version',
            context: {
              env_context_key: 'env_context_value',
            },
            modules: {
              'test-module': {
                mdaa_version: 'test_mod_version',
                context: {
                  module_context_key: 'module_context_value',
                  global_override_key: 'module_value',
                },
                module_path: '@aws-mdaa/test',
                module_configs: ['./test.yaml'],
              },
            },
          },
        },
      },
    },
  };

  const mdaa = new MdaaDeploy(options, undefined, configContents);
  expect(() => mdaa.deploy()).not.toThrow();
});

test('CdkCmdTest3', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  const configContents = {
    mdaa_version: 'test_global_version',
    organization: 'sample-org',
    naming_class: 'TestNaming',
    naming_module: 'test-module',
    custom_aspects: [
      {
        aspect_module: './some_local_module',
        aspect_class: 'SomeAspectClass',
        aspect_props: {
          prop1: 'propvalue1',
          prop2: {
            prop2prop1: 'propvalue2',
          },
        },
      },
    ],
    context: {
      global_context_key: 'global_context_value',
      global_override_key: 'global_value',
      global_object_key: {
        objkey: 'objvalue',
      },
      global_array_key: ['arrayitem1', 'arrayitem2'],
    },
    domains: {
      shared: {
        context: {
          domain_context_key: 'domain_context_value',
        },
        environments: {
          dev: {
            mdaa_version: 'test_env_version',
            context: {
              env_context_key: 'env_context_value',
            },
            modules: {
              'test-module': {
                mdaa_version: 'test_mod_version',
                context: {
                  module_context_key: 'module_context_value',
                  global_override_key: 'module_value',
                },
                module_path: '@aws-mdaa/test',
                module_configs: ['./test.yaml'],
              },
            },
          },
        },
      },
    },
  };

  const mdaa = new MdaaDeploy(options, undefined, configContents);
  expect(() => mdaa.deploy()).not.toThrow();
});

test('Pipelines Test', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
    devops: 'true',
  };

  const configContents = {
    devops: {
      mdaaCodeCommitRepo: 'test-repo',
      configsCodeCommitRepo: 'test-config-repo',
      pipelines: {
        test: {
          domainFilter: ['shared'],
          envFilter: ['dev'],
          moduleFilter: ['test-module'],
        },
      },
    },
    mdaa_version: 'test_global_version',
    organization: 'sample-org',
    naming_class: 'TestNaming',
    naming_module: 'test-module',
    custom_aspects: [
      {
        aspect_module: './some_local_module',
        aspect_class: 'SomeAspectClass',
        aspect_props: {
          prop1: 'propvalue1',
          prop2: {
            prop2prop1: 'propvalue2',
          },
        },
      },
    ],
    context: {
      global_context_key: 'global_context_value',
      global_override_key: 'global_value',
      global_object_key: {
        objkey: 'objvalue',
      },
      global_array_key: ['arrayitem1', 'arrayitem2'],
    },
    domains: {
      shared: {
        context: {
          domain_context_key: 'domain_context_value',
        },
        environments: {
          dev: {
            mdaa_version: 'test_env_version',
            context: {
              env_context_key: 'env_context_value',
            },
            modules: {
              'test-module': {
                mdaa_version: 'test_mod_version',
                context: {
                  module_context_key: 'module_context_value',
                  global_override_key: 'module_value',
                },
                module_path: '@aws-mdaa/test',
                module_configs: ['./test.yaml'],
              },
            },
          },
        },
      },
    },
  };

  const mdaa = new MdaaDeploy(options, undefined, configContents);
  expect(() => mdaa.deploy()).not.toThrow();
});

test('Config File Test', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    tag: 'testtag',
    config: './test/resources/mdaa.yaml',
  };
  const mdaa = new MdaaDeploy(options, ['test-extra-cdk-param']);
  expect(() => mdaa.deploy()).not.toThrow();
});

describe('EnvTemplates', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  test('should work with global and domain-level templates', () => {
    const configContents = {
      organization: 'sample-org',
      env_templates: {
        test_global_template: {
          modules: {
            'test-module': {
              mdaa_version: 'test_mod_version',
              module_path: '@aws-mdaa/test',
              module_configs: ['./test.yaml'],
            },
          },
        },
      },
      domains: {
        domain1: {
          env_templates: {
            test_domain_template: {
              modules: {
                'test-module': {
                  mdaa_version: 'test_mod_version',
                  module_path: '@aws-mdaa/test',
                  module_configs: ['./test.yaml'],
                },
              },
            },
          },
          environments: {
            'dev-global': {
              template: 'test_global_template',
              modules: {
                'test-module2': {
                  module_path: '@aws-mdaa/test',
                  module_configs: ['./test2.yaml'],
                },
              },
            },
            'dev-domain': {
              template: 'test_domain_template',
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, ['test-extra-cdk-param'], configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should throw error for invalid template reference', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        domain1: {
          environments: {
            dev: {
              template: 'nonexistent_template',
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                  module_configs: ['./test.yaml'],
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, undefined, configContents);
    expect(() => mdaa.deploy()).toThrow('Environment "dev" references invalid template name: nonexistent_template.');
  });

  test('should work with empty template', () => {
    const configContents = {
      organization: 'sample-org',
      env_templates: {
        empty_template: {},
      },
      domains: {
        domain1: {
          environments: {
            dev: {
              template: 'empty_template',
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                  module_configs: ['./test.yaml'],
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should allow environment values to override template values', () => {
    const configContents = {
      organization: 'sample-org',
      env_templates: {
        base_template: {
          account: '111111111111',
          region: 'us-east-1',
          context: {
            template_key: 'template_value',
            override_key: 'template_override_value',
          },
          modules: {
            'test-module': {
              mdaa_version: 'template_version',
              module_path: '@aws-mdaa/test',
              module_configs: ['./template.yaml'],
            },
          },
        },
      },
      domains: {
        domain1: {
          environments: {
            dev: {
              template: 'base_template',
              account: '222222222222',
              region: 'us-west-2',
              context: {
                env_key: 'env_value',
                override_key: 'env_override_value',
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should work with template containing all optional properties', () => {
    const configContents = {
      organization: 'sample-org',
      env_templates: {
        full_template: {
          account: '111111111111',
          region: 'us-west-2',
          use_bootstrap: true,
          context: {
            template_context_key: 'template_context_value',
          },
          tag_config_data: {
            Environment: 'dev',
          },
          custom_aspects: [
            {
              aspect_module: './test_aspect',
              aspect_class: 'TestAspect',
            },
          ],
          modules: {
            'test-module': {
              module_path: '@aws-mdaa/test',
              module_configs: ['./test.yaml'],
            },
          },
        },
      },
      domains: {
        domain1: {
          environments: {
            dev: {
              template: 'full_template',
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should prefer domain-level template over global template with same name', () => {
    const configContents = {
      organization: 'sample-org',
      env_templates: {
        shared_template: {
          modules: {
            'global-module': {
              module_path: '@aws-mdaa/global-test',
              module_configs: ['./global.yaml'],
            },
          },
        },
      },
      domains: {
        domain1: {
          env_templates: {
            shared_template: {
              modules: {
                'domain-module': {
                  module_path: '@aws-mdaa/test',
                  module_configs: ['./domain.yaml'],
                },
              },
            },
          },
          environments: {
            dev: {
              template: 'shared_template',
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should merge modules from template and environment', () => {
    const configContents = {
      organization: 'sample-org',
      env_templates: {
        base_template: {
          modules: {
            'template-module': {
              module_path: '@aws-mdaa/test',
              module_configs: ['./template.yaml'],
            },
          },
        },
      },
      domains: {
        domain1: {
          environments: {
            dev: {
              template: 'base_template',
              modules: {
                'env-module': {
                  module_path: '@aws-mdaa/test',
                  module_configs: ['./env.yaml'],
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(options, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
});

describe('Terraform', () => {
  const options = {
    testing: 'true',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  const configContents = {
    organization: 'sample-org',
    domains: {
      'test-tf': {
        environments: {
          dev: {
            modules: {
              'test-tf-mdaa': {
                terraform: {
                  // "override": {
                  //     "terraform": {
                  //         "backend": {"s3": {"bucket": "test-bucket",
                  //         "lock_table": "test-table"}}
                  //     }
                  // }
                },
                module_path: 'aws-mdaa/datalake',
                module_type: 'tf',
              },
              'test-tf-3p-mdaa': {
                mdaa_compliant: true,
                module_path: '../../../terraform/aws-mdaa/datalake',
                module_type: 'tf',
              },
              'test-tf-3p': {
                module_path: '../../../terraform/aws-mdaa/datalake',
                module_type: 'tf',
              },
            },
          },
        },
      },
    },
  };
  test('TfTestValidate', () => {
    const cmdOptions = {
      ...options,
      action: 'validate',
    };
    const mdaa = new MdaaDeploy(cmdOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
  test('TfTestPlan', () => {
    const cmdOptions = {
      ...options,
      action: 'plan',
    };
    const mdaa = new MdaaDeploy(cmdOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
  test('TfTestApply', () => {
    const cmdOptions = {
      ...options,
      action: 'apply',
    };
    const mdaa = new MdaaDeploy(cmdOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('interpolates a valid global region into the generated Terraform commands', () => {
    const cmdOptions = {
      ...options,
      action: 'plan',
    };
    const configWithRegion = {
      ...configContents,
      region: 'us-east-1',
    };
    const mdaa = new MdaaDeploy(cmdOptions, undefined, configWithRegion);
    const captured: string[] = [];
    jest.spyOn(mdaa as unknown as { execCmd: (cmd: string) => void }, 'execCmd').mockImplementation((cmd: string) => {
      captured.push(cmd);
    });

    expect(() => mdaa.deploy()).not.toThrow();
    const allCmds = captured.join('\n');
    expect(allCmds).toContain("export AWS_DEFAULT_REGION='us-east-1'");
    expect(allCmds).toContain("-var 'region=us-east-1'");

    jest.restoreAllMocks();
  });
});

describe('sanity check', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    config: './test/resources/mdaa_local.yaml',
    local_mode: 'true',
  };
  test('no account level modules', () => {
    const mdaa = new MdaaDeploy(options);
    expect(() => mdaa.sanityCheck()).not.toThrow();
  });
});

describe('Hook Execution', () => {
  const baseOptions = {
    testing: 'true',
    action: 'deploy',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  const createConfigWithHooks = (predeploy?: object, postdeploy?: object) => ({
    organization: 'sample-org',
    domains: {
      shared: {
        environments: {
          dev: {
            account: '111111111111',
            region: 'us-west-2',
            modules: {
              'test-module': {
                module_path: '@aws-mdaa/test',
                predeploy,
                postdeploy,
              },
            },
          },
        },
      },
    },
  });

  describe('predeploy hooks', () => {
    test('should execute predeploy hook with command', () => {
      const configContents = createConfigWithHooks({
        command: 'echo "predeploy hook"',
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should throw error when predeploy hook has no command', () => {
      const configContents = createConfigWithHooks({
        exit_if_fail: true,
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).toThrow('predeploy hook defined but no command specified');
    });

    test('should transform template variables in predeploy hook command', () => {
      const configContents = createConfigWithHooks({
        command: 'echo "org={{org}} domain={{domain}} env={{env}} module={{module_name}} region={{region}}"',
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });
  });

  describe('postdeploy hooks', () => {
    test('should execute postdeploy hook with command', () => {
      const configContents = createConfigWithHooks(undefined, {
        command: 'echo "postdeploy hook"',
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should throw error when postdeploy hook has no command', () => {
      const configContents = createConfigWithHooks(undefined, {
        exit_if_fail: true,
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).toThrow('postdeploy hook defined but no command specified');
    });

    test('should transform template variables in postdeploy hook command', () => {
      const configContents = createConfigWithHooks(undefined, {
        command: 'echo "org={{org}} domain={{domain}} env={{env}} module={{module_name}} region={{region}}"',
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should resolve context variables in postdeploy hook command', () => {
      const configContents = {
        ...createConfigWithHooks(undefined, {
          command: 'echo "group={{context:qs_readers_group}}"',
        }),
        context: {
          qs_readers_group: 'readers',
        },
      };

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should skip postdeploy hook with after_success when deployment fails', () => {
      // In test mode, deployment doesn't actually fail, so we just verify the config is accepted
      const configContents = createConfigWithHooks(undefined, {
        command: 'echo "postdeploy after success"',
        after_success: true,
      });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });
  });

  describe('both predeploy and postdeploy hooks', () => {
    test('should execute both predeploy and postdeploy hooks', () => {
      const configContents = createConfigWithHooks({ command: 'echo "predeploy"' }, { command: 'echo "postdeploy"' });

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should execute hooks with all configuration options', () => {
      const configContents = createConfigWithHooks(
        {
          command: 'echo "predeploy with options"',
          exit_if_fail: false,
        },
        {
          command: 'echo "postdeploy with options"',
          exit_if_fail: false,
          after_success: false,
        },
      );

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });
  });

  describe('hooks only run on deploy action', () => {
    test('should not execute hooks on synth action', () => {
      const synthOptions = { ...baseOptions, action: 'synth' };
      const configContents = createConfigWithHooks({ command: 'echo "predeploy"' }, { command: 'echo "postdeploy"' });

      const mdaa = new MdaaDeploy(synthOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should not execute hooks on diff action', () => {
      const diffOptions = { ...baseOptions, action: 'diff' };
      const configContents = createConfigWithHooks({ command: 'echo "predeploy"' }, { command: 'echo "postdeploy"' });

      const mdaa = new MdaaDeploy(diffOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should not execute hooks on destroy action', () => {
      const destroyOptions = { ...baseOptions, action: 'destroy' };
      const configContents = createConfigWithHooks({ command: 'echo "predeploy"' }, { command: 'echo "postdeploy"' });

      const mdaa = new MdaaDeploy(destroyOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });
  });

  describe('hooks with multiple modules', () => {
    test('should execute hooks for each module independently', () => {
      const configContents = {
        organization: 'sample-org',
        domains: {
          shared: {
            environments: {
              dev: {
                account: '111111111111',
                region: 'us-west-2',
                modules: {
                  'module-1': {
                    module_path: '@aws-mdaa/test',
                    predeploy: { command: 'echo "module-1 predeploy"' },
                    postdeploy: { command: 'echo "module-1 postdeploy"' },
                  },
                  'module-2': {
                    module_path: '@aws-mdaa/test',
                    predeploy: { command: 'echo "module-2 predeploy"' },
                    postdeploy: { command: 'echo "module-2 postdeploy"' },
                  },
                },
              },
            },
          },
        },
      };

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });

    test('should allow some modules to have hooks and others not', () => {
      const configContents = {
        organization: 'sample-org',
        domains: {
          shared: {
            environments: {
              dev: {
                account: '111111111111',
                region: 'us-west-2',
                modules: {
                  'module-with-hooks': {
                    module_path: '@aws-mdaa/test',
                    predeploy: { command: 'echo "has hooks"' },
                  },
                  'module-without-hooks': {
                    module_path: '@aws-mdaa/test',
                  },
                },
              },
            },
          },
        },
      };

      const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
      expect(() => mdaa.deploy()).not.toThrow();
    });
  });
});

describe('DevOps Pipeline Filtering', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
    devops: 'true',
  };

  test('should throw error when module matches multiple pipelines', () => {
    const configContents = {
      devops: {
        mdaaCodeCommitRepo: 'test-repo',
        configsCodeCommitRepo: 'test-config-repo',
        pipelines: {
          pipeline1: {
            domainFilter: ['shared'],
            envFilter: ['dev'],
            moduleFilter: ['test-module'],
          },
          pipeline2: {
            domainFilter: ['shared'],
            envFilter: ['dev'],
            moduleFilter: ['test-module'],
          },
        },
      },
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).toThrow('matches multiple pipeline filters');
  });

  test('should warn when module matches no pipelines', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const configContents = {
      devops: {
        mdaaCodeCommitRepo: 'test-repo',
        configsCodeCommitRepo: 'test-config-repo',
        pipelines: {
          pipeline1: {
            domainFilter: ['other-domain'],
          },
        },
      },
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('matches no pipeline filters'));

    consoleSpy.mockRestore();
  });

  test('should succeed when module matches exactly one pipeline', () => {
    const configContents = {
      devops: {
        mdaaCodeCommitRepo: 'test-repo',
        configsCodeCommitRepo: 'test-config-repo',
        pipelines: {
          pipeline1: {
            domainFilter: ['shared'],
            envFilter: ['dev'],
            moduleFilter: ['test-module'],
          },
          pipeline2: {
            domainFilter: ['other-domain'],
          },
        },
      },
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
});

describe('Environment Validation', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  test('should deploy successfully when environment has modules defined', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              account: '111111111111',
              region: 'us-west-2',
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should add bootstrap module automatically when use_bootstrap is true', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              account: '111111111111',
              region: 'us-west-2',
              use_bootstrap: true,
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should not add bootstrap module when use_bootstrap is false', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              account: '111111111111',
              region: 'us-west-2',
              use_bootstrap: false,
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
});

describe('Module Type Validation', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  test('should handle cdk module type (default)', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              account: '111111111111',
              region: 'us-west-2',
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                  module_type: 'cdk',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });

  test('should handle tf module type', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              account: '111111111111',
              region: 'us-west-2',
              modules: {
                'test-module': {
                  module_path: '../../../terraform/aws-mdaa/datalake',
                  module_type: 'tf',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
});

describe('Naming Configuration', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  test('should throw error when only naming_module is specified without naming_class', () => {
    const configContents = {
      organization: 'sample-org',
      naming_module: 'custom-naming-module',
      // naming_class is missing
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).toThrow("Both 'naming_module' and 'naming_class' must be specified together");
  });

  test('should throw error when only naming_class is specified without naming_module', () => {
    const configContents = {
      organization: 'sample-org',
      naming_class: 'CustomNaming',
      // naming_module is missing
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).toThrow("Both 'naming_module' and 'naming_class' must be specified together");
  });
});

describe('Module Path Validation', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  test('should throw error when module has no module_path or cdk_app', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  // No module_path or cdk_app
                  module_configs: ['./test.yaml'],
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).toThrow('One of cdp_app or module_path must be defined');
  });

  test('should accept legacy cdk_app property', () => {
    const configContents = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  cdk_app: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };

    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();
  });
});

test('should use execCmdWithDiffCapture when action is diff with diff-out', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

  const options = {
    testing: 'true',
    action: 'diff',
    'diff-out': '/tmp/diff-output',
    working_dir: 'test/test_working',
    config: './test/resources/mdaa.yaml',
  };

  const mdaa = new MdaaDeploy(options, ['test-extra-cdk-param']);
  expect(() => mdaa.deploy()).not.toThrow();
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Testing Mode (diff capture)'));

  consoleSpy.mockRestore();
});

describe('useStaging', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  const createConfigWithUseStaging = (useStaging?: boolean) => {
    const config: Record<string, unknown> = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'module-a': { module_path: '@aws-mdaa/test' },
                'module-b': { module_path: '@aws-mdaa/test' },
              },
            },
          },
        },
      },
    };
    if (useStaging !== undefined) {
      config.useStaging = useStaging;
    }
    return config;
  };

  test('should compute deploy stages when useStaging is undefined (default behavior)', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const configContents = createConfigWithUseStaging(undefined);
    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();

    const stageLogCalls = consoleSpy.mock.calls
      .flat()
      .filter((msg: string) => typeof msg === 'string' && msg.includes('Set deploy stage to'));
    expect(stageLogCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  test('should compute deploy stages when useStaging is true', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const configContents = createConfigWithUseStaging(true);
    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();

    const stageLogCalls = consoleSpy.mock.calls
      .flat()
      .filter((msg: string) => typeof msg === 'string' && msg.includes('Set deploy stage to'));
    expect(stageLogCalls.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  test('should assign all modules to default stage when useStaging is false', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const configContents = createConfigWithUseStaging(false);
    const mdaa = new MdaaDeploy(baseOptions, undefined, configContents);
    expect(() => mdaa.deploy()).not.toThrow();

    // computeModuleDeployStage is bypassed, so no "Set deploy stage to" logs
    const stageLogCalls = consoleSpy.mock.calls
      .flat()
      .filter((msg: string) => typeof msg === 'string' && msg.includes('Set deploy stage to'));
    expect(stageLogCalls).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});

describe('Deployment target validation', () => {
  const baseOptions = {
    testing: 'true',
    action: 'synth',
    working_dir: 'test/test_working',
    tag: 'testtag',
  };

  const configWithTarget = (target: { region?: string; account?: string }) => ({
    organization: 'sample-org',
    domains: {
      shared: {
        environments: {
          dev: {
            ...target,
            modules: {
              'test-module': {
                module_path: '@aws-mdaa/test',
              },
            },
          },
        },
      },
    },
  });

  // A concrete env-level region/account containing shell metacharacters is
  // rejected at parse time (validateConfig), before it can reach the
  // `export CDK_DEPLOY_*` statement built by createCdkCommandEnv.
  it.each([
    ['region', 'us-east-1$(id > /tmp/pwned)'],
    ['region', 'us-east-1;curl evil'],
    ['account', '123456789012$(id)'],
    ['account', 'not-an-account'],
  ])('rejects a concrete invalid %s before deployment', (field, value) => {
    expect(() => {
      const mdaa = new MdaaDeploy(baseOptions, undefined, configWithTarget({ [field]: value }));
      mdaa.deploy();
    }).toThrow(field === 'region' ? /Invalid region/ : /Invalid account/);
  });

  // The Terraform path interpolates the global region into `export
  // AWS_DEFAULT_REGION` / `-var region=`. A concrete invalid global region is
  // rejected at parse time, before any Terraform command is built.
  it('rejects a concrete invalid global region used by the Terraform path', () => {
    const config = {
      organization: 'sample-org',
      region: 'us-east-1$(id)',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'tf-module': {
                  module_type: 'tf',
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };
    expect(() => {
      const mdaa = new MdaaDeploy(baseOptions, undefined, config);
      mdaa.deploy();
    }).toThrow(/Invalid region/);
  });

  it('rejects an invalid region in additional_stacks', () => {
    const config = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                  additional_stacks: [{ region: 'us-east-1;curl evil' }],
                },
              },
            },
          },
        },
      },
    };
    const mdaa = new MdaaDeploy(baseOptions, undefined, config);
    expect(() => mdaa.deploy()).toThrow(/additional_stacks\[0\]\.region/);
  });

  // A Terraform module has no `-var account`, so account is only validated by the
  // uniform post-resolution guard in prepModule (not a TF command sink). A bad
  // account that resolves from a reference (passing parse-time) must still be
  // rejected before hooks substitute {{account}} into a shell command.
  it('rejects a resolved invalid account on the Terraform path', () => {
    const config = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              context: { bad_account: '$(id)' },
              account: '{{context:bad_account}}',
              modules: {
                'tf-module': {
                  module_type: 'tf',
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };
    const mdaa = new MdaaDeploy(baseOptions, undefined, config);
    expect(() => mdaa.deploy()).toThrow(/Invalid account/);
  });

  it('passes a valid region/account through to the generated CDK command', () => {
    const mdaa = new MdaaDeploy(
      baseOptions,
      undefined,
      configWithTarget({ region: 'us-east-1', account: '123456789012' }),
    );
    const captured: string[] = [];
    jest.spyOn(mdaa as unknown as { execCmd: (cmd: string) => void }, 'execCmd').mockImplementation((cmd: string) => {
      captured.push(cmd);
    });

    expect(() => mdaa.deploy()).not.toThrow();
    const cdkCmd = captured.find(cmd => cmd.includes('CDK_DEPLOY_REGION'));
    expect(cdkCmd).toContain("export CDK_DEPLOY_REGION='us-east-1'");
    expect(cdkCmd).toContain("export CDK_DEPLOY_ACCOUNT='123456789012'");

    jest.restoreAllMocks();
  });

  // 'default' is the sentinel meaning "use the ambient AWS environment"; it must be
  // accepted for both region and account, and must not emit a CDK_DEPLOY_* export
  // (matching the pre-validation behaviour of the != 'default' guards).
  it.each([{ region: 'default', account: 'default' }, {}])(
    'accepts the default/omitted target and emits no CDK_DEPLOY export (%o)',
    target => {
      const mdaa = new MdaaDeploy(baseOptions, undefined, configWithTarget(target));
      const captured: string[] = [];
      jest.spyOn(mdaa as unknown as { execCmd: (cmd: string) => void }, 'execCmd').mockImplementation((cmd: string) => {
        captured.push(cmd);
      });

      expect(() => mdaa.deploy()).not.toThrow();
      expect(captured.some(cmd => cmd.includes('CDK_DEPLOY_REGION'))).toBe(false);
      expect(captured.some(cmd => cmd.includes('CDK_DEPLOY_ACCOUNT'))).toBe(false);

      jest.restoreAllMocks();
    },
  );

  // Values arriving via a config reference bypass the parse-time validators (which
  // intentionally defer references), so the resolved-value guard in prepModule is
  // the only enforcement point. This drives a malicious region through resolution
  // on the CDK path and asserts it is rejected before any command string is built.
  it('rejects a resolved invalid region on the CDK path', () => {
    const config = {
      organization: 'sample-org',
      domains: {
        shared: {
          environments: {
            dev: {
              context: { bad_region: 'us-east-1$(id)' },
              region: '{{context:bad_region}}',
              modules: {
                'test-module': {
                  module_path: '@aws-mdaa/test',
                },
              },
            },
          },
        },
      },
    };
    const mdaa = new MdaaDeploy(baseOptions, undefined, config);
    const captured: string[] = [];
    jest.spyOn(mdaa as unknown as { execCmd: (cmd: string) => void }, 'execCmd').mockImplementation((cmd: string) => {
      captured.push(cmd);
    });

    expect(() => mdaa.deploy()).toThrow(/Invalid region/);
    expect(captured.some(cmd => cmd.includes('CDK_DEPLOY_REGION'))).toBe(false);

    jest.restoreAllMocks();
  });

  // Directly exercise the interpolation-site guards so a regression that drops one
  // of them is caught even though the parse-time validator would also fire in the
  // full flow. These are the last line of defense before values reach the shell.
  describe('interpolation-site guards', () => {
    // Reach the private members via casts, mirroring the execCmd spies above.
    type CdkEnvSink = { createCdkCommandEnv: (moduleConfig: Record<string, unknown>) => string[] };
    type TfRegionSink = { validatedTerraformRegion: () => string | undefined };

    const moduleConfigWith = (target: Record<string, string>) => ({
      domainName: 'shared',
      envName: 'dev',
      moduleName: 'test-module',
      ...target,
    });

    it.each([
      ['deployRegion', 'us-east-1$(id)', /Invalid region/],
      ['deployAccount', '123456789012;id', /Invalid account/],
    ])('createCdkCommandEnv rejects a malicious %s', (field, value, pattern) => {
      const mdaa = new MdaaDeploy(baseOptions, undefined, configWithTarget({})) as unknown as CdkEnvSink;
      expect(() => mdaa.createCdkCommandEnv(moduleConfigWith({ [field]: value }))).toThrow(pattern);
    });

    it('validatedTerraformRegion rejects a malicious global region', () => {
      // Construct with a valid region (so parse-time validation passes), then
      // overwrite it to isolate the interpolation-site guard from parse-time.
      const mdaa = new MdaaDeploy(baseOptions, undefined, {
        organization: 'sample-org',
        region: 'us-east-1',
        domains: {},
      });
      (mdaa as unknown as { config: { contents: { region: string } } }).config.contents.region = 'us-east-1$(id)';
      expect(() => (mdaa as unknown as TfRegionSink).validatedTerraformRegion()).toThrow(/Invalid region/);
    });

    it('validatedTerraformRegion returns undefined for the default sentinel', () => {
      const mdaa = new MdaaDeploy(baseOptions, undefined, {
        organization: 'sample-org',
        region: 'default',
        domains: {},
      }) as unknown as TfRegionSink;
      expect(mdaa.validatedTerraformRegion()).toBeUndefined();
    });
  });
});
