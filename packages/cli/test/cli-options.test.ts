/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Coverage for the action-dependent option namespace.
 *
 * The deploy actions forward every argv token MDAA does not define to `cdk`, so which
 * definitions are in scope decides which cdk flags an operator can still reach. Defining
 * `--force` for all actions is what made `mdaa destroy --force` stop suppressing cdk's
 * per-stack confirmation: it parsed, only init/upgrade read it, and it never reached cdk.
 */

import { parseCliCommands } from '@aws-mdaa/testing';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MdaaDeploy } from '../lib/mdaa-deploy';
import * as packageHelper from '../lib/package-helper';
import { INIT_OPTION_DEFINITIONS, flagLikeTokens, parseCliOptions } from '../lib/cli-options';

describe('flagLikeTokens', () => {
  // Drives the guard that decides whether a leftover token is a typo'd option or the
  // positional an action was given. `command-line-args` treats a dash before a digit as part
  // of a value, so the two cannot be told apart by the leading dash alone.
  test.each([
    ['a long option', ['--starterkit'], ['--starterkit']],
    ['a short option', ['-o'], ['-o']],
    ['a bare double dash', ['--'], ['--']],
    ['a dash-prefixed version', ['-1.7.0'], []],
    ['a bare dash', ['-'], []],
    ['a plain version', ['1.7.0'], []],
    ['a directory path', ['./proj'], []],
  ])('treats %s correctly', (_label, tokens, expected) => {
    expect(flagLikeTokens(tokens)).toEqual(expected);
  });

  test('keeps argv order and drops only the values', () => {
    expect(flagLikeTokens(['./proj', '--starterkit', '-1.7.0', '-o'])).toEqual(['--starterkit', '-o']);
  });
});

describe('parseCliOptions', () => {
  test('pushes an option MDAA does not define down to cdk', () => {
    expect(parseCliOptions(['destroy', '--force'])).toMatchObject({
      action: 'destroy',
      _unknown: ['--force'],
    });
  });

  test('pushes down an option given before the action', () => {
    expect(parseCliOptions(['--force', 'destroy'])).toMatchObject({
      action: 'destroy',
      _unknown: ['--force'],
    });
  });

  test('pushes down several options in argv order', () => {
    expect(parseCliOptions(['destroy', '--force', '--exclusively'])['_unknown']).toEqual(['--force', '--exclusively']);
  });

  // Every spelling, derived from the list rather than named, so an init-only option added later
  // is covered without anyone remembering to extend this. Moving any of them into
  // BASE_OPTION_DEFINITIONS is the regression class this module exists to prevent.
  const initOnlySpellings: ReadonlyArray<[string, string]> = INIT_OPTION_DEFINITIONS.flatMap(definition => {
    const spellings: [string, string][] = [[`--${definition.name}`, definition.name]];
    if (definition.alias) {
      spellings.push([`-${definition.alias}`, definition.name]);
    }
    return spellings;
  });

  test.each(initOnlySpellings)('leaves the init-only option %s for cdk on a deploy action', (spelling, name) => {
    const options = parseCliOptions(['destroy', spelling]);

    // Keyed on the definition name, since an alias would report `undefined` either way.
    expect(options[name]).toBeUndefined();
    expect(options['_unknown']).toContain(spelling);
  });

  test('resolves the action when a value-taking option precedes it', () => {
    // The value would be read as the positional action if `--config` were unrecognised
    // during the pass that resolves the action.
    expect(parseCliOptions(['--config', './other.yaml', 'destroy'])).toMatchObject({
      action: 'destroy',
      config: './other.yaml',
    });
  });

  // The pass that withholds the init-only definitions does not know `--starter-kit` takes a
  // value, so the value after it falls into the positional slot and becomes that pass's action.
  // Routing on it dispatched a verb the operator never asked for.
  test.each([
    ['a kit named after an action verb', ['--starter-kit', 'destroy', 'deploy']],
    ['an ordinary kit name', ['--starter-kit', 'minimal', 'deploy']],
  ])('routes on the action rather than %s', (_label, argv) => {
    const options = parseCliOptions(argv);

    expect(options['action']).toBe('deploy');
    // Left in the pushdown, cdk would read the verb as a stack name.
    expect(options['_unknown']).not.toContain('deploy');
  });

  test('does not take an action from an init-only option value alone', () => {
    expect(parseCliOptions(['--starter-kit', 'destroy'])['action']).toBeUndefined();
  });

  test('survives an init-only option value colliding with an explicit --action', () => {
    // Without `--starter-kit` defined, `minimal` is a bare token while `--action` has already
    // claimed the positional slot, which command-line-args reports as ALREADY_SET.
    expect(parseCliOptions(['--starter-kit', 'minimal', '--action', 'deploy'])['action']).toBe('deploy');
  });

  test('claims init options for the init action', () => {
    expect(parseCliOptions(['init', '--starter-kit', 'minimal', '--overwrite', './proj'])).toMatchObject({
      action: 'init',
      'starter-kit': 'minimal',
      overwrite: true,
      _unknown: ['./proj'],
    });
  });

  test('claims init options given before the action', () => {
    expect(parseCliOptions(['--starter-kit', 'minimal', 'init', './proj'])).toMatchObject({
      action: 'init',
      'starter-kit': 'minimal',
      _unknown: ['./proj'],
    });
  });

  test('claims --overwrite for the upgrade action, leaving the version positional', () => {
    expect(parseCliOptions(['upgrade', '--overwrite', '1.7.0'])).toMatchObject({
      action: 'upgrade',
      overwrite: true,
      _unknown: ['1.7.0'],
    });
  });

  test('leaves a misspelled init option in _unknown, where init rejects it', () => {
    // `positionalsOrExit` in mdaa.ts turns any flag-like leftover into an error rather than
    // scaffolding a directory named after the typo.
    expect(parseCliOptions(['init', '--starterkit', 'minimal', './proj'])['_unknown']).toContain('--starterkit');
  });

  test('leaves the action unset and defaults the config path for a bare invocation', () => {
    expect(parseCliOptions([])).toEqual({ config: './mdaa.yaml' });
  });

  test('reads the process arguments when given no argv', () => {
    // The production call site passes nothing, so the default has to strip the interpreter
    // and script entries itself.
    const processArgv = process.argv;
    process.argv = [processArgv[0], 'bin/mdaa.js', 'destroy', '--force'];
    try {
      expect(parseCliOptions()).toMatchObject({ action: 'destroy', _unknown: ['--force'] });
    } finally {
      process.argv = processArgv;
    }
  });
});

