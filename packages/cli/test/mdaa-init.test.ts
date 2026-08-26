/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

jest.mock('prompts', () => jest.fn());
import { runInit, _testing } from '../lib/mdaa-init';
import { CancelledError } from '../lib/exceptions';
import { getCliVersion } from '../lib/init-version';

// Handle to the mocked prompts module for driving interactive flows.
const promptsMock = jest.requireMock('prompts') as jest.Mock;

const {
  applyReplacementsToFile,
  injectSchemaDirectives,
  resolveModuleForConfig,
  generateGettingStartedContent,
  buildConfigVersionMap,
  cleanRepoLinks,
  extractKitDescription,
  getTemplatesDir,
  rewriteCanonicalReferences,
} = _testing;

// Jest reuses the worker process across test files and this package runs with
// --maxWorkers=1, so a `process.exit` spy left in place would stay a throwing mock for
// every later CLI test file in the worker.
afterEach(() => {
  jest.restoreAllMocks();
});

/**
 * Interactive prompts are refused outright when stdin is not a terminal, which it never is
 * under jest. Describes that drive the mocked prompt flow declare that they are simulating
 * a terminal by calling this.
 */
function simulateTerminal(): void {
  let original: boolean;
  beforeEach(() => {
    original = process.stdin.isTTY;
    process.stdin.isTTY = true;
  });
  afterEach(() => {
    process.stdin.isTTY = original;
  });
}

describe('mdaa init', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-test-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('exits with error when no directory argument provided', async () => {
    await expect(
      runInit({ targetDir: undefined, starterKit: undefined, enhance: false, noPrompt: false, force: true }),
    ).rejects.toThrow('process.exit called');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits with error when --starter-kit specified with existing non-empty directory', async () => {
    // Create a non-empty directory
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, 'file.txt'), 'content');

    await expect(
      runInit({ targetDir: existingDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true }),
    ).rejects.toThrow('process.exit called');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits with error when --enhance specified with non-existing directory', async () => {
    const nonExistentDir = path.join(tempDir, 'does-not-exist');

    await expect(
      runInit({ targetDir: nonExistentDir, starterKit: undefined, enhance: true, noPrompt: false, force: true }),
    ).rejects.toThrow('process.exit called');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('exits with error when --enhance targets a directory that is not an MDAA project', async () => {
    const notAProject = path.join(tempDir, 'not-a-project');
    fs.mkdirSync(notAProject);
    fs.writeFileSync(path.join(notAProject, 'somefile.txt'), 'content');

    await expect(
      runInit({ targetDir: notAProject, starterKit: undefined, enhance: true, noPrompt: true, force: true }),
    ).rejects.toThrow('process.exit called');
    expect(process.exit).toHaveBeenCalledWith(1);
    // Nothing may be written into a directory that isn't an MDAA project
    expect(fs.readdirSync(notAProject)).toEqual(['somefile.txt']);
  });

  test('leaves a mistargeted directory untouched, including its CLAUDE.md and .mdaa', async () => {
    // Shaped like a home directory: real Claude Code config locations, no mdaa.yaml
    const decoy = path.join(tempDir, 'home');
    fs.mkdirSync(path.join(decoy, '.mdaa', 'my-personal-notes'), { recursive: true });
    fs.writeFileSync(path.join(decoy, '.mdaa', 'my-personal-notes', 'notes.md'), 'personal\n');
    fs.writeFileSync(path.join(decoy, 'CLAUDE.md'), 'MY OWN AGENT CONFIG\n');

    await expect(
      runInit({ targetDir: decoy, starterKit: undefined, enhance: true, noPrompt: true, force: true }),
    ).rejects.toThrow('process.exit called');
    expect(fs.readFileSync(path.join(decoy, 'CLAUDE.md'), 'utf-8')).toEqual('MY OWN AGENT CONFIG\n');
    expect(fs.existsSync(path.join(decoy, '.mdaa', 'my-personal-notes', 'notes.md'))).toBe(true);
  });

  test('no generated steering or rule file tells the user to run an unresolvable command', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: true, force: true });

    // Only what init generates — `.mdaa/<version>/docs` is a copy of the repo's own
    // docs, which are written for contributors working inside a checkout.
    const generated = ['agent_rules', '.kiro', '.claude', '.github', 'CLAUDE.md'];
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.md') && fs.readFileSync(full, 'utf-8').includes('npx mdaa ')) {
          offenders.push(path.relative(outputDir, full));
        }
      }
    };
    for (const target of generated) {
      const full = path.join(outputDir, target);
      if (!fs.existsSync(full)) continue;
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (fs.readFileSync(full, 'utf-8').includes('npx mdaa ')) offenders.push(target);
    }

    expect(offenders).toEqual([]);
  });

  test('creates output directory with kit files when --starter-kit and --no-prompt', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'mdaa.yaml'))).toBe(true);
  });

  test('creates schemas directory in output', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    // Named explicitly: `.mdaa/` also holds metadata.json and readdirSync order is
    // filesystem-dependent, so indexing into it can pick the file instead of the dir.
    expect(fs.existsSync(path.join(outputDir, '.mdaa', getCliVersion(), 'schemas'))).toBe(true);
  });

  test('creates docs directory in output', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    // Docs are under .mdaa/<version>/docs/
    expect(fs.existsSync(path.join(outputDir, '.mdaa', getCliVersion(), 'docs'))).toBe(true);
  });

  test('writes Kiro wrappers with the frontmatter and include paths they exist for', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    const always = fs.readFileSync(path.join(outputDir, '.kiro', 'steering', 'getting-started.md'), 'utf-8');
    expect(always).toContain('inclusion: always');
    expect(always).toContain('#[[file:agent_rules/getting-started.md]]');

    const scoped = fs.readFileSync(path.join(outputDir, '.kiro', 'steering', 'user-config-authoring.md'), 'utf-8');
    expect(scoped).toContain('inclusion: fileMatch');
    expect(scoped).toContain("fileMatchPattern: '**/*.yaml,**/*.yml'");
    expect(scoped).toContain('#[[file:agent_rules/user-config-authoring.md]]');
  });

  test('writes Claude and Copilot wrappers with depth-correct relative includes', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    // .claude/rules/ is two levels deep, .github/copilot-instructions.md one
    expect(fs.readFileSync(path.join(outputDir, '.claude', 'rules', 'user-config-authoring.md'), 'utf-8')).toContain(
      '(../../agent_rules/user-config-authoring.md)',
    );
    expect(fs.readFileSync(path.join(outputDir, '.github', 'copilot-instructions.md'), 'utf-8')).toContain(
      '(../agent_rules/getting-started.md)',
    );
    const copilotScoped = fs.readFileSync(
      path.join(outputDir, '.github', 'instructions', 'user-config-authoring.instructions.md'),
      'utf-8',
    );
    expect(copilotScoped).toContain("applyTo: '**/*.yaml,**/*.yml'");
    expect(copilotScoped).toContain('(../../agent_rules/user-config-authoring.md)');
  });

  test('creates root CLAUDE.md (always-loaded) referencing getting-started', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    const claudeMd = path.join(outputDir, 'CLAUDE.md');
    expect(fs.existsSync(claudeMd)).toBe(true);
    expect(fs.readFileSync(claudeMd, 'utf-8')).toContain('agent_rules/getting-started.md');
  });

  test('creates .github directory in output', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'basic_datalake', enhance: false, noPrompt: true, force: true });

    expect(fs.existsSync(path.join(outputDir, '.github'))).toBe(true);
  });

  test('enhances existing directory when --enhance flag used', async () => {
    // Create a non-empty directory with an mdaa.yaml
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, 'mdaa.yaml'), 'organization: test\n');

    await runInit({ targetDir: existingDir, starterKit: undefined, enhance: true, noPrompt: true, force: true });

    // Should have added steering files and .mdaa/ directory
    expect(fs.existsSync(path.join(existingDir, '.kiro', 'steering'))).toBe(true);
    expect(fs.existsSync(path.join(existingDir, '.claude', 'rules'))).toBe(true);
    expect(fs.existsSync(path.join(existingDir, '.github'))).toBe(true);
    expect(fs.existsSync(path.join(existingDir, '.mdaa'))).toBe(true);
    expect(fs.existsSync(path.join(existingDir, '.mdaa', getCliVersion(), 'docs'))).toBe(true);
  });
});

