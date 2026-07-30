import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { MdaaPythonCodeAsset, TEMP_DIR_PREFIX } from '../lib/code-asset';

// Mock entire lambda module
jest.mock('aws-cdk-lib/aws-lambda', () => ({
  Code: {
    fromDockerBuild: jest.fn().mockReturnValue('MOCK_DOCKER_CODE'),
    fromCustomCommand: jest.fn().mockReturnValue('MOCK_CUSTOM_CODE'),
  },
}));

interface MockStack {
  node: {
    addChild: jest.Mock;
    id: string;
  };
}

jest.mock('aws-cdk-lib', () => ({
  Stack: jest.fn().mockImplementation(function (this: MockStack, _: Stack, id: string) {
    this.node = { id, addChild: jest.fn() };
  }),
  App: jest.fn().mockImplementation(() => ({})),
}));

// Mock Node.js core modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdtempSync: jest.fn((tmp: string) => {
    return `${tmp}mock-dir`;
  }),
  copyFileSync: jest.fn(),
  realpathSync: jest.fn((path: string) => path),
  mkdirSync: jest.fn((path: string) => path),
  statSync: jest.fn(() => ({
    isDirectory: jest.fn(),
  })),
}));

jest.mock('os', () => ({
  tmpdir: jest.fn(() => '/tmp'),
}));

jest.mock('command-exists', () => ({
  sync: jest.fn(),
}));

describe('MdaaPythonCodeAsset', () => {
  let stack: Stack;

  beforeEach(() => {
    jest.clearAllMocks();
    const app = new App();
    stack = new Stack(app, 'TestStack');
  });

  test('uses Docker build when available', () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').existsSync.mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('command-exists').sync.mockReturnValue(true);

    // Execute construct
    new MdaaPythonCodeAsset(stack, 'TestAsset', {
      pythonRequirementsPath: '/fake/path.txt',
      pythonVersion: '3.12',
    });

    // Verify Docker path used
    expect(lambda.Code.fromDockerBuild).toHaveBeenCalledWith(`/tmp/${TEMP_DIR_PREFIX}mock-dir`);
    expect(lambda.Code.fromCustomCommand).not.toHaveBeenCalled();

    // Verify copyFileSync called with requirements.txt and Dockerfile
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockCopyFileSync = require('fs').copyFileSync;
    const tempDir = `/tmp/${TEMP_DIR_PREFIX}mock-dir`;
    expect(mockCopyFileSync).toHaveBeenCalledWith('/fake/path.txt', path.join(tempDir, 'requirements.txt'));
    const expectedDockerfile = path.resolve(__dirname, '..', 'src', 'docker', 'Dockerfile_3.12');
    expect(mockCopyFileSync).toHaveBeenCalledWith(expectedDockerfile, path.join(tempDir, 'Dockerfile'));
  });

  test('uses custom command when Docker unavailable', () => {
    // Setup mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').existsSync.mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('command-exists').sync.mockReturnValue(false);

    // Execute construct
    new MdaaPythonCodeAsset(stack, 'TestAsset', {
      pythonRequirementsPath: '/fake/path.txt',
    });

    // Verify custom command used
    expect(lambda.Code.fromCustomCommand).toHaveBeenCalledWith(`/tmp/${TEMP_DIR_PREFIX}mock-dir`, expect.any(Array), {
      commandOptions: { stdio: 'inherit' },
    });
    expect(lambda.Code.fromDockerBuild).not.toHaveBeenCalled();
  });

  test('custom command starts with sh and uses correct script path on non-Windows', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').existsSync.mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('command-exists').sync.mockReturnValue(false);

    // Force non-Windows platform
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'linux' });

    try {
      new MdaaPythonCodeAsset(stack, 'TestAssetPosix', {
        pythonRequirementsPath: '/fake/path.txt',
      });

      const callArgs = (lambda.Code.fromCustomCommand as jest.Mock).mock.calls[0];
      const cmd: string[] = callArgs[1];

      // Assert shell binary is 'sh' on POSIX
      expect(cmd[0]).toBe('sh');

      // Assert script path resolves to build_layer.sh
      const expectedScriptPath = path.resolve(__dirname, '..', 'src', 'scripts', 'build_layer.sh');
      expect(cmd[1]).toBe(expectedScriptPath);

      // Assert fs.copyFileSync was called with exact requirements.txt destination
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mockCopyFileSync = require('fs').copyFileSync;
      const expectedReqDest = path.join(`/tmp/${TEMP_DIR_PREFIX}mock-dir`, 'requirements.txt');
      expect(mockCopyFileSync).toHaveBeenCalledWith('/fake/path.txt', expectedReqDest);
    } finally {
      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
    }
  });

  test('custom command starts with bash and uses correct script path on win32', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').existsSync.mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('command-exists').sync.mockReturnValue(false);

    // Mock process.platform to win32
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', { value: 'win32' });

    try {
      new MdaaPythonCodeAsset(stack, 'TestAssetWin', {
        pythonRequirementsPath: '/fake/path.txt',
      });

      const callArgs = (lambda.Code.fromCustomCommand as jest.Mock).mock.calls[0];
      const cmd: string[] = callArgs[1];

      // Assert shell binary is 'bash' on Windows
      expect(cmd[0]).toBe('bash');

      // Assert script path resolves to build_layer.sh
      const expectedScriptPath = path.resolve(__dirname, '..', 'src', 'scripts', 'build_layer.sh');
      expect(cmd[1]).toBe(expectedScriptPath);

      // Assert fs.copyFileSync was called with exact requirements.txt destination
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mockCopyFileSync = require('fs').copyFileSync;
      const expectedReqDest = path.join(`/tmp/${TEMP_DIR_PREFIX}mock-dir`, 'requirements.txt');
      expect(mockCopyFileSync).toHaveBeenCalledWith('/fake/path.txt', expectedReqDest);
    } finally {
      // Restore original platform
      if (originalPlatform) {
        Object.defineProperty(process, 'platform', originalPlatform);
      }
    }
  });

  test('throws error if python requirements file does not exist', () => {
    // Mock fs.existsSync to return false for this test
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('fs').existsSync.mockReturnValue(false);

    expect(() => {
      new MdaaPythonCodeAsset(stack, 'TestAsset', {
        pythonRequirementsPath: '/fake/missing.txt',
      });
    }).toThrow(new Error('Python requirements file /fake/missing.txt does not exists'));
  });
});