describe('emitted cdk command', () => {
  // MdaaDeploy's constructor calls loadLocalPackages unconditionally, which shells out to
  // `npm query .workspace` across the whole workspace. Nothing here needs the result, and an
  // option-parsing test should not depend on npm being reachable.
  // A temp working dir, not a cwd-relative one: nothing writes it under --testing today, but
  // createTerraformOverride writes regardless of test mode, so a cwd-relative path would drop
  // untracked files into the source tree if a future config reached that branch.
  let workingDir: string;

  beforeEach(() => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-emitted-'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(workingDir, { recursive: true, force: true });
  });

  /**
   * Commands containing `cdk 'destroy'` that one run emits: the single configured module plus
   * the injected bootstrap module, each logged twice (`Running cmd:` and `Testing Mode:`).
   */
  const EXPECTED_DESTROY_COMMANDS = 4;

  const CONFIG_CONTENTS = {
    mdaa_version: 'test-version',
    organization: 'test-org',
    domains: {
      'test-domain': {
        environments: {
          dev: {
            modules: {
              'test-module': {
                module_path: '@aws-mdaa/test',
              },
            },
          },
        },
      },
    },
  };

  /**
   * Run the CLI's own argv handling through to the `cdk destroy` command lines that
   * `--testing` mode prints instead of executing. The action reaches cdk quoted
   * (`cdk 'destroy'`), and each command is emitted across backslash-continued lines, so
   * the baseline harness's parser does the folding rather than a bespoke matcher here.
   *
   * The single quotes assume the POSIX branch of `shellQuote`, which double-quotes on win32.
   * Consistent with the rest of this package, and there is no Windows CI job.
   */
  function cdkDestroyCommands(argv: string[]): string[] {
    const options = parseCliOptions([...argv, '--testing', '--working_dir', workingDir]);
    const logged: string[] = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    try {
      new MdaaDeploy(options, options['_unknown'], CONFIG_CONTENTS).deploy();
    } finally {
      logSpy.mockRestore();
    }

    const commands = parseCliCommands(logged.join('\n'))
      .map(entry => entry.command)
      .filter(command => command.includes("cdk 'destroy'"));
    // An exact count, not just "some": the command is logged once as `Running cmd:` and once as
    // `Testing Mode:` per module, so a change that dropped one emission path would otherwise
    // pass unnoticed. Carry the captured output into the message - the console.log spy is
    // holding the only record of what the CLI printed.
    const expected = EXPECTED_DESTROY_COMMANDS;
    const diagnostics = `expected ${expected} cdk destroy commands for \`${argv.join(' ')}\`, got ${
      commands.length
    }:\n${logged.join('\n')}`;
    expect(commands.length === expected ? '' : diagnostics).toBe('');
    return commands;
  }

  test('appends --force verbatim to every cdk destroy command', () => {
    // Pushdown args reach cdk through the audited `unsafeCommand` escape hatch rather than
    // the quoting builder, which would break legitimate multi-token cdk flags. Assert the
    // exact appended form, since a substring check would also pass on `'--force'`.
    const notAppended = cdkDestroyCommands(['destroy', '--force']).filter(command => !/ --force$/.test(command));

    expect(notAppended).toEqual([]);
  });

  test('omits --force when it was not requested', () => {
    const withForce = cdkDestroyCommands(['destroy']).filter(command => command.includes('--force'));

    expect(withForce).toEqual([]);
  });
});