describe('mdaa init - schema injection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-test-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('injects schema directives into config files', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: true, force: true });

    const mdaaYaml = fs.readFileSync(path.join(outputDir, 'mdaa.yaml'), 'utf-8');
    expect(mdaaYaml).toContain('yaml-language-server');
    expect(mdaaYaml).toContain('cli.json');
  });

  test('injects schema directives into nested config files', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: true, force: true });

    const rolesYaml = fs.readFileSync(path.join(outputDir, 'govern', 'roles.yaml'), 'utf-8');
    expect(rolesYaml).toContain('yaml-language-server');
    expect(rolesYaml).toContain('roles.json');
  });

  test('enhance injects schema directives into existing configs', async () => {
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(
      path.join(existingDir, 'mdaa.yaml'),
      'organization: test\ndomains:\n  shared:\n    environments:\n      dev:\n        modules:\n          roles:\n            module_path: "@aws-mdaa/roles"\n            module_configs:\n              - ./roles.yaml\n',
    );
    fs.writeFileSync(path.join(existingDir, 'roles.yaml'), 'generateRoles: []\n');

    await runInit({ targetDir: existingDir, starterKit: undefined, enhance: true, noPrompt: true, force: true });

    const mdaaYaml = fs.readFileSync(path.join(existingDir, 'mdaa.yaml'), 'utf-8');
    expect(mdaaYaml).toContain('yaml-language-server');

    const rolesYaml = fs.readFileSync(path.join(existingDir, 'roles.yaml'), 'utf-8');
    expect(rolesYaml).toContain('yaml-language-server');
    expect(rolesYaml).toContain('roles.json');
  });
});

