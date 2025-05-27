import { loadLocalPackages } from '../lib/package-helper';
import * as path from 'node:path';

describe('loadLocalPackages', () => {
  const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
  const mockConsoleLog = jest.spyOn(console, 'log');
  const mockPathResolve = jest.spyOn(path, 'resolve');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Valid Workspaces
  it('should return valid local packages with resolved paths', () => {
    // Arrange
    const mockWorkspaces = [
      {
        name: 'test-pkg',
        location: 'packages/apps/test-pkg',
      },
    ];

    mockExecSync.mockReturnValue(JSON.stringify(mockWorkspaces));
    mockPathResolve.mockImplementation((...args) => args.join('/'));

    // Act
    const result = loadLocalPackages();

    // Assert
    expect(result['test-pkg']).toContain('/../../../packages/apps/test-pkg');
  });

  // 2. Validation Failure
  it('should throw error for invalid workspace schema', () => {
    // Arrange
    const invalidWorkspaces = [{ invalidField: 'bad-data' }];
    mockExecSync.mockReturnValue(JSON.stringify(invalidWorkspaces));

    // Act & Assert
    expect(() => loadLocalPackages()).toThrow('npm query returned unexpected data');
  });

  // 3. Empty Local Packages
  it('should return empty object when no matching packages', () => {
    // Arrange
    const mockWorkspaces = [
      {
        name: 'non-app-pkg',
        location: 'packages/libs/utils',
      },
    ];

    mockExecSync.mockReturnValue(JSON.stringify(mockWorkspaces));

    // Act
    const result = loadLocalPackages();

    // Assert
    expect(result).toEqual({});
    expect(mockConsoleLog).not.toHaveBeenCalled();
  });

  // 5. Console Log Verification
  it('should log success message when packages found', () => {
    // Arrange
    const mockWorkspaces = [
      {
        name: 'test-pkg',
        location: 'packages/apps/test-pkg',
      },
    ];

    mockExecSync.mockReturnValue(JSON.stringify(mockWorkspaces));

    // Act
    loadLocalPackages();

    // Assert
    expect(mockConsoleLog).toHaveBeenCalledWith('Loaded 1 MDAA modules from local codebase.');
  });
});
