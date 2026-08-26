/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

jest.mock('prompts', () => jest.fn());
import { resolveMdaaVersion, upsertMdaaVersion, pruneOldVersions, getCliVersion } from '../lib/init-version';
import { runInit } from '../lib/mdaa-init';

describe('init-version', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-version-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /** Write an mdaa.yaml into a fresh project dir and return the dir */
  function projectWith(contents: string): string {
    const projectDir = path.join(tempDir, 'project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'mdaa.yaml'), contents);
    return projectDir;
  }

  describe('resolveMdaaVersion', () => {
    test.each([
      ['exact version', 'mdaa_version: "1.7.0"\n', '1.7.0'],
      ['single quotes', "mdaa_version: '1.7.0'\n", '1.7.0'],
      ['unquoted', 'mdaa_version: 1.7.0\n', '1.7.0'],
      ['caret range', 'mdaa_version: "^1.7.0"\n', '^1.7.0'],
      ['comparator range', 'mdaa_version: ">=1.0.0 <2.0.0"\n', '>=1.0.0 <2.0.0'],
      ['prerelease tag', "mdaa_version: '1.0.0-global'\n", '1.0.0-global'],
      ['trailing comment', 'mdaa_version: "1.7.0" # pinned by init\n', '1.7.0'],
    ])('accepts %s', (_label, contents, expected) => {
      expect(resolveMdaaVersion(projectWith(contents))).toEqual(expected);
    });

    test('returns undefined when mdaa.yaml is absent', () => {
      expect(resolveMdaaVersion(path.join(tempDir, 'nonexistent'))).toBeUndefined();
    });

    test('returns undefined when there is no mdaa_version key', () => {
      expect(resolveMdaaVersion(projectWith('org: test\ndomain: data\n'))).toBeUndefined();
    });

    test('returns undefined for a valueless mdaa_version line without consuming the next line', () => {
      // `\s*` would match across the newline and capture `org: test` as the version.
      expect(resolveMdaaVersion(projectWith('mdaa_version:\norg: test\n'))).toBeUndefined();
    });

    // The value becomes a `.mdaa/<version>/` path segment, so anything that can
    // escape that directory or name something other than a single child must be
    // rejected rather than silently falling back to the CLI version.
    test.each([
      ['parent traversal', '../../sentinel/pwned'],
      ['bare parent', '..'],
      ['bare current', '.'],
      ['nested segment', '1.7.0/schemas'],
      ['absolute path', '/etc/mdaa'],
      ['windows separator', '..\\..\\sentinel'],
      ['traversal suffix', '1.7.0/../../sentinel'],
      ['shell substitution', '$(id)'],
      ['command chaining', '1.7.0; id'],
    ])('rejects %s', (_label, version) => {
      const projectDir = projectWith(`mdaa_version: "${version}"\n`);
      expect(() => resolveMdaaVersion(projectDir)).toThrow(/Invalid mdaa_version/);
    });

    test('rejection names the offending value and the file it came from', () => {
      const projectDir = projectWith('mdaa_version: "../../escape"\n');
      expect(() => resolveMdaaVersion(projectDir)).toThrow(
        new RegExp(`"\\.\\./\\.\\./escape".*${path.join(projectDir, 'mdaa.yaml').replace(/\\/g, '\\\\')}`),
      );
    });
  });

  describe('upsertMdaaVersion', () => {
    test('replaces an existing pin in place', () => {
      expect(upsertMdaaVersion('org: test\nmdaa_version: "1.6.0"\ndomain: data\n', '1.7.0')).toEqual(
        'org: test\nmdaa_version: "1.7.0"\ndomain: data\n',
      );
    });

    test('fills in a valueless mdaa_version line rather than leaving it empty', () => {
      expect(upsertMdaaVersion('mdaa_version:\norg: test\n', '1.7.0')).toEqual('mdaa_version: "1.7.0"\norg: test\n');
    });

    test('inserts after the schema directive when there is no pin', () => {
      const content = '# yaml-language-server: $schema=./.mdaa/1.7.0/schemas/@aws-mdaa/cli.json\norg: test\n';
      expect(upsertMdaaVersion(content, '1.7.0')).toEqual(
        '# yaml-language-server: $schema=./.mdaa/1.7.0/schemas/@aws-mdaa/cli.json\nmdaa_version: "1.7.0"\norg: test\n',
      );
    });
  });

  describe('pruneOldVersions', () => {
    /** Create `.mdaa/<name>/marker` for each name and return the `.mdaa` path */
    function seedMdaaDirs(...names: string[]): string {
      const mdaaDir = path.join(tempDir, '.mdaa');
      for (const name of names) {
        fs.mkdirSync(path.join(mdaaDir, name), { recursive: true });
        fs.writeFileSync(path.join(mdaaDir, name, 'marker'), name);
      }
      fs.writeFileSync(path.join(mdaaDir, 'metadata.json'), '{}\n');
      return mdaaDir;
    }

    test('removes superseded version directories', () => {
      const mdaaDir = seedMdaaDirs('1.5.0', '1.6.0', '1.7.0');

      pruneOldVersions(tempDir, new Set(['1.7.0']));

      expect(fs.existsSync(path.join(mdaaDir, '1.5.0'))).toBe(false);
      expect(fs.existsSync(path.join(mdaaDir, '1.6.0'))).toBe(false);
      expect(fs.existsSync(path.join(mdaaDir, '1.7.0', 'marker'))).toBe(true);
    });

    test('keeps directories a config file still binds to', () => {
      const mdaaDir = seedMdaaDirs('1.6.0', '1.7.0');

      // 1.6.0 is a live per-module schema target, not stale
      pruneOldVersions(tempDir, new Set(['1.7.0', '1.6.0']));

      expect(fs.existsSync(path.join(mdaaDir, '1.6.0', 'marker'))).toBe(true);
      expect(fs.existsSync(path.join(mdaaDir, '1.7.0', 'marker'))).toBe(true);
    });

    test.each([
      ['a user directory', 'my-personal-notes'],
      ['a range-shaped pin', '^1.7.0'],
      ['a dist-tag-shaped name', 'latest'],
    ])('leaves %s alone', (_label, name) => {
      const mdaaDir = seedMdaaDirs(name, '1.6.0');

      pruneOldVersions(tempDir, new Set(['1.7.0']));

      expect(fs.existsSync(path.join(mdaaDir, name, 'marker'))).toBe(true);
      expect(fs.existsSync(path.join(mdaaDir, '1.6.0'))).toBe(false);
    });

    test('leaves metadata.json alone', () => {
      const mdaaDir = seedMdaaDirs('1.6.0');

      pruneOldVersions(tempDir, new Set(['1.7.0']));

      expect(fs.existsSync(path.join(mdaaDir, 'metadata.json'))).toBe(true);
    });

    test('is a no-op when there is no .mdaa directory', () => {
      expect(() => pruneOldVersions(tempDir, new Set(['1.7.0']))).not.toThrow();
    });
  });

  describe('runInit --enhance', () => {
    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
      exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as never);
    });

    afterEach(() => {
      exitSpy.mockRestore();
    });

    test('leaves a user-created .mdaa subdirectory intact', async () => {
      const projectDir = projectWith(`mdaa_version: "${getCliVersion()}"\norg: test\n`);
      fs.mkdirSync(path.join(projectDir, '.mdaa', 'notes'), { recursive: true });
      fs.writeFileSync(path.join(projectDir, '.mdaa', 'notes', 'todo.md'), 'my notes\n');

      await runInit({ targetDir: projectDir, starterKit: undefined, enhance: true, noPrompt: true, force: true });

      expect(fs.readFileSync(path.join(projectDir, '.mdaa', 'notes', 'todo.md'), 'utf-8')).toEqual('my notes\n');
      expect(fs.existsSync(path.join(projectDir, '.mdaa', getCliVersion(), 'schemas'))).toBe(true);
    });

    test('fails without writing assets outside the project root', async () => {
      const projectDir = projectWith('mdaa_version: "../../sentinel/pwned"\norg: test\n');

      await expect(
        runInit({ targetDir: projectDir, starterKit: undefined, enhance: true, noPrompt: true, force: true }),
      ).rejects.toThrow(/Invalid mdaa_version/);

      // `.mdaa/../../sentinel/pwned` resolves to <tempDir>/sentinel/pwned
      expect(fs.existsSync(path.join(tempDir, 'sentinel'))).toBe(false);
      expect(fs.existsSync(path.join(projectDir, '.mdaa'))).toBe(false);
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });
});