describe('mdaa init - getting-started content', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-test-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('getting-started includes kit name and docs URL', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: true, force: true });

    const gettingStarted = fs.readFileSync(path.join(outputDir, 'agent_rules', 'getting-started.md'), 'utf-8');
    expect(gettingStarted).toContain('minimal');
    expect(gettingStarted).toContain(
      'https://aws.github.io/modern-data-architecture-accelerator/starter_kits/minimal/',
    );
  });

  test('getting-started includes outstanding placeholders', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: true, force: true });

    const gettingStarted = fs.readFileSync(path.join(outputDir, 'agent_rules', 'getting-started.md'), 'utf-8');
    expect(gettingStarted).toContain('<YOUR_ORG_NAME>');
  });

  test('getting-started for enhance has generic description', async () => {
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, 'mdaa.yaml'), 'organization: test\n');

    await runInit({ targetDir: existingDir, starterKit: undefined, enhance: true, noPrompt: true, force: true });

    const gettingStarted = fs.readFileSync(path.join(existingDir, 'agent_rules', 'getting-started.md'), 'utf-8');
    expect(gettingStarted).toContain('MDAA');
    expect(gettingStarted).toContain('Deployment');
  });
});

describe('mdaa init - unknown starter kit', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-test-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('exits with error for unknown starter kit', async () => {
    const outputDir = path.join(tempDir, 'output');

    await expect(
      runInit({ targetDir: outputDir, starterKit: 'nonexistent_kit', enhance: false, noPrompt: true, force: true }),
    ).rejects.toThrow('process.exit called');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('applyReplacementsToFile', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-replace-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('replaces placeholder with provided value', () => {
    const file = path.join(tempDir, 'test.yaml');
    fs.writeFileSync(file, 'organization: <YOUR_ORG_NAME>\n');

    applyReplacementsToFile(file, { '<YOUR_ORG_NAME>': 'my-org' });

    expect(fs.readFileSync(file, 'utf-8')).toBe('organization: my-org\n');
  });

  test('replaces multiple placeholders in same file', () => {
    const file = path.join(tempDir, 'test.yaml');
    fs.writeFileSync(file, 'org: <YOUR_ORG_NAME>\naccount: <YOUR_ACCOUNT_ID>\n');

    applyReplacementsToFile(file, { '<YOUR_ORG_NAME>': 'my-org', '<YOUR_ACCOUNT_ID>': '123456789012' });

    const result = fs.readFileSync(file, 'utf-8');
    expect(result).toContain('org: my-org');
    expect(result).toContain('account: 123456789012');
  });

  test('cleans TODO marker from preceding comment when placeholder is replaced', () => {
    const file = path.join(tempDir, 'test.yaml');
    fs.writeFileSync(file, '# TODO: Set your org name\norganization: <YOUR_ORG_NAME>\n');

    applyReplacementsToFile(file, { '<YOUR_ORG_NAME>': 'my-org' });

    const result = fs.readFileSync(file, 'utf-8');
    expect(result).not.toContain('# TODO:');
    expect(result).toContain('# Set your org name');
    expect(result).toContain('organization: my-org');
  });

  test('does not modify lines without placeholders', () => {
    const file = path.join(tempDir, 'test.yaml');
    fs.writeFileSync(file, 'region: us-east-1\norganization: <YOUR_ORG_NAME>\n');

    applyReplacementsToFile(file, { '<YOUR_ORG_NAME>': 'my-org' });

    const result = fs.readFileSync(file, 'utf-8');
    expect(result).toContain('region: us-east-1');
  });

  test('handles file with no matching placeholders', () => {
    const file = path.join(tempDir, 'test.yaml');
    fs.writeFileSync(file, 'region: us-east-1\n');

    applyReplacementsToFile(file, { '<YOUR_ORG_NAME>': 'my-org' });

    expect(fs.readFileSync(file, 'utf-8')).toBe('region: us-east-1\n');
  });
});

describe('injectSchemaDirectives', () => {
  let tempDir: string;
  let schemasDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-schema-'));
    schemasDir = path.join(tempDir, '.mdaa', '1.6.0', 'schemas');
    fs.mkdirSync(path.join(schemasDir, '@aws-mdaa'), { recursive: true });
    fs.writeFileSync(path.join(schemasDir, '@aws-mdaa', 'cli.json'), '{}');
    fs.writeFileSync(path.join(schemasDir, '@aws-mdaa', 'roles.json'), '{}');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('adjusts existing schema directive path', () => {
    const yamlFile = path.join(tempDir, 'mdaa.yaml');
    fs.writeFileSync(
      yamlFile,
      '# yaml-language-server: $schema=../../schemas/@aws-mdaa/cli.json\norganization: test\n',
    );

    injectSchemaDirectives(tempDir, schemasDir, new Map());

    const result = fs.readFileSync(yamlFile, 'utf-8');
    expect(result).toContain('yaml-language-server');
    expect(result).toContain('@aws-mdaa/cli.json');
    expect(result).toContain('.mdaa/1.6.0/schemas');
  });

  test('adds schema directive to mdaa.yaml without one', () => {
    const yamlFile = path.join(tempDir, 'mdaa.yaml');
    fs.writeFileSync(yamlFile, 'organization: test\n');

    injectSchemaDirectives(tempDir, schemasDir, new Map());

    const result = fs.readFileSync(yamlFile, 'utf-8');
    expect(result).toContain('yaml-language-server');
    expect(result).toContain('@aws-mdaa/cli.json');
  });

  test('uses version-specific schema dir when config has version override', () => {
    const versionedSchemas = path.join(tempDir, '.mdaa', '1.5.0', 'schemas');
    fs.mkdirSync(path.join(versionedSchemas, '@aws-mdaa'), { recursive: true });
    fs.writeFileSync(path.join(versionedSchemas, '@aws-mdaa', 'roles.json'), '{}');

    // Create mdaa.yaml that references the roles config
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      'organization: test\ndomains:\n  shared:\n    environments:\n      dev:\n        modules:\n          roles:\n            module_path: "@aws-mdaa/roles"\n            module_configs:\n              - ./roles.yaml\n',
    );

    const rolesFile = path.join(tempDir, 'roles.yaml');
    fs.writeFileSync(rolesFile, 'generateRoles: []\n');

    const configVersionMap = new Map<string, string>();
    configVersionMap.set(path.resolve(tempDir, './roles.yaml'), '1.5.0');

    injectSchemaDirectives(tempDir, schemasDir, configVersionMap);

    const result = fs.readFileSync(rolesFile, 'utf-8');
    expect(result).toContain('yaml-language-server');
    expect(result).toContain('1.5.0/schemas/@aws-mdaa/roles.json');
  });

  test('skips tags.yaml files', () => {
    const tagsFile = path.join(tempDir, 'tags.yaml');
    fs.writeFileSync(tagsFile, 'project: test\n');

    injectSchemaDirectives(tempDir, schemasDir, new Map());

    const result = fs.readFileSync(tagsFile, 'utf-8');
    expect(result).not.toContain('yaml-language-server');
  });

  test('skips files with no matching schema', () => {
    // Create mdaa.yaml so resolveModuleForConfig can work
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      'organization: test\ndomains:\n  shared:\n    environments:\n      dev:\n        modules:\n          unknown:\n            module_path: "@aws-mdaa/nonexistent-module"\n            module_configs:\n              - ./unknown.yaml\n',
    );
    const unknownFile = path.join(tempDir, 'unknown.yaml');
    fs.writeFileSync(unknownFile, 'data: value\n');

    injectSchemaDirectives(tempDir, schemasDir, new Map());

    const result = fs.readFileSync(unknownFile, 'utf-8');
    expect(result).not.toContain('yaml-language-server');
  });
});

