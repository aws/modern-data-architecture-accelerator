import { App, Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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
    require('fs').existsSync.mockReturnValue(true);
    require('command-exists').sync.mockReturnValue(true);

    // Execute construct
    new MdaaPythonCodeAsset(stack, 'TestAsset', {
      pythonRequirementsPath: '/fake/path.txt',
      pythonVersion: '3.12',
    });

    // Verify Docker path used
    expect(lambda.Code.fromDockerBuild).toHaveBeenCalledWith(`/tmp/${TEMP_DIR_PREFIX}mock-dir`);
    expect(lambda.Code.fromCustomCommand).not.toHaveBeenCalled();
  });

  test('uses custom command when Docker unavailable', () => {
    // Setup mocks
    require('fs').existsSync.mockReturnValue(true);
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

  test('throws error if python requirements file does not exist', () => {
    // Mock fs.existsSync to return false for this test
    require('fs').existsSync.mockReturnValue(false);

    expect(() => {
      new MdaaPythonCodeAsset(stack, 'TestAsset', {
        pythonRequirementsPath: '/fake/missing.txt',
      });
    }).toThrow(new Error('Python requirements file /fake/missing.txt does not exists'));
  });
});
