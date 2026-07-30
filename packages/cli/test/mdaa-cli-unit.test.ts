/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EffectiveConfig, ModuleDeploymentConfig } from '../lib/config-types';
import { generateContextCdkParams } from '../lib/utils';
import { MdaaDeploy } from '../lib/mdaa-cli';
import { HookConfig } from '../lib/mdaa-cli-config-parser';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as packageHelper from '../lib/package-helper';
import * as platformUtils from '../lib/platform-utils';

describe('generateContextCdkParams', () => {
  it('should handle empty context object', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {},
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toEqual([]);
  });

  it('should handle string values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        region: 'us-east-1',
        environment: 'prod',
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'region=us-east-1'`);
    expect(result).toContain(`-c 'environment=prod'`);
    expect(result.length).toBe(2);
  });

  it('should handle boolean values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        debug: true,
        verbose: false,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'debug=true'`);
    expect(result).toContain(`-c 'verbose=false'`);
    expect(result.length).toBe(2);
  });

  it('should handle array values', () => {
    const array = ['a', 'b', 'c'];
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        items: array,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    const expectedValue = `-c 'items="list:${JSON.stringify(array)}"'`;
    expect(result).toContain(expectedValue);
    expect(result.length).toBe(1);
  });

  it('should handle object values', () => {
    const obj = { key1: 'value1', key2: 'value2' };
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        config: obj,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    const expectedValue = `-c 'config="obj:${JSON.stringify(obj)}"'`;
    expect(result).toContain(expectedValue);
    expect(result.length).toBe(1);
  });

  it('should handle mixed types', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        name: 'test',
        enabled: true,
        tags: ['tag1', 'tag2'],
        settings: { timeout: 30 },
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'name=test'`);
    expect(result).toContain(`-c 'enabled=true'`);
    expect(result.length).toBe(4);
  });

  it('should handle number values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        port: 8080,
        timeout: 30,
        ratio: 0.75,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'port=8080'`);
    expect(result).toContain(`-c 'timeout=30'`);
    expect(result).toContain(`-c 'ratio=0.75'`);
    expect(result.length).toBe(3);
  });

  it('should throw error for unsupported types', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        value: Symbol('test'), // Symbol type is not handled
      },
    } as unknown as EffectiveConfig;

    expect(() => generateContextCdkParams(moduleConfig)).toThrow("Don't know how to handle type symbol: Symbol(test)");
  });

  it('should handle special characters in string values', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        path: '/usr/local/bin',
        query: 'name=value&other=123',
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    expect(result).toContain(`-c 'path=/usr/local/bin'`);
    expect(result).toContain(`-c 'query=name=value&other=123'`);
  });

  it('should handle nested objects and arrays', () => {
    const complexObj = {
      nested: {
        array: [1, 2, 3],
        obj: { a: 'b' },
      },
    };

    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        complex: complexObj,
      },
    } as unknown as EffectiveConfig;

    const result = generateContextCdkParams(moduleConfig);

    const expectedValue = `-c 'complex="obj:${JSON.stringify(complexObj)}"'`;
    expect(result).toContain(expectedValue);
  });
});

