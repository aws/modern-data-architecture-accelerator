/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { logScriptAnalysis } from '../lib/command-utils';
import * as fs from 'fs';

describe('logScriptAnalysis', () => {
  let mockStatSync: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockStatSync = jest.spyOn(fs, 'statSync');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log script stats when fs.statSync succeeds', () => {
    const scriptPath = '/path/to/script.sh';
    const mockStats = {
      size: 1024,
      mode: 0o755,
    } as fs.Stats;

    mockStatSync.mockReturnValue(mockStats);

    logScriptAnalysis(scriptPath);

    expect(mockStatSync).toHaveBeenCalledWith(scriptPath);
    expect(consoleErrorSpy).toHaveBeenCalledWith('\n=== Script File Analysis ===');
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Script path: ${scriptPath}`);
    expect(consoleErrorSpy).toHaveBeenCalledWith('File exists: true');
    expect(consoleErrorSpy).toHaveBeenCalledWith('File size: 1024 bytes');
    expect(consoleErrorSpy).toHaveBeenCalledWith('File permissions: 755');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Is executable: true');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Is readable: true');
  });
});
