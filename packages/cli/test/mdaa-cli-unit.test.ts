/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EffectiveConfig, ModuleDeploymentConfig } from '../lib/config-types';
import { generateContextCdkParams } from '../lib/utils';
import { MdaaDeploy } from '../lib/mdaa-cli';
import { HookConfig } from '../lib/mdaa-cli-config-parser';
import * as childProcess from 'child_process';
import * as packageHelper from '../lib/package-helper';

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

    const expectedValue = `-c 'items="list:${JSON.stringify(JSON.stringify(array)).substring(
      1,
      JSON.stringify(JSON.stringify(array)).length - 1,
    )}"'`;
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

    const expectedValue = `-c 'config="obj:${JSON.stringify(JSON.stringify(obj)).substring(
      1,
      JSON.stringify(JSON.stringify(obj)).length - 1,
    )}"'`;
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

  it('should throw error for unsupported types', () => {
    const moduleConfig: EffectiveConfig = {
      effectiveContext: {
        value: 123, // Number type is not handled
      },
    } as unknown as EffectiveConfig;

    expect(() => generateContextCdkParams(moduleConfig)).toThrow(/Don't know how to handle type/);
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

    const expectedValue = `-c 'complex="obj:${JSON.stringify(JSON.stringify(complexObj)).substring(
      1,
      JSON.stringify(JSON.stringify(complexObj)).length - 1,
    )}"'`;
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
    } as ModuleDeploymentConfig);

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

    it('should warn when predeploy hook has no command', () => {
      const predeployHook: HookConfig = {
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        predeploy: predeployHook,
        moduleCmds: ['main-command'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(1); // Only main command
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

      expect(() => mdaaDeploy.deployModule(moduleConfig)).toThrow('Predeploy hook failed');
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

    it('should warn when postdeploy hook has no command', () => {
      const postdeployHook: HookConfig = {
        exit_if_fail: true,
      };

      const moduleConfig = createMockModuleConfig({
        postdeploy: postdeployHook,
        moduleCmds: ['main-command'],
      });

      mdaaDeploy.deployModule(moduleConfig);

      expect(mockExecCmd).toHaveBeenCalledTimes(1); // Only main command
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
    });
  });
});