describe('MdaaDeploy.deployModule', () => {
  let mdaaDeploy: MdaaDeploy;
  let mockExecCmd: jest.SpyInstance;

  const createMockModuleConfig = (overrides: Partial<ModuleDeploymentConfig> = {}): ModuleDeploymentConfig =>
    ({
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      modulePath: '/test/path',
      moduleCmds: ['npm run build', 'npm run deploy'],
      localModule: false,
      useBootstrap: true,
      effectiveContext: {},
      effectiveTagConfig: {},
      tagConfigFiles: [],
      effectiveMdaaVersion: '1.0.0',
      customAspects: [],
      deployAccount: 'test-account',
      deployRegion: 'us-east-1',
      moduleType: 'cdk',
      effectiveModuleConfig: {},
      ...overrides,
    }) as ModuleDeploymentConfig;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});

    // Create MdaaDeploy instance with minimal options for testing
    const options = {
      action: 'deploy',
      testing: 'true', // Enable test mode to prevent actual command execution
    };
    mdaaDeploy = new MdaaDeploy(options, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                },
              },
            },
          },
        },
      },
    });

    // Mock the execCmd method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockExecCmd = jest.spyOn(mdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('basic deployment functionality', () => {
    it('should execute module commands in correct order', () => {
      const moduleConfig = createMockModuleConfig({
        moduleCmds: ['command1', 'command2', 'command3'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(3);
      expect(mockExecCmd).toHaveBeenNthCalledWith(1, "cd '/test/path' && command1");
      expect(mockExecCmd).toHaveBeenNthCalledWith(2, "cd '/test/path' && command2");
      expect(mockExecCmd).toHaveBeenNthCalledWith(3, "cd '/test/path' && command3");
    });

    it('should reverse command order for destroy action', () => {
      const options = {
        action: 'destroy',
        testing: 'true',
      };
      const destroyMdaaDeploy = new MdaaDeploy(options, [], {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                modules: {
                  'test-module': {
                    module_path: '@test/module',
                  },
                },
              },
            },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDestroyExecCmd = jest.spyOn(destroyMdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());

      const moduleConfig = createMockModuleConfig({
        moduleCmds: ['command1', 'command2', 'command3'],
      });

      destroyMdaaDeploy.deployModule(moduleConfig);

      expect(mockDestroyExecCmd).toHaveBeenCalledTimes(3);
      expect(mockDestroyExecCmd).toHaveBeenNthCalledWith(1, "cd '/test/path' && command3");
      expect(mockDestroyExecCmd).toHaveBeenNthCalledWith(2, "cd '/test/path' && command2");
      expect(mockDestroyExecCmd).toHaveBeenNthCalledWith(3, "cd '/test/path' && command1");
    });
  });

  describe('predeploy hook functionality', () => {
    it('should execute predeploy hook before module commands', () => {
      const predeployHook: HookConfig = {
        command: './scripts/predeploy.sh',
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        moduleCmds: ['main-command'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(2);
      expect(mockExecCmd).toHaveBeenNthCalledWith(1, './scripts/predeploy.sh');
      expect(mockExecCmd).toHaveBeenNthCalledWith(2, "cd '/test/path' && main-command");
    });

    it('should not execute predeploy hook for non-deploy actions', () => {
      const options = {
        action: 'synth',
        testing: 'true',
      };
      const synthMdaaDeploy = new MdaaDeploy(options, [], {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                modules: {
                  'test-module': {
                    module_path: '@test/module',
                  },
                },
              },
            },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockSynthExecCmd = jest.spyOn(synthMdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());

      const predeployHook: HookConfig = {
        command: './scripts/predeploy.sh',
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        moduleCmds: ['main-command'],
      });

      synthMdaaDeploy.deployModule(moduleConfig);

      expect(mockSynthExecCmd).toHaveBeenCalledTimes(1);
      expect(mockSynthExecCmd).toHaveBeenCalledWith("cd '/test/path' && main-command");
    });

    it('should throw error when predeploy hook has no command', () => {
      const predeployHook: HookConfig = {
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        moduleCmds: ['main-command'],
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('predeploy hook defined but no command specified');
    });

    it('should exit deployment when predeploy hook fails and exit_if_fail is true', () => {
      const predeployHook: HookConfig = {
        command: './scripts/failing-predeploy.sh',
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        moduleCmds: ['main-command'],
      });

      // Mock execCmd to throw error on predeploy hook
      mockExecCmd.mockImplementation((cmd: string) => {
        if (cmd.includes('failing-predeploy.sh')) {
          throw new Error('Predeploy hook failed');
        }
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('Exiting deployment due to predeploy hook failure');
      expect(mockExecCmd).toHaveBeenCalledTimes(1); // Only predeploy hook, main command not executed
    });

    it('should continue deployment when predeploy hook fails and exit_if_fail is false', () => {
      const predeployHook: HookConfig = {
        command: './scripts/failing-predeploy.sh',
        exit_if_fail: false,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        moduleCmds: ['main-command'],
      });

      // Mock execCmd to throw error on predeploy hook
      mockExecCmd.mockImplementation((cmd: string) => {
        if (cmd.includes('failing-predeploy.sh')) {
          throw new Error('Predeploy hook failed');
        }
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).not.toThrow();
      expect(mockExecCmd).toHaveBeenCalledTimes(2); // Both predeploy hook and main command
    });
  });

  describe('postdeploy hook functionality', () => {
    it('should execute postdeploy hook after successful module commands', () => {
      const postdeployHook: HookConfig = {
        command: './scripts/postdeploy.sh',
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(2);
      expect(mockExecCmd).toHaveBeenNthCalledWith(1, "cd '/test/path' && main-command");
      expect(mockExecCmd).toHaveBeenNthCalledWith(2, './scripts/postdeploy.sh');
    });

    it('should not execute postdeploy hook when after_success is true and deployment fails', () => {
      const postdeployHook: HookConfig = {
        command: './scripts/postdeploy.sh',
        after_success: true,
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['failing-command'],
      });

      // Mock execCmd to throw error on main command
      mockExecCmd.mockImplementation((cmd: string) => {
        if (cmd.includes('failing-command')) {
          throw new Error('Main command failed');
        }
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('Main command failed');
      expect(mockExecCmd).toHaveBeenCalledTimes(1); // Only main command, postdeploy not executed
    });

    it('should execute postdeploy hook when after_success is false even if deployment fails', () => {
      const postdeployHook: HookConfig = {
        command: './scripts/postdeploy.sh',
        after_success: false,
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['failing-command'],
      });

      // Mock execCmd to throw error on main command but not postdeploy
      mockExecCmd.mockImplementation((cmd: string) => {
        if (cmd.includes('failing-command')) {
          throw new Error('Main command failed');
        }
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('Main command failed');
      expect(mockExecCmd).toHaveBeenCalledTimes(2); // Both main command and postdeploy executed
    });

    it('should not execute postdeploy hook for non-deploy actions', () => {
      const options = {
        action: 'diff',
        testing: 'true',
      };
      const diffMdaaDeploy = new MdaaDeploy(options, [], {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                modules: {
                  'test-module': {
                    module_path: '@test/module',
                  },
                },
              },
            },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockDiffExecCmd = jest.spyOn(diffMdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());

      const postdeployHook: HookConfig = {
        command: './scripts/postdeploy.sh',
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
      });

      diffMdaaDeploy.deployModule(moduleConfig);

      expect(mockDiffExecCmd).toHaveBeenCalledTimes(1);
      expect(mockDiffExecCmd).toHaveBeenCalledWith("cd '/test/path' && main-command");
    });

    it('should throw error when postdeploy hook has no command', () => {
      const postdeployHook: HookConfig = {
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('postdeploy hook defined but no command specified');
    });

    it('should resolve context variables in postdeploy hook command', () => {
      const postdeployHook: HookConfig = {
        command: './scripts/setup.sh {{context:my_group}} {{context:my_region}}',
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
        effectiveContext: {
          my_group: 'readers',
          my_region: 'us-west-2',
        },
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenNthCalledWith(2, './scripts/setup.sh readers us-west-2');
    });
  });

  describe('combined hook functionality', () => {
    it('should execute both predeploy and postdeploy hooks in correct order', () => {
      const predeployHook: HookConfig = {
        command: './scripts/predeploy.sh',
      };

      const postdeployHook: HookConfig = {
        command: './scripts/postdeploy.sh',
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(3);
      expect(mockExecCmd).toHaveBeenNthCalledWith(1, './scripts/predeploy.sh');
      expect(mockExecCmd).toHaveBeenNthCalledWith(2, "cd '/test/path' && main-command");
      expect(mockExecCmd).toHaveBeenNthCalledWith(3, './scripts/postdeploy.sh');
    });

    it('should handle complex hook failure scenarios', () => {
      const predeployHook: HookConfig = {
        command: './scripts/predeploy.sh',
        exit_if_fail: false,
      };

      const postdeployHook: HookConfig = {
        command: './scripts/postdeploy.sh',
        exit_if_fail: true,
        after_success: false,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        postdeploy: postdeployHook,
        moduleCmds: ['failing-main-command'],
      });

      // Mock execCmd to throw errors on predeploy and main command
      mockExecCmd.mockImplementation((cmd: string) => {
        if (cmd.includes('predeploy.sh') || cmd.includes('failing-main-command')) {
          throw new Error('Command failed');
        }
      });

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('Command failed');
      expect(mockExecCmd).toHaveBeenCalledTimes(3); // All commands executed despite failures
    });

    it('should transform template variables in hook commands', () => {
      const predeployHook: HookConfig = {
        command:
          './scripts/deploy-{{org}}-{{domain}}-{{env}}-{{module_name}}.sh --region {{region}} --account {{account}}',
        exit_if_fail: true,
      };

      const postdeployHook: HookConfig = {
        command: 'echo "Deployed to {{org}}/{{domain}}/{{env}}/{{module_name}} in {{region}} ({{account}})"',
        exit_if_fail: false,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(3);
      // Verify template variables are transformed
      expect(mockExecCmd).toHaveBeenNthCalledWith(
        1,
        './scripts/deploy-test-org-test-domain-test-env-test-module.sh --region us-east-1 --account test-account',
      );
      expect(mockExecCmd).toHaveBeenNthCalledWith(2, "cd '/test/path' && main-command");
      expect(mockExecCmd).toHaveBeenNthCalledWith(
        3,
        'echo "Deployed to test-org/test-domain/test-env/test-module in us-east-1 (test-account)"',
      );
    });
  });
});

describe('MdaaDeploy.execCmd', () => {
  let mdaaDeploy: MdaaDeploy;
  let mockExecSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});

    const options = {
      action: 'deploy',
    };
    mdaaDeploy = new MdaaDeploy(options, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                },
              },
            },
          },
        },
      },
    });

    mockExecSync = jest.spyOn(childProcess, 'execSync').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should execute command in normal mode', () => {
    const testCommand = 'echo "test command"';

    mdaaDeploy.execCmd(testCommand);

    expect(mockExecSync).toHaveBeenCalledWith(testCommand, {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
  });

  it('should not execute command in test mode', () => {
    const options = {
      action: 'deploy',
      testing: 'true',
    };
    const testMdaaDeploy = new MdaaDeploy(options, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                },
              },
            },
          },
        },
      },
    });

    const testCommand = 'echo "test command"';

    testMdaaDeploy.execCmd(testCommand);

    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('should handle command execution errors when noFail is false', () => {
    const testCommand = 'failing-command';
    const testError = { status: 1, signal: null, message: 'Command failed' };

    mockExecSync.mockImplementation(() => {
      throw testError;
    });

    expect(() => mdaaDeploy.execCmd(testCommand)).toThrow();
    expect(mockExecSync).toHaveBeenCalledWith(testCommand, {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
  });

  it('should not throw when noFail is true and command fails', () => {
    const options = {
      action: 'deploy',
      nofail: 'true',
    };
    const noFailMdaaDeploy = new MdaaDeploy(options, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                },
              },
            },
          },
        },
      },
    });

    const testCommand = 'failing-command';
    const testError = { status: 1, signal: null, message: 'Command failed' };

    mockExecSync.mockImplementation(() => {
      throw testError;
    });

    expect(() => noFailMdaaDeploy.execCmd(testCommand)).not.toThrow();
    expect(mockExecSync).toHaveBeenCalledWith(testCommand, {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
  });

  it('should handle shell script commands ending with .sh', () => {
    const testCommand = './scripts/deploy.sh';
    const testError = { status: 1, signal: null, message: 'Script failed' };

    mockExecSync.mockImplementation(() => {
      throw testError;
    });

    expect(() => mdaaDeploy.execCmd(testCommand)).toThrow();
    expect(mockExecSync).toHaveBeenCalledWith(testCommand, {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
  });

  it('should handle regular Error objects', () => {
    const testCommand = 'failing-command';
    const testError = new Error('Regular error message');

    mockExecSync.mockImplementation(() => {
      throw testError;
    });

    expect(() => mdaaDeploy.execCmd(testCommand)).toThrow('Regular error message');
    expect(mockExecSync).toHaveBeenCalledWith(testCommand, {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
  });
});

describe('addOptionalCdkContextStringParam', () => {
  let mdaaDeploy: MdaaDeploy;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mdaaDeploy = new MdaaDeploy({ action: 'deploy', testing: 'true' }, [], {
      organization: 'test-org',
      domains: {},
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add string param when value is provided', () => {
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextStringParam(cdkCmd, 'test_key', 'test_value');
    expect(cdkCmd).toEqual([`-c 'test_key="test_value"'`]);
  });

  it('should not add param when value is undefined', () => {
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextStringParam(cdkCmd, 'test_key', undefined);
    expect(cdkCmd).toEqual([]);
  });

  it('should not add param when value is empty string', () => {
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextStringParam(cdkCmd, 'test_key', '');
    expect(cdkCmd).toEqual([]);
  });
});

describe('addOptionalCdkContextObjParam', () => {
  let mdaaDeploy: MdaaDeploy;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mdaaDeploy = new MdaaDeploy({ action: 'deploy', testing: 'true' }, [], {
      organization: 'test-org',
      domains: {},
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add double-stringified JSON for object values', () => {
    const cdkCmd: string[] = [];
    const testObj = { key: 'value', nested: { a: 1 } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextObjParam(cdkCmd, 'config', testObj);
    const expected = JSON.stringify(JSON.stringify(testObj));
    expect(cdkCmd).toEqual([`-c 'config'=${expected}`]);
  });

  it('should add double-stringified JSON for array values', () => {
    const cdkCmd: string[] = [];
    const testArray = [{ name: 'item1' }, { name: 'item2' }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextObjParam(cdkCmd, 'items', testArray);
    const expected = JSON.stringify(JSON.stringify(testArray));
    expect(cdkCmd).toEqual([`-c 'items'=${expected}`]);
  });

  it('should not add param when value is undefined', () => {
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextObjParam(cdkCmd, 'config', undefined);
    expect(cdkCmd).toEqual([]);
  });

  it('should not add param when object is empty', () => {
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextObjParam(cdkCmd, 'config', {});
    expect(cdkCmd).toEqual([]);
  });

  it('should not add param when array is empty', () => {
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addOptionalCdkContextObjParam(cdkCmd, 'items', []);
    expect(cdkCmd).toEqual([]);
  });
});

describe('MdaaDeploy baseline diff options', () => {
  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cdk-out option', () => {
    it('should use custom cdk-out directory when provided', () => {
      const options = {
        action: 'synth',
        testing: 'true',
        'cdk-out': '/custom/cdk/out',
      };
      const mdaaDeploy = new MdaaDeploy(options, [], {
        organization: 'test-org',
        domains: {},
      });

      // Access private property to verify it was set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mdaaDeploy as any).cdkOutDir).toContain('/custom/cdk/out');
    });

    it('should use default working dir when cdk-out not provided', () => {
      const options = {
        action: 'synth',
        testing: 'true',
      };
      const mdaaDeploy = new MdaaDeploy(options, [], {
        organization: 'test-org',
        domains: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mdaaDeploy as any).cdkOutDir).toBeUndefined();
    });
  });

  describe('diff-out option', () => {
    it('should set diffOutDir when provided', () => {
      const options = {
        action: 'diff',
        testing: 'true',
        'diff-out': '/custom/diff/out',
      };
      const mdaaDeploy = new MdaaDeploy(options, [], {
        organization: 'test-org',
        domains: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mdaaDeploy as any).diffOutDir).toContain('/custom/diff/out');
    });
  });
});

// Note: Testing resolveConfigFilePath validation requires complex fs mocking that conflicts with
// other parts of the MdaaDeploy constructor. The validation logic is tested indirectly
// through integration tests. The key behaviors are:
// - If config path is a directory, throws "Config path '...' is a directory"
// - If config path doesn't exist, throws "Cannot open config file at '...'"

describe('MdaaDeploy.validateBaselineDir', () => {
  let mockExistsSync: jest.SpyInstance;
  let mockStatSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(require('fs'), 'existsSync'); // eslint-disable-line @typescript-eslint/no-require-imports
    mockStatSync = jest.spyOn(require('fs'), 'statSync'); // eslint-disable-line @typescript-eslint/no-require-imports
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw error when baseline directory does not exist', () => {
    mockExistsSync.mockImplementation((path: string) => {
      return !path.includes('nonexistent');
    });
    mockStatSync.mockReturnValue({ isDirectory: () => false });

    expect(() => {
      new MdaaDeploy({ action: 'diff', baseline: '/nonexistent/baseline' }, [], {
        organization: 'test-org',
        domains: {},
      });
    }).toThrow("Baseline directory '/nonexistent/baseline' does not exist");
  });

  it('should throw error when baseline path is not a directory', () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockImplementation((path: string) => {
      if (path.includes('baseline')) {
        return { isDirectory: () => false };
      }
      return { isDirectory: () => false };
    });

    expect(() => {
      new MdaaDeploy({ action: 'diff', baseline: '/path/to/file.txt' }, [], {
        organization: 'test-org',
        domains: {},
      });
    }).toThrow("Baseline path '/path/to/file.txt' is not a directory");
  });
});