describe('resolveModuleForConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-resolve-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns module name when config file is referenced in mdaa.yaml', () => {
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      'organization: test\ndomains:\n  shared:\n    environments:\n      dev:\n        modules:\n          roles:\n            module_path: "@aws-mdaa/roles"\n            module_configs:\n              - ./roles.yaml\n',
    );
    fs.writeFileSync(path.join(tempDir, 'roles.yaml'), 'generateRoles: []\n');

    const result = resolveModuleForConfig(path.join(tempDir, 'roles.yaml'), tempDir);
    expect(result).toBe('roles');
  });

  test('returns undefined when config file is not referenced in mdaa.yaml', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: test\ndomains: {}\n');
    fs.writeFileSync(path.join(tempDir, 'unknown.yaml'), 'data: value\n');

    const result = resolveModuleForConfig(path.join(tempDir, 'unknown.yaml'), tempDir);
    expect(result).toBeUndefined();
  });

  test('returns undefined when mdaa.yaml does not exist', () => {
    const result = resolveModuleForConfig(path.join(tempDir, 'roles.yaml'), tempDir);
    expect(result).toBeUndefined();
  });

  test('resolves module from nested config path', () => {
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      'organization: test\ndomains:\n  shared:\n    environments:\n      dev:\n        modules:\n          datalake:\n            module_path: "@aws-mdaa/datalake"\n            module_configs:\n              - ./data/datalake.yaml\n',
    );
    fs.mkdirSync(path.join(tempDir, 'data'));
    fs.writeFileSync(path.join(tempDir, 'data', 'datalake.yaml'), 'buckets: []\n');

    const result = resolveModuleForConfig(path.join(tempDir, 'data', 'datalake.yaml'), tempDir);
    expect(result).toBe('datalake');
  });
});

