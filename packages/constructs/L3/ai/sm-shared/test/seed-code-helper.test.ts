/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SeedCodeHelper } from '../lib/sm-shared';

describe('SeedCodeHelper', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns zip path as-is when path points to existing .zip file', () => {
    const zipPath = path.join(tmpDir, 'code.zip');
    fs.writeFileSync(zipPath, 'fake-zip-content');

    const result = SeedCodeHelper.resolveSeedCodeZip(zipPath);
    expect(result).toBe(zipPath);
  });

  test('zips a directory and returns temp zip path', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'main.py'), 'print("hello")');
    fs.writeFileSync(path.join(srcDir, 'utils.py'), 'def helper(): pass');

    const result = SeedCodeHelper.resolveSeedCodeZip(srcDir);
    expect(result).toMatch(/seed_code\.zip$/);
    expect(fs.existsSync(result)).toBe(true);
    expect(fs.statSync(result).size).toBeGreaterThan(0);
  });

  test('excludes __pycache__ and .pyc from zip', () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'main.py'), 'print("hello")');
    fs.mkdirSync(path.join(srcDir, '__pycache__'));
    fs.writeFileSync(path.join(srcDir, '__pycache__', 'main.cpython-312.pyc'), 'bytecode');
    fs.writeFileSync(path.join(srcDir, 'compiled.pyc'), 'bytecode');

    const result = SeedCodeHelper.resolveSeedCodeZip(srcDir);
    expect(fs.existsSync(result)).toBe(true);
  });

  test('throws when .zip file does not exist', () => {
    const fakePath = path.join(tmpDir, 'nonexistent.zip');
    expect(() => SeedCodeHelper.resolveSeedCodeZip(fakePath)).toThrow(/does not exist/);
  });

  test('throws when path does not exist', () => {
    const fakePath = path.join(tmpDir, 'nonexistent-dir');
    expect(() => SeedCodeHelper.resolveSeedCodeZip(fakePath)).toThrow(/does not exist/);
  });
});