describe('MdaaDeploy.findTemplateFile', () => {
  let mdaaDeploy: MdaaDeploy;
  let mockExistsSync: jest.SpyInstance;
  let mockStatSync: jest.SpyInstance;
  let mockReaddirSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(require('fs'), 'existsSync'); // eslint-disable-line @typescript-eslint/no-require-imports
    mockStatSync = jest.spyOn(require('fs'), 'statSync'); // eslint-disable-line @typescript-eslint/no-require-imports
    mockReaddirSync = jest.spyOn(require('fs'), 'readdirSync'); // eslint-disable-line @typescript-eslint/no-require-imports

    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });

    mdaaDeploy = new MdaaDeploy({ action: 'diff', testing: 'true' }, [], {
      organization: 'test-org',
      domains: {},
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should find template file in directory', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['manifest.json', 'tree.json', 'my-stack.template.json', 'cdk.out']);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (mdaaDeploy as any).findTemplateFile('/path/to/baseline');

    expect(result).toContain('my-stack.template.json');
  });

  it('should return undefined when no template file exists', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['manifest.json', 'tree.json', 'cdk.out']);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (mdaaDeploy as any).findTemplateFile('/path/to/baseline');

    expect(result).toBeUndefined();
  });

  it('should return undefined when baseline path does not exist', () => {
    mockExistsSync.mockReturnValue(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (mdaaDeploy as any).findTemplateFile('/nonexistent/path');

    expect(result).toBeUndefined();
  });
});