describe('generateGettingStartedContent', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-gs-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('includes version-specific paths when version is provided', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: <YOUR_ORG_NAME>\n');

    const result = generateGettingStartedContent(tempDir, 'minimal', '1.6.0');

    expect(result).toContain('.mdaa/1.6.0/docs');
    expect(result).toContain('.mdaa/1.6.0/schemas');
  });

  test('gives commands that resolve — scoped package name, pinned to the project version', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: <YOUR_ORG_NAME>\n');

    const result = generateGettingStartedContent(tempDir, 'minimal', '1.6.0');

    // The unscoped `mdaa` name is not on the registry and a config project has no
    // package.json, so `npx mdaa` cannot resolve in a scaffolded project
    expect(result).not.toContain('npx mdaa ');
    expect(result).toContain('npx @aws-mdaa/cli@1.6.0 deploy');
    expect(result).toContain('npx @aws-mdaa/cli@1.6.0 synth');
    expect(result).toContain('npx @aws-mdaa/cli@1.6.0 ls');
  });

  test('falls back to the unpinned scoped command when there is no version', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: <YOUR_ORG_NAME>\n');

    const result = generateGettingStartedContent(tempDir, 'minimal');

    expect(result).not.toContain('npx mdaa ');
    expect(result).toContain('npx @aws-mdaa/cli deploy');
  });

  test('uses default paths when version is not provided', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: <YOUR_ORG_NAME>\n');

    const result = generateGettingStartedContent(tempDir, 'minimal');

    expect(result).toContain('docs/mdaa');
    expect(result).toContain('schemas');
    expect(result).not.toContain('.mdaa/');
  });

  test('includes kit name and docs URL when kit is specified', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: test\n');

    const result = generateGettingStartedContent(tempDir, 'basic_datalake', '1.6.0');

    expect(result).toContain('basic_datalake');
    expect(result).toContain('https://aws.github.io/modern-data-architecture-accelerator/starter_kits/basic_datalake/');
  });

  test('includes generic description when no kit is specified', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: test\n');

    const result = generateGettingStartedContent(tempDir, undefined, '1.6.0');

    expect(result).toContain('MDAA (Modern Data Architecture Accelerator)');
    expect(result).toContain('Deployment');
  });

  test('lists discovered placeholders', () => {
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      '# TODO: Set org name\norganization: <YOUR_ORG_NAME>\naccount: <YOUR_ACCOUNT_ID>\n',
    );

    const result = generateGettingStartedContent(tempDir, 'minimal', '1.6.0');

    expect(result).toContain('<YOUR_ORG_NAME>');
    expect(result).toContain('<YOUR_ACCOUNT_ID>');
    expect(result).toContain('Outstanding TODOs');
  });
});

describe('buildConfigVersionMap', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-vmap-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns empty map when mdaa.yaml does not exist', () => {
    const result = buildConfigVersionMap(tempDir);
    expect(result.size).toBe(0);
  });

  test('reports rather than silently swallowing a config that does not parse', () => {
    // `<YOUR_ORG_NAME>` fails name validation — the state a freshly scaffolded project
    // is in until its TODOs are filled, when an empty map is indistinguishable from
    // "this project configures no per-module versions".
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: <YOUR_ORG_NAME>\nmdaa_version: "1.5.0"\n');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = buildConfigVersionMap(tempDir);

    expect(result.size).toBe(0);
    expect(logSpy.mock.calls.flat().join('\n')).toContain('could not read per-module versions');
    logSpy.mockRestore();
  });

  test('maps config files to pinned mdaa_version', () => {
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      [
        'organization: test',
        'mdaa_version: "1.5.0"',
        'domains:',
        '  shared:',
        '    environments:',
        '      dev:',
        '        modules:',
        '          roles:',
        '            module_path: "@aws-mdaa/roles"',
        '            module_configs:',
        '              - ./roles.yaml',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(tempDir, 'roles.yaml'), 'generateRoles: []\n');

    const result = buildConfigVersionMap(tempDir);

    expect(result.get(path.resolve(tempDir, './roles.yaml'))).toBe('1.5.0');
  });

  test('extracts version from module_path with @version suffix', () => {
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      [
        'organization: test',
        'domains:',
        '  shared:',
        '    environments:',
        '      dev:',
        '        modules:',
        '          datalake:',
        '            module_path: "@aws-mdaa/datalake@1.4.0"',
        '            module_configs:',
        '              - ./datalake.yaml',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(tempDir, 'datalake.yaml'), 'buckets: []\n');

    const result = buildConfigVersionMap(tempDir);

    expect(result.get(path.resolve(tempDir, './datalake.yaml'))).toBe('1.4.0');
  });

  test('module mdaa_version overrides global version', () => {
    fs.writeFileSync(
      path.join(tempDir, 'mdaa.yaml'),
      [
        'organization: test',
        'mdaa_version: "1.5.0"',
        'domains:',
        '  shared:',
        '    environments:',
        '      dev:',
        '        modules:',
        '          roles:',
        '            module_path: "@aws-mdaa/roles"',
        '            mdaa_version: "1.3.0"',
        '            module_configs:',
        '              - ./roles.yaml',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(tempDir, 'roles.yaml'), 'generateRoles: []\n');

    const result = buildConfigVersionMap(tempDir);

    expect(result.get(path.resolve(tempDir, './roles.yaml'))).toBe('1.3.0');
  });

  test('returns empty map when mdaa.yaml cannot be parsed', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), '{{invalid yaml: [');

    const result = buildConfigVersionMap(tempDir);
    expect(result.size).toBe(0);
  });
});

