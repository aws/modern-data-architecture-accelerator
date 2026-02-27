/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
/* eslint-disable @typescript-eslint/no-require-imports */
describe('MDAA CLI', () => {
  const cliPath = path.join(__dirname, '../lib/mdaa.ts');

  test('CLI file exists', () => {
    expect(fs.existsSync(cliPath)).toBe(true);
  });

  test('CLI exports command line args', () => {
    const commandLineArgs = require('command-line-args');
    expect(commandLineArgs).toBeDefined();
  });

  test('package.json exists', () => {
    const pjsonPath = path.join(__dirname, '../package.json');
    expect(fs.existsSync(pjsonPath)).toBe(true);
  });

  test('package.json has version', () => {
    const pjson = require('../package.json');
    expect(pjson.version).toBeDefined();
  });

  test('MdaaDeploy is importable', () => {
    const { MdaaDeploy } = require('../lib/mdaa-cli');
    expect(MdaaDeploy).toBeDefined();
  });
});