describe('MdaaDeploy.execCmdWithDiffCapture', () => {
  let mockSpawnSync: jest.SpyInstance;
  let mockExistsSync: jest.SpyInstance;
  let mockStatSync: jest.SpyInstance;
  let mockWriteFileSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockSpawnSync = jest.spyOn(childProcess, 'spawnSync');
    mockExistsSync = jest.spyOn(require('fs'), 'existsSync'); // eslint-disable-line @typescript-eslint/no-require-imports
    mockStatSync = jest.spyOn(require('fs'), 'statSync'); // eslint-disable-line @typescript-eslint/no-require-imports
    mockWriteFileSync = jest.spyOn(require('fs'), 'writeFileSync').mockImplementation(jest.fn()); // eslint-disable-line @typescript-eslint/no-require-imports

    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should capture diff output and write to file', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'Stack TestStack\n[+] AWS::S3::Bucket NewBucket',
      stderr: '',
      status: 1,
    });

    // Create instance without testing mode to actually execute
    const mdaaDeploy = new MdaaDeploy({ action: 'diff', 'diff-out': '/diff/output' }, [], {
      organization: 'test-org',
      domains: {},
    });
    jest.spyOn(mdaaDeploy, 'execCmd').mockImplementation(jest.fn());

    const moduleConfig = {
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).execCmdWithDiffCapture('cdk diff', moduleConfig);

    expect(mockWriteFileSync).toHaveBeenCalled();
    const writeCall = mockWriteFileSync.mock.calls[0];
    expect(writeCall[0]).toContain('diff.txt');
    expect(writeCall[1]).toContain('Stack TestStack');
  });

  it('should detect changes when exit code is non-zero', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

    mockSpawnSync.mockReturnValue({
      stdout: 'Stack TestStack\n[+] AWS::S3::Bucket NewBucket',
      stderr: '',
      status: 1,
    });

    const mdaaDeploy = new MdaaDeploy({ action: 'diff', 'diff-out': '/diff/output' }, [], {
      organization: 'test-org',
      domains: {},
    });
    jest.spyOn(mdaaDeploy, 'execCmd').mockImplementation(jest.fn());

    const moduleConfig = {
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).execCmdWithDiffCapture('cdk diff', moduleConfig);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Changes detected'));
    consoleSpy.mockRestore();
  });

  it('should detect no changes when output contains "no differences"', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

    mockSpawnSync.mockReturnValue({
      stdout: 'Stack TestStack\nThere were no differences',
      stderr: '',
      status: 0,
    });

    const mdaaDeploy = new MdaaDeploy({ action: 'diff', 'diff-out': '/diff/output' }, [], {
      organization: 'test-org',
      domains: {},
    });
    jest.spyOn(mdaaDeploy, 'execCmd').mockImplementation(jest.fn());

    const moduleConfig = {
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).execCmdWithDiffCapture('cdk diff', moduleConfig);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No changes'));
    consoleSpy.mockRestore();
  });

  it('should skip execution in test mode', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

    const mdaaDeploy = new MdaaDeploy({ action: 'diff', testing: 'true', 'diff-out': '/diff/output' }, [], {
      organization: 'test-org',
      domains: {},
    });

    const moduleConfig = {
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).execCmdWithDiffCapture('cdk diff', moduleConfig);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Testing Mode'));
    expect(mockSpawnSync).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should throw on exit code >= 2 (real diff failure)', () => {
    mockSpawnSync.mockReturnValue({
      stdout: 'Error: some CDK error',
      stderr: '',
      status: 2,
    });

    const mdaaDeploy = new MdaaDeploy({ action: 'diff', 'diff-out': '/diff/output' }, [], {
      organization: 'test-org',
      domains: {},
    });
    jest.spyOn(mdaaDeploy, 'execCmd').mockImplementation(jest.fn());

    const moduleConfig = {
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
    };

    // Should still write the diff.txt for debugging, but then throw
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mdaaDeploy as any).execCmdWithDiffCapture('cdk diff', moduleConfig);
    }).toThrow(/Diff failed for module.*exit code 2/);

    // Verify output was still written before the throw
    expect(mockWriteFileSync).toHaveBeenCalled();
    const writeCall = mockWriteFileSync.mock.calls[0];
    expect(writeCall[0]).toContain('diff.txt');
  });
});