describe('cleanRepoLinks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-links-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Assertions are on the whole rewritten link, URL included. Asserting only that the
  // link *text* survives passes even if the URL were dropped entirely.
  const DOCS = 'https://aws.github.io/modern-data-architecture-accelerator';

  test('rewrites escaping links to the published docs URL', () => {
    const readme = path.join(tempDir, 'README.md');
    fs.writeFileSync(
      readme,
      'See [PREDEPLOYMENT](../../PREDEPLOYMENT.md) and [DEPLOYMENT](../../DEPLOYMENT.md) for details.\n',
    );

    cleanRepoLinks(tempDir);

    expect(fs.readFileSync(readme, 'utf-8')).toEqual(
      `See [PREDEPLOYMENT](${DOCS}/PREDEPLOYMENT.html) and [DEPLOYMENT](${DOCS}/DEPLOYMENT.html) for details.\n`,
    );
  });

  test('publishes .md targets as .html, since the site sets use_directory_urls: false', () => {
    const readme = path.join(tempDir, 'README.md');
    fs.writeFileSync(readme, 'Run [Bootstrap CDK](../../PREDEPLOYMENT.md#single-account-bootstrap) first.\n');

    cleanRepoLinks(tempDir);

    expect(fs.readFileSync(readme, 'utf-8')).toContain(
      `[Bootstrap CDK](${DOCS}/PREDEPLOYMENT.html#single-account-bootstrap)`,
    );
  });

  test('keeps the starter_kits path segment on sibling-kit links', () => {
    const readme = path.join(tempDir, 'README.md');
    fs.writeFileSync(readme, 'Compare with [basic datalake](../basic_datalake/).\n');

    cleanRepoLinks(tempDir);

    // The generic escape rule also matches `basic_datalake/`, so if it ran first this
    // would come out as `<DOCS>/basic_datalake/` and 404.
    expect(fs.readFileSync(readme, 'utf-8')).toEqual(
      `Compare with [basic datalake](${DOCS}/starter_kits/basic_datalake/).\n`,
    );
  });

  // mkdocs treats README.md as the directory index, so it publishes as index.html and
  // never serves README.html. A blanket .md -> .html swap emitted a 404 for this link,
  // which is the "how do I add more modules?" pointer in the minimal kit's README.
  test('publishes README.md as index.html rather than README.html', () => {
    const readme = path.join(tempDir, 'README.md');
    fs.writeFileSync(readme, 'Add more from the [available modules](../../README.md#available-modules) catalog.\n');

    cleanRepoLinks(tempDir);

    expect(fs.readFileSync(readme, 'utf-8')).toEqual(
      `Add more from the [available modules](${DOCS}/index.html#available-modules) catalog.\n`,
    );
  });

  test('publishes a nested README.md as that directory index', () => {
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
    const nested = path.join(tempDir, 'docs', 'guide.md');
    fs.writeFileSync(nested, 'See the [datalake module](../../packages/apps/datalake/datalake-app/README.md).\n');

    cleanRepoLinks(tempDir);

    expect(fs.readFileSync(nested, 'utf-8')).toEqual(
      `See the [datalake module](${DOCS}/packages/apps/datalake/datalake-app/index.html).\n`,
    );
  });

  // Guards the whole class rather than one phrasing: every rewritten target must land on
  // a path the site actually serves. The earlier tests asserted the string was transformed,
  // which stayed green while the transform produced 404s.
  test('every rewritten target resolves to a published page shape', () => {
    const readme = path.join(tempDir, 'README.md');
    fs.writeFileSync(
      readme,
      [
        '[a](../../PREDEPLOYMENT.md)',
        '[b](../../DEPLOYMENT.md#step-1)',
        '[c](../../README.md#available-modules)',
        '[d](../basic_datalake/)',
      ].join('\n') + '\n',
    );

    cleanRepoLinks(tempDir);

    const urls = [...fs.readFileSync(readme, 'utf-8').matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(m => m[1]);
    expect(urls).toHaveLength(4);
    for (const url of urls) {
      const pathPart = new URL(url).pathname;
      // Served shapes are a .html page or a directory URL; a bare .md never resolves.
      expect(pathPart).toMatch(/(\.html|\/)$/);
      expect(pathPart).not.toMatch(/\.md$/);
      expect(pathPart).not.toMatch(/README\.html$/);
    }
  });

  test('leaves intra-project links untouched', () => {
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });
    const nested = path.join(tempDir, 'docs', 'guide.md');
    const content = 'See [roles](../govern/roles.yaml) and [overview](./overview.md).\n';
    fs.writeFileSync(nested, content);

    cleanRepoLinks(tempDir);

    expect(fs.readFileSync(nested, 'utf-8')).toEqual(content);
  });

  test('does nothing when there is no markdown to rewrite', () => {
    fs.writeFileSync(path.join(tempDir, 'mdaa.yaml'), 'organization: test\n');

    expect(() => cleanRepoLinks(tempDir)).not.toThrow();
    // The non-markdown file is left exactly as it was
    expect(fs.readFileSync(path.join(tempDir, 'mdaa.yaml'), 'utf-8')).toEqual('organization: test\n');
  });
});