/**
 * `mdaa.ts` parses argv and dispatches at module load, so it cannot be imported - the suites
 * below spawn it instead. Without that, everything between the parse result and the feature it
 * drives is unpinned: reading a stale `options['force']` at the dispatch would parse cleanly
 * and silently stop overwriting, the same failure mode as the pushdown regression above.
 */
const CLI = path.join(__dirname, '..', 'lib', 'mdaa.js');

/** No stdin, so any prompt fails closed rather than hanging the suite. */
function spawnCli(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 120_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('--overwrite reaches the scaffolding path', () => {
  const USER_EDIT = 'MY HAND-WRITTEN NOTES';

  function runCli(args: string[], cwd: string): void {
    const proc = spawnCli(args, cwd);
    const failure = `mdaa ${args.join(' ')} exited ${proc.status}\n${proc.stdout ?? ''}\n${proc.stderr ?? ''}`;
    expect(proc.status === 0 ? '' : failure).toBe('');
  }

  /** Scaffold a project, then edit CLAUDE.md so its hash no longer matches the manifest. */
  function projectWithModifiedClaudeMd(): { workDir: string; projectDir: string } {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-overwrite-'));
    runCli(['init', 'proj', '--starter-kit', 'minimal', '--no-prompt'], workDir);
    const projectDir = path.join(workDir, 'proj');
    fs.appendFileSync(path.join(projectDir, 'CLAUDE.md'), `\n${USER_EDIT}\n`);
    return { workDir, projectDir };
  }

  const claudeMd = (projectDir: string): string =>
    fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), { encoding: 'utf-8' });

  test('init --enhance keeps a user edit when the flag is absent', () => {
    const { workDir, projectDir } = projectWithModifiedClaudeMd();
    try {
      runCli(['init', '--enhance', 'proj'], workDir);

      expect(claudeMd(projectDir)).toContain(USER_EDIT);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);

  test('init --enhance --overwrite replaces a user edit', () => {
    const { workDir, projectDir } = projectWithModifiedClaudeMd();
    try {
      runCli(['init', '--enhance', '--overwrite', 'proj'], workDir);

      expect(claudeMd(projectDir)).not.toContain(USER_EDIT);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);

  // upgrade as well as init: the two actions read the option at separate dispatch sites.
  test('upgrade --overwrite replaces a user edit', () => {
    const { workDir, projectDir } = projectWithModifiedClaudeMd();
    try {
      runCli(['upgrade', '--overwrite'], projectDir);

      expect(claudeMd(projectDir)).not.toContain(USER_EDIT);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);
});

describe('leftover argv on init and upgrade', () => {
  test('treats a dash-prefixed version as a value, not an unknown option', () => {
    // `command-line-args` classifies `-1.7.0` as a value, so the unknown-option guard must let
    // it reach the version validator, which can say what is actually wrong with it.
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-positionals-'));
    fs.writeFileSync(path.join(workDir, 'mdaa.yaml'), 'organization: test-org\n');
    try {
      const proc = spawnCli(['upgrade', '-1.7.0'], workDir);

      expect(`${proc.stdout ?? ''}${proc.stderr ?? ''}`).toContain('Invalid target version');
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);

  test('rejects a misspelled option rather than scaffolding a directory named after it', () => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-positionals-'));
    try {
      const proc = spawnCli(['init', '--starterkit', 'minimal', 'proj'], workDir);

      expect(`${proc.stdout ?? ''}${proc.stderr ?? ''}`).toContain('Unknown option: --starterkit');
      expect(fs.existsSync(path.join(workDir, '--starterkit'))).toBe(false);
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);
});