describe('permissions_boundary_arn injection', () => {
  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should inject top-level permissions_boundary_arn into CDK command', () => {
    const mdaaDeploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/top-level-boundary',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: { 'test-module': { module_path: '@test/module' } },
            },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockExecCmd = jest.spyOn(mdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());
    mdaaDeploy.deploy();

    const cdkCall = mockExecCmd.mock.calls.find((call: unknown[]) => String(call[0]).includes('cdk synth'));
    expect(cdkCall).toBeDefined();
    expect(String(cdkCall![0])).toContain(
      'permissions_boundary_arn="arn:aws:iam::123456789012:policy/top-level-boundary"',
    );
  });

  it('should allow domain-level permissions_boundary_arn to override top-level', () => {
    const mdaaDeploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/top-level-boundary',
      domains: {
        'test-domain': {
          permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/domain-boundary',
          environments: {
            'test-env': {
              modules: { 'test-module': { module_path: '@test/module' } },
            },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockExecCmd = jest.spyOn(mdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());
    mdaaDeploy.deploy();

    const cdkCall = mockExecCmd.mock.calls.find((call: unknown[]) => String(call[0]).includes('cdk synth'));
    expect(cdkCall).toBeDefined();
    expect(String(cdkCall![0])).toContain(
      'permissions_boundary_arn="arn:aws:iam::123456789012:policy/domain-boundary"',
    );
    expect(String(cdkCall![0])).not.toContain('top-level-boundary');
  });

  it('should allow env-level permissions_boundary_arn to override domain-level', () => {
    const mdaaDeploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/top-level-boundary',
      domains: {
        'test-domain': {
          permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/domain-boundary',
          environments: {
            'test-env': {
              permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/env-boundary',
              modules: { 'test-module': { module_path: '@test/module' } },
            },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockExecCmd = jest.spyOn(mdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());
    mdaaDeploy.deploy();

    const cdkCall = mockExecCmd.mock.calls.find((call: unknown[]) => String(call[0]).includes('cdk synth'));
    expect(cdkCall).toBeDefined();
    expect(String(cdkCall![0])).toContain('permissions_boundary_arn="arn:aws:iam::123456789012:policy/env-boundary"');
    expect(String(cdkCall![0])).not.toContain('domain-boundary');
  });

  it('should inherit parent permissions_boundary_arn when child does not specify one', () => {
    const mdaaDeploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      permissions_boundary_arn: 'arn:aws:iam::123456789012:policy/top-level-boundary',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: { 'test-module': { module_path: '@test/module' } },
            },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockExecCmd = jest.spyOn(mdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());
    mdaaDeploy.deploy();

    const cdkCall = mockExecCmd.mock.calls.find((call: unknown[]) => String(call[0]).includes('cdk synth'));
    expect(cdkCall).toBeDefined();
    expect(String(cdkCall![0])).toContain(
      'permissions_boundary_arn="arn:aws:iam::123456789012:policy/top-level-boundary"',
    );
  });

  it('should not inject permissions_boundary_arn when not configured at any level', () => {
    const mdaaDeploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: { 'test-module': { module_path: '@test/module' } },
            },
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockExecCmd = jest.spyOn(mdaaDeploy as any, 'execCmd').mockImplementation(jest.fn());
    mdaaDeploy.deploy();

    const cdkCall = mockExecCmd.mock.calls.find((call: unknown[]) => String(call[0]).includes('cdk synth'));
    expect(cdkCall).toBeDefined();
    expect(String(cdkCall![0])).not.toContain('permissions_boundary_arn');
  });
});

describe('createTerraformOverride', () => {
  let mockExistsSync: jest.SpyInstance;
  let mockUnlinkSync: jest.SpyInstance;
  let mockWriteFileSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockUnlinkSync = jest.spyOn(fs, 'unlinkSync').mockImplementation(jest.fn() as unknown as typeof fs.unlinkSync);
    mockWriteFileSync = jest
      .spyOn(fs, 'writeFileSync')
      .mockImplementation(jest.fn() as unknown as typeof fs.writeFileSync);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should write override file with s3 backend enrichment when terraform.override has backend.s3', () => {
    // Let existsSync return true for the override file so unlinkSync is called,
    // but return false for anything else that might trip up the constructor
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('mdaa_override.tf.json')) return true;
      if (p.includes('mdaa.yaml') || p.includes('caef.yaml')) return true;
      return false;
    });

    const mdaaDeploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '/fake/tf-module',
                  module_type: 'tf',
                  terraform: {
                    override: {
                      terraform: {
                        backend: {
                          s3: {
                            bucket: 'my-state-bucket',
                            region: 'us-east-1',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Access the private method via any cast
    const moduleConfig = {
      modulePath: '/fake/tf-module',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      terraform: {
        override: {
          terraform: {
            backend: {
              s3: {
                bucket: 'my-state-bucket',
                region: 'us-east-1',
              },
            },
          },
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).createTerraformOverride(moduleConfig);

    // Should have unlinked the existing override
    expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('mdaa_override.tf.json'));

    // Should have written the enriched override with encrypt and key
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('mdaa_override.tf.json'),
      expect.any(String),
    );

    const writtenContent = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(writtenContent.terraform.backend.s3.encrypt).toBe(true);
    expect(writtenContent.terraform.backend.s3.key).toBe('test-org-test-domain-test-env-test-module');
    expect(writtenContent.terraform.backend.s3.bucket).toBe('my-state-bucket');
  });
});

describe('createTerraformCommands command strings', () => {
  let mockExistsSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    jest.spyOn(fs, 'unlinkSync').mockImplementation(jest.fn() as unknown as typeof fs.unlinkSync);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn() as unknown as typeof fs.writeFileSync);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createTfDeploy(action: string, region?: string) {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('mdaa.yaml') || p.includes('caef.yaml')) return true;
      return false;
    });

    return new MdaaDeploy({ action, testing: 'true', working_dir: '/test/working' }, [], {
      organization: 'test-org',
      region: region ?? 'us-west-2',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '/fake/tf-module',
                  module_type: 'tf',
                },
              },
            },
          },
        },
      },
    });
  }

  it('should produce POSIX terraform plan commands with correct region, pythonPathCmd, checkov bin path, and tfplan.binary', () => {
    const mdaaDeploy = createTfDeploy('diff'); // diff maps to plan

    const moduleConfig = {
      modulePath: '/fake/tf-module',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      mdaaCompliant: true,
      effectiveModuleConfig: {},
      effectiveContext: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmds: string[] = (mdaaDeploy as any).createTerraformCommands(moduleConfig);

    // First cmd: setEnvCmd for region (POSIX format)
    expect(cmds[0]).toBe("export AWS_DEFAULT_REGION='us-west-2'");

    // Second cmd: terraform init
    expect(cmds[1]).toBe('terraform init ');

    // Third cmd: checkov with pythonPathCmd — should contain POSIX pythonPathCmd format
    const workingDir = path.resolve('/test/working');
    const pythonDir = path.join(workingDir, 'python');
    const checkovBin = path.join(workingDir, 'python', 'bin', 'checkov');
    expect(cmds[2]).toContain(`export PYTHONPATH='${pythonDir}'`);
    expect(cmds[2]).toContain(`${checkovBin} -d /fake/tf-module`);
    expect(cmds[2]).toContain('--summary-position bottom');

    // Fourth cmd: terraform plan with tfplan.binary path
    expect(cmds[3]).toContain('terraform plan');
    expect(cmds[3]).toContain(path.join('/fake/tf-module', 'tfplan.binary'));
    expect(cmds[3]).toContain('-input=false');
  });

  it('should produce POSIX terraform commands for default-region path (no setEnvCmd prefix)', () => {
    const mdaaDeploy = createTfDeploy('synth', 'default'); // synth maps to validate

    const moduleConfig = {
      modulePath: '/fake/tf-module',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      mdaaCompliant: true,
      effectiveModuleConfig: {},
      effectiveContext: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmds: string[] = (mdaaDeploy as any).createTerraformCommands(moduleConfig);

    // No setEnvCmd — first cmd is terraform init
    expect(cmds[0]).toBe('terraform init ');

    // Second cmd: checkov
    const workingDir = path.resolve('/test/working');
    const checkovBin = path.join(workingDir, 'python', 'bin', 'checkov');
    expect(cmds[1]).toContain(checkovBin);

    // Third cmd: just 'terraform validate' (no plan since action maps to validate)
    expect(cmds[2]).toContain('terraform validate');
    // Should NOT contain setEnvCmd since region is 'default'
    expect(cmds[2]).not.toContain('export AWS_DEFAULT_REGION');
  });

  it('should use Windows-style commands when platform-utils functions are mocked for Windows', () => {
    // Mock platform-utils functions to produce Windows output
    // Note: isWindows const cannot be mocked directly; we verify the function call outputs
    jest.spyOn(platformUtils, 'setEnvCmd').mockImplementation((key, value) => `set "${key}=${value}"`);
    jest.spyOn(platformUtils, 'pythonPathCmd').mockImplementation((dir, cmd) => `set "PYTHONPATH=${dir}" && ${cmd}`);
    jest.spyOn(platformUtils, 'lineContinuation').mockReturnValue(' ');
    jest.spyOn(platformUtils, 'shellQuote').mockImplementation(p => `"${p}"`);

    const mdaaDeploy = createTfDeploy('diff');

    const moduleConfig = {
      modulePath: '/fake/tf-module',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      mdaaCompliant: true,
      effectiveModuleConfig: {},
      effectiveContext: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmds: string[] = (mdaaDeploy as any).createTerraformCommands(moduleConfig);

    // Verify Windows-style set command for region
    expect(cmds[0]).toBe('set "AWS_DEFAULT_REGION=us-west-2"');

    // Verify checkov uses mocked pythonPathCmd (Windows-style set command)
    const workingDir = path.resolve('/test/working');
    const pythonDir = path.join(workingDir, 'python');
    expect(cmds[2]).toContain(`set "PYTHONPATH=${pythonDir}"`);

    // Verify lineContinuation is space (Windows) — plan cmd parts joined by space
    const planCmd = cmds[3];
    expect(planCmd).toContain('terraform plan');
    expect(planCmd).toContain('-input=false');
    // With space-only continuation, no backslash-newline present
    expect(planCmd).not.toContain(' \\\n\t');
    // Verify tfplan.binary path is present
    expect(planCmd).toContain(path.join('/fake/tf-module', 'tfplan.binary'));
  });
});

describe('createCdkCommand command strings', () => {
  let mockExistsSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    jest.spyOn(fs, 'unlinkSync').mockImplementation(jest.fn() as unknown as typeof fs.unlinkSync);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn() as unknown as typeof fs.writeFileSync);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createCdkDeploy(options: { localModule?: boolean; npmDebug?: boolean; workingDir?: string } = {}) {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('mdaa.yaml') || p.includes('caef.yaml')) return true;
      return false;
    });

    const opts: Record<string, string> = {
      action: 'deploy',
      testing: 'true',
    };
    if (options.workingDir) {
      opts['working_dir'] = options.workingDir;
    }
    if (options.npmDebug) {
      opts['npm_debug'] = 'true';
    }

    return new MdaaDeploy(opts, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                },
              },
            },
          },
        },
      },
    });
  }

  it('should produce correct cdk command for non-local module with shellQuoted -a arg and lineContinuation joins', () => {
    const mdaaDeploy = createCdkDeploy({ localModule: false });

    const moduleConfig = {
      modulePath: '/installed/module/path',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      effectiveModuleConfig: {},
      effectiveContext: {},
      effectiveTagConfig: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmd: string = (mdaaDeploy as any).createCdkCommand(moduleConfig, false);

    // Should contain npx cdk deploy --all
    expect(cmd).toContain('npx  cdk deploy --all');
    expect(cmd).toContain('--require-approval never');

    // Non-local module: should have shellQuoted -a arg with module path
    expect(cmd).toContain(`-a '`);
    expect(cmd).toContain('/installed/module/path/');

    // Should contain -o with output base path
    const workingDir = path.resolve('./.mdaa_working');
    const expectedOutDir = path.join(workingDir, 'cdk.out', 'test-org', 'test-domain/test-env/test-module');
    expect(cmd).toContain(`-o '${expectedOutDir}'`);

    // Should contain context params
    expect(cmd).toContain(`-c 'org=test-org'`);
    expect(cmd).toContain(`-c 'env=test-env'`);
    expect(cmd).toContain(`-c 'module_name=test-module'`);
    expect(cmd).toContain(`-c 'domain=test-domain'`);

    // Should use POSIX line continuation (backslash-newline-tab)
    expect(cmd).toContain(' \\\n\t');
  });

  it('should produce correct cdk command for local module (no -a arg)', () => {
    const mdaaDeploy = createCdkDeploy({ localModule: true });

    const moduleConfig = {
      modulePath: '/local/module/path',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      effectiveModuleConfig: {},
      effectiveContext: {},
      effectiveTagConfig: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmd: string = (mdaaDeploy as any).createCdkCommand(moduleConfig, true);

    // Local module: should NOT have -a arg
    expect(cmd).not.toContain('-a ');

    // Should still have -o and context params
    expect(cmd).toContain(`-c 'org=test-org'`);
    expect(cmd).toContain(`-c 'domain=test-domain'`);
  });

  it('should include -d flag when npmDebug is enabled', () => {
    const mdaaDeploy = createCdkDeploy({ npmDebug: true });

    const moduleConfig = {
      modulePath: '/installed/module/path',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      effectiveModuleConfig: {},
      effectiveContext: {},
      effectiveTagConfig: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmd: string = (mdaaDeploy as any).createCdkCommand(moduleConfig, false);

    // Should have -d flag for npm debug
    expect(cmd).toContain('npx -d cdk');
    // The -a arg should also have -d
    expect(cmd).toContain(`-a 'npx -d /installed/module/path/'`);
  });

  it('should use Windows formatting when platform-utils reports Windows', () => {
    // Mock platform-utils for Windows behavior
    jest.spyOn(platformUtils, 'shellQuote').mockImplementation(p => `"${p}"`);
    jest.spyOn(platformUtils, 'lineContinuation').mockReturnValue(' ');
    jest.spyOn(platformUtils, 'cmdJoin').mockImplementation((...args) => {
      const cmds = typeof args[0] === 'boolean' ? (args as [boolean, ...string[]]).slice(1) : args;
      return (cmds as string[]).join(' && ');
    });
    jest.spyOn(platformUtils, 'setEnvCmd').mockImplementation((key, value) => `set "${key}=${value}"`);

    const mdaaDeploy = createCdkDeploy({ localModule: false });

    const moduleConfig = {
      modulePath: '/installed/module/path',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      deployRegion: 'us-east-1',
      effectiveModuleConfig: {},
      effectiveContext: {},
      effectiveTagConfig: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmd: string = (mdaaDeploy as any).createCdkCommand(moduleConfig, false);

    // With Windows shellQuote, should use double quotes
    expect(cmd).toContain(`-a "npx`);
    // With Windows lineContinuation (space), no backslash-newline
    expect(cmd).not.toContain(' \\\n\t');
    // With deployRegion set, should have setEnvCmd prefix joined with cmdJoin
    expect(cmd).toContain('set "CDK_DEPLOY_REGION=us-east-1"');
  });
});

describe('createTerraformCommands: apply and destroy actions', () => {
  let mockExistsSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    jest.spyOn(fs, 'unlinkSync').mockImplementation(jest.fn() as unknown as typeof fs.unlinkSync);
    jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn() as unknown as typeof fs.writeFileSync);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createTfDeploy(action: string, region?: string) {
    mockExistsSync.mockImplementation((p: string) => {
      if (p.includes('mdaa.yaml') || p.includes('caef.yaml')) return true;
      return false;
    });

    return new MdaaDeploy({ action, testing: 'true', working_dir: '/test/working' }, [], {
      organization: 'test-org',
      region: region ?? 'us-west-2',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '/fake/tf-module',
                  module_type: 'tf',
                },
              },
            },
          },
        },
      },
    });
  }

  it('should produce terraform apply commands with setEnvCmd for non-default region', () => {
    const mdaaDeploy = createTfDeploy('deploy'); // deploy maps to 'apply'

    const moduleConfig = {
      modulePath: '/fake/tf-module',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      mdaaCompliant: true,
      effectiveModuleConfig: {},
      effectiveContext: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmds: string[] = (mdaaDeploy as any).createTerraformCommands(moduleConfig);

    // Should have setEnvCmd for region
    expect(cmds[0]).toBe("export AWS_DEFAULT_REGION='us-west-2'");

    // Should contain terraform apply with -auto-approve
    const applyCmd = cmds.find((c: string) => c.includes('terraform apply'));
    expect(applyCmd).toBeDefined();
    expect(applyCmd).toContain('-auto-approve');
  });

  it('should produce terraform destroy commands with setEnvCmd for non-default region', () => {
    const mdaaDeploy = createTfDeploy('destroy'); // destroy maps to 'destroy'

    const moduleConfig = {
      modulePath: '/fake/tf-module',
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
      mdaaCompliant: true,
      effectiveModuleConfig: {},
      effectiveContext: {},
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmds: string[] = (mdaaDeploy as any).createTerraformCommands(moduleConfig);

    // Should have setEnvCmd for region
    expect(cmds[0]).toBe("export AWS_DEFAULT_REGION='us-west-2'");

    // Should contain 'terraform destroy'
    const destroyCmd = cmds.find((c: string) => c.includes('terraform destroy'));
    expect(destroyCmd).toBeDefined();
  });
});