describe('extractKitDescription', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-desc-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('extracts first descriptive line after title', () => {
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# My Kit\n\nThis is a great kit for testing.\n');

    const result = extractKitDescription(tempDir);
    expect(result).toBe('This is a great kit for testing.');
  });

  test('skips blockquotes and image lines', () => {
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# My Kit\n> **Quick link**\n!image\nActual description here.\n');

    const result = extractKitDescription(tempDir);
    expect(result).toBe('Actual description here.');
  });

  test('returns empty string when no README exists', () => {
    const result = extractKitDescription(tempDir);
    expect(result).toBe('');
  });

  test('returns empty string when README has only a title', () => {
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# My Kit\n');

    const result = extractKitDescription(tempDir);
    expect(result).toBe('');
  });
});

describe('getTemplatesDir', () => {
  test('returns a valid directory containing starter kits', () => {
    const dir = getTemplatesDir();
    expect(fs.existsSync(dir)).toBe(true);
    expect(fs.existsSync(path.join(dir, 'minimal', 'mdaa.yaml'))).toBe(true);
  });
});

describe('rewriteCanonicalReferences', () => {
  test('rewrites CONFIGURATION.md to versioned docs path', () => {
    const body = 'Full reference: #[[file:CONFIGURATION.md]].';
    const result = rewriteCanonicalReferences(body, '1.6.0');
    expect(result).toBe('Full reference: #[[file:.mdaa/1.6.0/docs/CONFIGURATION.md]].');
  });

  test('rewrites schema paths to versioned schemas path', () => {
    const body = 'Read the schema at `schemas/@aws-mdaa/datalake.json`';
    const result = rewriteCanonicalReferences(body, '1.6.0');
    expect(result).toBe('Read the schema at `.mdaa/1.6.0/schemas/@aws-mdaa/datalake.json`');
  });

  test('rewrites markdown links to CONFIGURATION.md', () => {
    const body = 'See [Dynamic References](CONFIGURATION.md#dynamic-references).';
    const result = rewriteCanonicalReferences(body, '1.6.0');
    expect(result).toBe('See [Dynamic References](.mdaa/1.6.0/docs/CONFIGURATION.md#dynamic-references).');
  });

  // The body lands at agent_rules/<name>.md, so its markdown links climb one directory to
  // reach the project root. Stripping the ../ would point them at agent_rules/.mdaa/...
  test('preserves a ../ prefix on markdown links so they resolve from agent_rules/', () => {
    const body = 'Full reference: [guide](../CONFIGURATION.md). See [Dynamic](../CONFIGURATION.md#dynamic-references).';
    const result = rewriteCanonicalReferences(body, '1.6.0');
    expect(result).toBe(
      'Full reference: [guide](../.mdaa/1.6.0/docs/CONFIGURATION.md). ' +
        'See [Dynamic](../.mdaa/1.6.0/docs/CONFIGURATION.md#dynamic-references).',
    );
  });

  test('rewrites each reference once, leaving no doubled version segment', () => {
    const body = '[a](../CONFIGURATION.md) and #[[file:CONFIGURATION.md]] and `../schemas/@aws-mdaa/x.json`';
    const result = rewriteCanonicalReferences(body, '1.6.0');
    expect(result).toBe(
      '[a](../.mdaa/1.6.0/docs/CONFIGURATION.md) and #[[file:.mdaa/1.6.0/docs/CONFIGURATION.md]] ' +
        'and `../.mdaa/1.6.0/schemas/@aws-mdaa/x.json`',
    );
    expect(result).not.toContain('docs/.mdaa');
  });
});

describe('mdaa init - canonical rule copy', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-canon-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('copies canonical rule into agent_rules/ so projections resolve', async () => {
    const outputDir = path.join(tempDir, 'output');

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: true, force: true });

    const canonical = path.join(outputDir, 'agent_rules', 'user-config-authoring.md');
    expect(fs.existsSync(canonical)).toBe(true);

    // References rewritten to versioned asset paths; no bare repo-root refs remain
    const content = fs.readFileSync(canonical, 'utf-8');
    expect(content).toContain('.mdaa/');
    expect(content).not.toMatch(/#\[\[file:CONFIGURATION\.md\]\]/);
  });
});

