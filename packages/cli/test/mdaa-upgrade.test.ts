/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

jest.mock('prompts', () => jest.fn());
import { runUpgrade } from '../lib/mdaa-init';
import { getCliVersion } from '../lib/init-version';

const HAND_WRITTEN = 'MY HAND-WRITTEN TEAM NOTES - DO NOT LOSE\n';

describe('mdaa upgrade', () => {
  const originalCwd = process.cwd();
  let tempDir: string;
  let projectDir: string;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-upgrade-test-'));
    projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    exitSpy.mockRestore();
    jest.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Seed a project pinned to an older version, with a hand-written CLAUDE.md that
   *  MDAA recorded a (now stale) hash for — i.e. modified since it was generated. */
  function seedProjectWithModifiedClaudeMd(): void {
    fs.writeFileSync(path.join(projectDir, 'mdaa.yaml'), 'mdaa_version: "1.0.0"\norg: test\n');
    fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), HAND_WRITTEN);
    fs.mkdirSync(path.join(projectDir, '.mdaa'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, '.mdaa', 'metadata.json'),
      JSON.stringify({
        kitName: 'basic_datalake',
        generatedFiles: {
          'CLAUDE.md': crypto.createHash('sha256').update('# MDAA Agent Rules\n').digest('hex'),
        },
      }),
    );
    process.chdir(projectDir);
  }

  test('exits with error when there is no mdaa.yaml in the current directory', async () => {
    process.chdir(projectDir);

    await expect(runUpgrade()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('repairs missing assets when the project is already at the target version', async () => {
    fs.writeFileSync(path.join(projectDir, 'mdaa.yaml'), `mdaa_version: "${getCliVersion()}"\norg: test\n`);
    process.chdir(projectDir);

    await runUpgrade();

    // The pin was already current, but .mdaa/ was absent — upgrade must still restore it
    expect(fs.existsSync(path.join(projectDir, '.mdaa', getCliVersion(), 'schemas'))).toBe(true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  test('restores the pin when the asset refresh fails', async () => {
    fs.writeFileSync(path.join(projectDir, 'mdaa.yaml'), 'mdaa_version: "1.6.0"\norg: test\n');
    process.chdir(projectDir);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw new Error('ENOSPC: no space left on device');
    });

    await expect(runUpgrade()).rejects.toThrow('ENOSPC');

    // A half-finished refresh must not leave the project pinned past its assets
    expect(fs.readFileSync(path.join(projectDir, 'mdaa.yaml'), 'utf-8')).toContain('mdaa_version: "1.6.0"');
  });

  describe('target version validation', () => {
    /** Project pinned to an older version, with an asset dir the prune step would remove */
    function seedOutdatedProject(): void {
      fs.writeFileSync(path.join(projectDir, 'mdaa.yaml'), 'mdaa_version: "1.6.0"\norg: test\n');
      fs.mkdirSync(path.join(projectDir, '.mdaa', '1.6.0'), { recursive: true });
      fs.writeFileSync(path.join(projectDir, '.mdaa', '1.6.0', 'marker'), 'existing assets\n');
      process.chdir(projectDir);
    }

    test.each([
      ['a directory instead of a version', '.'],
      ['a partial version', '1.8'],
      ['a dist-tag', 'latest'],
      ['a range', '^1.8.0'],
      ['a mistyped flag consumed as a positional', '--typo'],
    ])('rejects %s without touching the project', async (_label, target) => {
      seedOutdatedProject();

      await expect(runUpgrade(target)).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      // The pin must not advance and existing assets must survive
      expect(fs.readFileSync(path.join(projectDir, 'mdaa.yaml'), 'utf-8')).toContain('mdaa_version: "1.6.0"');
      expect(fs.existsSync(path.join(projectDir, '.mdaa', '1.6.0', 'marker'))).toBe(true);
    });

    test('rejects a valid version that the installed CLI cannot generate assets for', async () => {
      seedOutdatedProject();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(runUpgrade('99.0.0')).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy.mock.calls.flat().join('\n')).toContain('npx @aws-mdaa/cli@99.0.0 upgrade');
      // Nothing pinned, nothing pruned
      expect(fs.readFileSync(path.join(projectDir, 'mdaa.yaml'), 'utf-8')).toContain('mdaa_version: "1.6.0"');
      expect(fs.existsSync(path.join(projectDir, '.mdaa', '1.6.0', 'marker'))).toBe(true);
      expect(fs.existsSync(path.join(projectDir, '.mdaa', '99.0.0'))).toBe(false);
    });

    test('accepts an explicit target equal to the installed CLI version', async () => {
      seedOutdatedProject();

      await runUpgrade(getCliVersion(), true);

      expect(fs.readFileSync(path.join(projectDir, 'mdaa.yaml'), 'utf-8')).toContain(
        `mdaa_version: "${getCliVersion()}"`,
      );
      expect(fs.existsSync(path.join(projectDir, '.mdaa', getCliVersion(), 'schemas'))).toBe(true);
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  test('preserves a user-modified CLAUDE.md when --force is not passed', async () => {
    seedProjectWithModifiedClaudeMd();
    // Non-interactive shell: promptOverwrite's read fails, which must fail closed.
    jest.spyOn(fs, 'readSync').mockImplementation(() => {
      throw new Error('EAGAIN');
    });

    await runUpgrade(undefined, false);

    expect(fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8')).toEqual(HAND_WRITTEN);
    // MDAA-owned assets still refresh, and the pin still advances
    expect(fs.existsSync(path.join(projectDir, '.mdaa', getCliVersion()))).toBe(true);
    expect(fs.readFileSync(path.join(projectDir, 'mdaa.yaml'), 'utf-8')).toContain(
      `mdaa_version: "${getCliVersion()}"`,
    );
  });

  test('overwrites a user-modified CLAUDE.md when the prompt is answered yes', async () => {
    seedProjectWithModifiedClaudeMd();
    jest.spyOn(fs, 'readSync').mockImplementation(((_fd: number, buf: Buffer) => {
      buf.write('y\n');
      return 2;
    }) as typeof fs.readSync);

    await runUpgrade(undefined, false);

    expect(fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8')).not.toEqual(HAND_WRITTEN);
  });

  test('overwrites a user-modified CLAUDE.md when --force is passed, without prompting', async () => {
    seedProjectWithModifiedClaudeMd();
    const readSyncSpy = jest.spyOn(fs, 'readSync');

    await runUpgrade(undefined, true);

    expect(fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf-8')).not.toEqual(HAND_WRITTEN);
    expect(readSyncSpy).not.toHaveBeenCalled();
  });
});