describe('addBaselineTemplateParam coverage', () => {
  let mockExistsSync: jest.SpyInstance;
  let mockStatSync: jest.SpyInstance;
  let mockReaddirSync: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockStatSync = jest.spyOn(fs, 'statSync');
    mockReaddirSync = jest.spyOn(fs, 'readdirSync');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add --template param with shellQuote when baseline template file is found', () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    mockReaddirSync.mockReturnValue(['my-stack.template.json', 'manifest.json']);

    const mdaaDeploy = new MdaaDeploy({ action: 'diff', testing: 'true', baseline: '/baseline/dir' }, [], {
      organization: 'test-org',
      domains: {},
    });

    const cdkCmd: string[] = [];
    const moduleConfig = {
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'test-module',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).addBaselineTemplateParam(cdkCmd, moduleConfig);

    // Should have added --template with a shellQuoted path
    expect(cdkCmd.length).toBe(1);
    expect(cdkCmd[0]).toContain('--template');
    expect(cdkCmd[0]).toContain('my-stack.template.json');
  });
});

describe('installPython coverage', () => {
  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should resolve requirementsPath and pythonTargetDir then call pip', () => {
    const mockExistsSync = jest.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const s = p.toString();
      if (s.includes('mdaa.yaml') || s.includes('caef.yaml')) return true;
      return false;
    });

    const mockExecSync = jest.spyOn(childProcess, 'execSync').mockImplementation(jest.fn());

    // Mock command-exists to return true for pip
    jest.mock(
      'command-exists',
      () => ({
        sync: (cmd: string) => cmd === 'pip',
      }),
      { virtual: true },
    );

    const mdaaDeploy = new MdaaDeploy({ action: 'deploy', working_dir: '/test/working' }, [], {
      organization: 'test-org',
      domains: {},
    });

    // Call the private method directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mdaaDeploy as any).installPython();

    // Verify execCmd was called with a pip install command containing resolved paths
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('pip install'),
      expect.objectContaining({ stdio: 'inherit' }),
    );
    // The command should use shellQuote for the requirements path
    const callArg = mockExecSync.mock.calls[0][0] as string;
    expect(callArg).toContain('requirements.txt');
    expect(callArg).toContain(path.join('/test/working', 'python'));

    mockExistsSync.mockRestore();
    mockExecSync.mockRestore();
  });
});