describe('mdaa init - interactive prompts', () => {
  simulateTerminal();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-interactive-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('scaffolds after interactive kit selection and placeholder entry', async () => {
    const outputDir = path.join(tempDir, 'output');
    // Every prompt returns this object; each call reads the field it needs
    // (kit selection reads .kit, placeholder prompts read .value).
    promptsMock.mockResolvedValue({ kit: 'minimal', value: 'interactive-value' });

    await runInit({ targetDir: outputDir, starterKit: undefined, enhance: false, noPrompt: false, force: true });

    // Which prompt was opened, not merely that something prompted
    expect(promptsMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'select', name: 'kit' }));
    expect(promptsMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'text', name: 'value' }));
    expect(fs.existsSync(path.join(outputDir, 'mdaa.yaml'))).toBe(true);
    // Placeholder values supplied interactively were applied
    const mdaaYaml = fs.readFileSync(path.join(outputDir, 'mdaa.yaml'), 'utf-8');
    expect(mdaaYaml).not.toContain('<YOUR_ORG_NAME>');
  });

  test('cancels when no kit is selected in the interactive prompt', async () => {
    const outputDir = path.join(tempDir, 'output');
    promptsMock.mockResolvedValue({}); // no .kit -> cancel

    await expect(
      runInit({ targetDir: outputDir, starterKit: undefined, enhance: false, noPrompt: false, force: true }),
    ).rejects.toThrow(CancelledError);
    // A cancellation is reported as such rather than exiting 0, which a wrapper script
    // could not tell apart from a successful scaffold.
    expect(process.exit).not.toHaveBeenCalled();
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  test('cancels when a placeholder prompt is aborted (value undefined)', async () => {
    const outputDir = path.join(tempDir, 'output');
    // Kit provided, so first prompt is a placeholder; aborting yields undefined value.
    promptsMock.mockResolvedValue({ value: undefined });

    await expect(
      runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: false, force: true }),
    ).rejects.toThrow(CancelledError);
    expect(process.exit).not.toHaveBeenCalled();
    // Output dir is not created when scaffolding is aborted during prompting
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  test('leaves placeholder as TODO when a blank value is entered', async () => {
    const outputDir = path.join(tempDir, 'output');
    // Empty string (not undefined) -> skipped, placeholder remains
    promptsMock.mockResolvedValue({ value: '' });

    await runInit({ targetDir: outputDir, starterKit: 'minimal', enhance: false, noPrompt: false, force: true });

    const mdaaYaml = fs.readFileSync(path.join(outputDir, 'mdaa.yaml'), 'utf-8');
    expect(mdaaYaml).toContain('<YOUR_ORG_NAME>');
  });
});

describe('mdaa init - enhance confirmation prompt', () => {
  simulateTerminal();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-enhance-prompt-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('enhances when the user confirms the prompt', async () => {
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, 'mdaa.yaml'), 'organization: test\n');
    promptsMock.mockResolvedValue({ confirm: true });

    await runInit({ targetDir: existingDir, starterKit: undefined, enhance: false, noPrompt: false, force: true });

    expect(promptsMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'confirm', name: 'confirm' }));
    expect(fs.existsSync(path.join(existingDir, '.kiro', 'steering'))).toBe(true);
    expect(fs.existsSync(path.join(existingDir, '.mdaa'))).toBe(true);
  });

  test('cancels when the user declines the prompt', async () => {
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, 'mdaa.yaml'), 'organization: test\n');
    promptsMock.mockResolvedValue({ confirm: false });

    await expect(
      runInit({ targetDir: existingDir, starterKit: undefined, enhance: false, noPrompt: false, force: true }),
    ).rejects.toThrow(CancelledError);
    expect(process.exit).not.toHaveBeenCalled();
    // Nothing added on cancel
    expect(fs.existsSync(path.join(existingDir, '.kiro'))).toBe(false);
  });
});

describe('mdaa init - version override reporting', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-init-vover-'));
    jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('reports per-module version overrides during enhance', async () => {
    const existingDir = path.join(tempDir, 'existing');
    fs.mkdirSync(existingDir);
    // Global version 1.6.0, but the module pins an exact 1.4.0 via module_path,
    // so the effective per-config version differs from the global one and the
    // override-reporting branch runs.
    fs.writeFileSync(
      path.join(existingDir, 'mdaa.yaml'),
      [
        'organization: test',
        'mdaa_version: "1.6.0"',
        'domains:',
        '  shared:',
        '    environments:',
        '      dev:',
        '        modules:',
        '          roles:',
        '            module_path: "@aws-mdaa/roles@1.4.0"',
        '            module_configs:',
        '              - ./roles.yaml',
        '',
      ].join('\n'),
    );
    fs.writeFileSync(path.join(existingDir, 'roles.yaml'), 'generateRoles: []\n');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await runInit({ targetDir: existingDir, starterKit: undefined, enhance: true, noPrompt: true, force: true });
    } finally {
      const logged = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
      logSpy.mockRestore();
      expect(logged).toContain('Module version overrides detected');
      expect(logged).toContain('1.4.0');
    }
  });
});
