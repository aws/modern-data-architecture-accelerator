/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { ShellCommand } from '../lib/shell-command';
import { shellQuote } from '../lib/platform-utils';
import { MdaaDeploy } from '../lib/mdaa-deploy';
import * as packageHelper from '../lib/package-helper';

// A corpus of values that carry shell meaning if left un-quoted. Every one of
// these must become inert (a literal argument) once passed through shellQuote.
const INJECTION_CORPUS: Array<[string, string]> = [
  ['command substitution $()', '$(id)'],
  ['command substitution backticks', '`id`'],
  ['command chaining semicolon', 'foo; rm -rf /'],
  ['command chaining &&', 'foo && id'],
  ['pipe', 'foo | id'],
  ['redirect', 'foo > /tmp/pwned'],
  ['newline', 'foo\nid'],
  ['single quote', "foo'bar"],
  ['double single quotes', "''"],
  ['leading/trailing quote', "'; id; '"],
  ['embedded double quote', 'foo"bar'],
  ['dollar-brace var', '${HOME}'],
  ['glob', 'foo*'],
  ['tilde', '~/foo'],
];

describe('shellQuote', () => {
  it('wraps a simple value in single quotes (byte-identical to the old quoting)', () => {
    expect(shellQuote('us-east-1')).toBe("'us-east-1'");
    expect(shellQuote('/usr/local/bin')).toBe("'/usr/local/bin'");
  });

  it('encodes the empty string as an explicit empty argument', () => {
    expect(shellQuote('')).toBe("''");
  });

  it('escapes embedded single quotes with the POSIX close/escape/reopen sequence', () => {
    expect(shellQuote("foo'bar")).toBe("'foo'\\''bar'");
    expect(shellQuote("'")).toBe("''\\'''");
  });

  it.each(INJECTION_CORPUS)('neutralizes %s so /bin/sh sees the exact literal bytes', (_label, payload) => {
    const quoted = shellQuote(payload);
    // Ask a real shell to echo the quoted token and confirm it round-trips
    // verbatim — i.e. nothing inside it was expanded, substituted, or split.
    const { execSync } = require('child_process'); // eslint-disable-line @typescript-eslint/no-require-imports
    const echoed = execSync(`printf %s ${quoted}`, { encoding: 'utf-8' });
    expect(echoed).toBe(payload);
  });
});

describe('ShellCommand', () => {
  it('for() seeds the program name and flags()/arg() quote only values', () => {
    const cmd = ShellCommand.for('cp').flags('-r').arg('/a b/src').arg('/dst').build();
    expect(cmd).toBe("cp -r '/a b/src' '/dst'");
  });

  it('args() starts a bare fragment with no leading program name', () => {
    expect(ShellCommand.args().option('-var', 'org=x').build()).toBe("-var 'org=x'");
  });

  it('flags() appends each valueless literal as its own part', () => {
    expect(ShellCommand.for('npm').flags('install', '--no-fund', '--save-exact').build()).toBe(
      'npm install --no-fund --save-exact',
    );
  });

  it('option() keeps the flag and its quoted value in one part', () => {
    expect(ShellCommand.args().option('-c', 'key=value').build()).toBe("-c 'key=value'");
    // One part: the flag/value pair survives a non-default separator intact.
    expect(ShellCommand.for('cdk').option('-c', 'key=value').build(' \\\n\t')).toBe("cdk \\\n\t-c 'key=value'");
  });

  it('option() neutralizes an injection payload in the value', () => {
    const cmd = ShellCommand.args().option('-c', 'module_config_data=$(id)').build();
    expect(cmd).toBe("-c 'module_config_data=$(id)'");
    // The `$(id)` is inside single quotes, so it is inert.
    const { execSync } = require('child_process'); // eslint-disable-line @typescript-eslint/no-require-imports
    const echoed = execSync(`printf '%s' ${cmd.replace(/^-c /, '')}`, { encoding: 'utf-8' });
    expect(echoed).toBe('module_config_data=$(id)');
  });

  it('supports the multi-line and compound join separators', () => {
    expect(ShellCommand.for('a').flags('b').build(' \\\n\t')).toBe('a \\\n\tb');
    expect(ShellCommand.for('x').flags('y').build(' && ')).toBe('x && y');
  });

  it('shellSyntax() appends deliberate literal shell syntax verbatim', () => {
    expect(ShellCommand.for('npm').shellSyntax('>').arg('/dev/null').build()).toBe("npm > '/dev/null'");
  });
});

// ShellCommand does not implement quoting itself — it delegates every value to
// platform-utils.shellQuote, which selects POSIX vs cmd.exe encoding. The tests
// above run on the POSIX branch (CI + dev hosts are POSIX). This block forces the
// Windows branch by re-importing ShellCommand with platform-utils mocked to report
// win32, proving values are routed through the platform quoter (double-quoted,
// `"`->`""`) rather than hardcoded to POSIX single-quoting.
describe('ShellCommand delegates to the Windows quoting branch on win32', () => {
  const loadWindowsShellCommand = (): typeof import('../lib/shell-command') => {
    let mod!: typeof import('../lib/shell-command');
    jest.isolateModules(() => {
      jest.doMock('../lib/platform-utils', () => {
        const actual = jest.requireActual('../lib/platform-utils');
        return {
          ...actual,
          // Force the cmd.exe branch regardless of the host OS.
          shellQuote: (value: string) => actual.shellQuote(value, true),
        };
      });
      mod = require('../lib/shell-command'); // eslint-disable-line @typescript-eslint/no-require-imports
    });
    return mod;
  };

  afterEach(() => {
    jest.dontMock('../lib/platform-utils');
    jest.resetModules();
  });

  it('arg() uses cmd.exe double-quoting', () => {
    const { ShellCommand: WinShellCommand } = loadWindowsShellCommand();
    expect(WinShellCommand.for('cd').flags('/d').arg('C:\\my dir').build()).toBe('cd /d "C:\\my dir"');
  });

  it('option() double-quotes the value and doubles an embedded double-quote', () => {
    const { ShellCommand: WinShellCommand } = loadWindowsShellCommand();
    expect(WinShellCommand.args().option('-c', 'k=a"b').build()).toBe('-c "k=a""b"');
  });

  it('neutralizes an injection payload with cmd.exe quoting', () => {
    const { ShellCommand: WinShellCommand } = loadWindowsShellCommand();
    // The `& del /q *` is inside the double-quoted token, so cmd.exe treats it as
    // literal argument bytes rather than a command separator.
    expect(WinShellCommand.args().option('-c', 'x=a" & del /q *').build()).toBe('-c "x=a"" & del /q *"');
  });
});

// Source-scanning guard, now a *backstop* to the primary guarantee.
//
// The primary guarantee is compile-time: the executors (`execCmd`,
// `executeCommand`, `executeCommandWithCapture`) and the command arrays they
// consume accept only a `SafeCommand` (see ./safe-command), not a `string`, so a
// hand-assembled `execCmd(`--out ${x}`)` no longer type-checks — the bypass a
// regex over line-split source could never reliably see is now a compile error.
// The `ShellCommand` trusted-text methods (`for`, `flags`, `option`'s flag,
// `shellSyntax`) AND `staticCommand()` now take a `Literal<T>`, so an interpolated
// template literal at any of them also fails to compile; both the old `.raw()`
// scan and the `staticCommand()` interpolation scan are gone because the type
// system supersedes them (see test/types.negative.ts, which pins that both
// bypasses are rejected by the compiler).
//
// One source scan remains, for a bypass the type system deliberately does NOT
// narrow: the `unsafeCommand()` escape hatch brands an arbitrary `string` on
// purpose (it is the audited hook/`--cdk-pushdown` trust boundary), so only a
// source scan can assert it appears at its two sanctioned sinks and nowhere else.
//
// `brandSafe()` is unchecked too, but is left to code review rather than scanned —
// the config is a trusted input. See the trust model in lib/safe-command.ts.
describe('command-builder shell-injection guard (backstop to compile-time SafeCommand enforcement)', () => {
  const libDir = path.resolve(__dirname, '../lib');
  // Source `.ts` only — skip generated `.d.ts` declaration artifacts (gitignored
  // build output), which are not source and would otherwise re-flag the doc-comment
  // anti-patterns copied into safe-command.d.ts.
  const sourceFiles = (): string[] => fs.readdirSync(libDir).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));

  // `unsafeCommand()` is the single audited escape hatch. Pin its call sites so a
  // new, unreviewed bypass can't be added silently: it may appear only in
  // mdaa-deploy.ts, only at the hook-command sink and the `--cdk-pushdown` mapping.
  //
  // Match on file + invocation count + a loose signature (the argument name) so a
  // cosmetic reformat, rename, or Prettier rewrap does NOT read as a security
  // violation. A genuinely new call site (different file, extra invocation, or an
  // unexpected argument) still fails.
  it('unsafeCommand() is only invoked at its two documented trust-boundary sinks', () => {
    const callSites: Array<{ file: string; arg: string }> = [];
    for (const fileName of sourceFiles()) {
      if (fileName === 'safe-command.ts') {
        continue; // its definition + doc comments legitimately name the function
      }
      const source = fs.readFileSync(path.join(libDir, fileName), 'utf-8');
      // Capture the (single, simple-identifier) argument of each invocation. An
      // `import { unsafeCommand }` has no `(` after the name, so it is naturally
      // excluded; whitespace/formatting around the call is tolerated.
      for (const match of source.matchAll(/\bunsafeCommand\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) {
        callSites.push({ file: fileName, arg: match[1] });
      }
    }
    // Exactly the two sanctioned sinks, both in mdaa-deploy.ts: the transformed hook
    // command, and each operator-supplied `--cdk-pushdown` arg.
    expect(callSites).toEqual([
      { file: 'mdaa-deploy.ts', arg: 'transformedHookCommand' },
      { file: 'mdaa-deploy.ts', arg: 'arg' },
    ]);
  });
});

// End-to-end regression: drive the real command assembly (test mode logs the
// command instead of running it) with injection payloads in config values and
// assert the payload appears single-quoted/escaped — inert — in the generated
// command, not bare.
describe('config-value injection is neutralized in generated commands (regression)', () => {
  const buildDeploy = (
    contents: Record<string, unknown>,
    action = 'synth',
  ): { deploy: MdaaDeploy; captured: string[] } => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    const deploy = new MdaaDeploy({ action, testing: 'true' }, [], contents as never);
    const captured: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(deploy as any, 'execCmd').mockImplementation(((cmd: string) => {
      captured.push(cmd);
    }) as never);
    return { deploy, captured };
  };

  afterEach(() => jest.restoreAllMocks());

  it('single-quotes a $(id) payload in a module_config_data value', () => {
    const { deploy, captured } = buildDeploy({
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                  use_bootstrap: false,
                  module_config_data: { evil: '$(id)' },
                },
              },
            },
          },
        },
      },
    });
    deploy.deploy();
    const cdkCmd = captured.find(c => c.includes('module_config_data'));
    expect(cdkCmd).toBeDefined();
    // The JSON blob carrying $(id) must be single-quoted (inert), never bare.
    expect(cdkCmd).toContain(shellQuote(`module_config_data=${JSON.stringify({ evil: '$(id)' })}`));
    // And never in the old bare double-quoted form that let the shell expand it.
    expect(cdkCmd).not.toContain('module_config_data="');
  });

  it('single-quotes a value containing a single quote in a context value', () => {
    const { deploy, captured } = buildDeploy({
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              context: { note: "it's a trap; rm -rf /" },
              modules: { 'test-module': { module_path: '@test/module', use_bootstrap: false } },
            },
          },
        },
      },
    });
    deploy.deploy();
    const cdkCmd = captured.find(c => c.includes('note='));
    expect(cdkCmd).toBeDefined();
    expect(cdkCmd).toContain(shellQuote("note=it's a trap; rm -rf /"));
  });

  it('single-quotes a $(id) payload in a Terraform -var value', () => {
    // The TF `-var` config loop only runs for plan/apply actions.
    const { deploy, captured } = buildDeploy(
      {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': {
                modules: {
                  'tf-module': {
                    module_type: 'tf',
                    module_path: '@aws-mdaa/test',
                    mdaa_compliant: true,
                    use_bootstrap: false,
                    module_config_data: { evil: '$(id)' },
                  },
                },
              },
            },
          },
        },
      },
      'plan',
    );
    deploy.deploy();
    const tfVarCmd = captured.find(c => c.includes('-var') && c.includes('evil'));
    expect(tfVarCmd).toBeDefined();
    expect(tfVarCmd).toContain(shellQuote(`evil=${JSON.stringify('$(id)')}`));
  });
});

// Sinks whose neutralization was previously exercised by coverage but never
// asserted. Each drives a config value carrying shell metacharacters through the
// specific sink and asserts it lands single-quoted (inert), never bare.
describe('remaining command sinks neutralize injection payloads', () => {
  const buildDeploy = (
    contents: Record<string, unknown>,
    options: Record<string, string> = {},
  ): { deploy: MdaaDeploy; captured: string[] } => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    const deploy = new MdaaDeploy({ action: 'synth', testing: 'true', ...options }, [], contents as never);
    const captured: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(deploy as any, 'execCmd').mockImplementation(((cmd: string) => {
      captured.push(cmd);
    }) as never);
    return { deploy, captured };
  };

  afterEach(() => jest.restoreAllMocks());

  it('single-quotes an injection payload in a -r roleArn', () => {
    const { deploy, captured } = buildDeploy(
      {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': { modules: { 'test-module': { module_path: '@test/module', use_bootstrap: false } } },
            },
          },
        },
      },
      { role_arn: 'arn:aws:iam::123456789012:role/x$(id)' },
    );
    deploy.deploy();
    const cdkCmd = captured.find(c => c.includes('-r '));
    expect(cdkCmd).toBeDefined();
    expect(cdkCmd).toContain(shellQuote('arn:aws:iam::123456789012:role/x$(id)'));
    // Never bare: the `$(id)` must not sit outside single quotes.
    expect(cdkCmd).not.toMatch(/-r [^']*\$\(id\)/);
  });

  it('single-quotes an injection payload in a -c string context param', () => {
    // permissions_boundary_arn is emitted via addOptionalCdkContextStringParam
    // (the `<key>="<value>"` string-param sink). It is parse-time validated, so we
    // reach the sink by overwriting the resolved value post-construction to isolate
    // the sink's quoting from the upstream validator.
    const { deploy } = buildDeploy({
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': { modules: { 'test-module': { module_path: '@test/module', use_bootstrap: false } } },
          },
        },
      },
    });
    const payload = 'arn:aws:iam::123456789012:policy/x$(id)';
    const cdkCmd: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deploy as any).addOptionalCdkContextStringParam(cdkCmd, 'permissions_boundary_arn', payload);
    expect(cdkCmd).toHaveLength(1);
    expect(cdkCmd[0]).toBe(`-c ${shellQuote(`permissions_boundary_arn="${payload}"`)}`);
    // The `$(id)` must be inside the single-quoted token, not bare.
    expect(cdkCmd[0]).not.toMatch(/\$\(id\)"$/);
  });

  it('single-quotes an injection payload in a devops-block value', () => {
    // The top-level `devops` block is classified quote-only: its nested values are
    // not parse-time validated but become the devops module's effectiveModuleConfig
    // and are emitted as a `-c module_config_data=...` param, so the sink must quote
    // them. Drive devops mode and confirm a `$(id)` inside the block lands inert.
    const { deploy, captured } = buildDeploy(
      {
        organization: 'test-org',
        devops: { configsCodeCommitRepo: 'cfg-repo', mdaaCodeCommitRepo: 'repo$(id)' },
        domains: {
          'test-domain': {
            environments: {
              'test-env': { modules: { 'test-module': { module_path: '@test/module', use_bootstrap: false } } },
            },
          },
        },
      },
      { devops: 'true' },
    );
    deploy.deploy();
    const cdkCmd = captured.find(c => c.includes('module_config_data') && c.includes('repo'));
    expect(cdkCmd).toBeDefined();
    // The whole module_config_data blob (carrying repo$(id)) is single-quoted.
    expect(cdkCmd).toContain(
      shellQuote(
        `module_config_data=${JSON.stringify({ configsCodeCommitRepo: 'cfg-repo', mdaaCodeCommitRepo: 'repo$(id)' })}`,
      ),
    );
    // And never in the old bare double-quoted form that let the shell expand it.
    expect(cdkCmd).not.toContain('module_config_data="');
  });

  it('single-quotes an injection payload in an npm install module path', () => {
    // A module_path with a bad `@`-suffix would flow into `npm install ... <pkg>`;
    // drive installPackage directly so the value reaches that sink even in test
    // mode (prepNpmPackage otherwise short-circuits on local packages).
    const { deploy, captured } = buildDeploy(
      {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': { modules: { 'test-module': { module_path: '@test/module', use_bootstrap: false } } },
            },
          },
        },
      },
      { working_dir: '/test/working' },
    );
    const evilPackage = '@evil/pkg$(id)';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deploy as any).installPackage('test/prefix', evilPackage, '@evil/pkg');
    const installCmd = captured.find(c => c.includes('npm install'));
    expect(installCmd).toBeDefined();
    expect(installCmd).toContain(shellQuote(evilPackage));
    expect(installCmd).not.toMatch(/npm install[^']*\$\(id\)/);
  });

  it('single-quotes the --prefix in the npm update branch of installPackage', () => {
    // The update branch (taken when the prefix already exists) feeds --prefix
    // through the same ShellCommand.option() sink as the install branch, but is
    // otherwise not exercised. --prefix derives from working_dir, so a payload
    // there reaches the sink; force existsSync=true to select the update branch.
    const { deploy, captured } = buildDeploy(
      {
        organization: 'test-org',
        domains: {
          'test-domain': {
            environments: {
              'test-env': { modules: { 'test-module': { module_path: '@test/module', use_bootstrap: false } } },
            },
          },
        },
      },
      { working_dir: '/test/wd$(id)' },
    );
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deploy as any).installPackage('test/prefix', '@test/module', '@test/module');
    const updateCmd = captured.find(c => c.includes('npm update'));
    expect(updateCmd).toBeDefined();
    // The prefix (carrying $(id)) opens its single-quoted token immediately after
    // --prefix, so the payload is inside the quotes, never bare.
    expect(updateCmd).toContain("--prefix '/test/wd$(id)");
    expect(updateCmd).not.toMatch(/--prefix [^']*\$\(id\)/);
  });

  it('single-quotes an injection payload in the npm-view version-resolution sink (init-schemas.ts)', () => {
    // resolveVersionConstraint() in init-schemas.ts gates real input through a
    // semver-range regex before it reaches this sink, so a metacharacter-bearing
    // payload never arrives here in practice. This test isolates the sink itself
    // — reproducing the exact ShellCommand construction from resolveVersionConstraint
    // — so its quoting is pinned independently of that upstream validator, per
    // invariant 2 (every sink quotes its input by construction).
    const payload = '1.7.0$(id)';
    const cmd = ShellCommand.for('npm').flags('view').arg(`@aws-mdaa/cli@${payload}`).flags('version').build();
    expect(cmd).toContain(shellQuote(`@aws-mdaa/cli@${payload}`));
    // Never bare: the `$(id)` must sit inside the single-quoted token, not outside it.
    expect(cmd).not.toMatch(/\$\(id\)(?!')/);
  });
});

// The TF `-var region` else-branch emits a *static* `${AWS_DEFAULT_REGION}`
// expansion (no config value is baked in). It is reached only when no config
// region is set. This asserts the emitted token is the fixed literal and carries
// no interpolated value — the branch the source-scanning guard deliberately allows.
describe('Terraform region falls back to a static ${AWS_DEFAULT_REGION} expansion', () => {
  afterEach(() => jest.restoreAllMocks());

  it('emits the literal -var region="${AWS_DEFAULT_REGION}" when no config region is set', () => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    const deploy = new MdaaDeploy({ action: 'plan', testing: 'true', working_dir: '/test/working' }, [], {
      organization: 'test-org',
      // no top-level region → validatedTerraformRegion() returns undefined
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: { 'tf-module': { module_type: 'tf', module_path: '@aws-mdaa/test', mdaa_compliant: true } },
            },
          },
        },
      },
    } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: string[] = (deploy as any).createTerraformPlanApplyCmdArgs({
      domainName: 'test-domain',
      envName: 'test-env',
      moduleName: 'tf-module',
      modulePath: '/fake/tf-module',
      mdaaCompliant: true,
      effectiveModuleConfig: {},
      effectiveContext: {},
    });
    const regionArg = args.find(a => a.includes('AWS_DEFAULT_REGION'));
    // Exactly the static token — a fixed double-quoted shell expansion, no value baked in.
    expect(regionArg).toBe('-var region="${AWS_DEFAULT_REGION}"');
  });
});

// Sanity check that the generated command, when handed to a real /bin/sh, does
// not execute the embedded $(...) — the reviewer's empirical check.
describe('generated command does not execute embedded substitutions under /bin/sh', () => {
  afterEach(() => jest.restoreAllMocks());

  it('a $(...) in module_config_data is not run by the shell', () => {
    jest.spyOn(packageHelper, 'loadLocalPackages').mockReturnValue({});
    const deploy = new MdaaDeploy({ action: 'synth', testing: 'true' }, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                  use_bootstrap: false,
                  module_config_data: { evil: '$(touch /tmp/mdaa-pwned-should-not-exist)' },
                },
              },
            },
          },
        },
      },
    } as never);
    const captured: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(deploy as any, 'execCmd').mockImplementation(((cmd: string) => {
      captured.push(cmd);
    }) as never);
    deploy.deploy();

    const cdkCmd = captured.find(c => c.includes('module_config_data'))!;
    // Extract just the `-c 'module_config_data=...'` token and echo it via /bin/sh.
    // If quoting were broken, the shell would run `touch` and print nothing for
    // the substitution; with correct quoting the literal text is preserved.
    const { execSync } = require('child_process'); // eslint-disable-line @typescript-eslint/no-require-imports
    const token = shellQuote(
      `module_config_data=${JSON.stringify({ evil: '$(touch /tmp/mdaa-pwned-should-not-exist)' })}`,
    );
    expect(cdkCmd).toContain(token);
    const out = execSync(`printf '%s' ${token}`, { encoding: 'utf-8' });
    expect(out).toContain('$(touch /tmp/mdaa-pwned-should-not-exist)');
    expect(fs.existsSync('/tmp/mdaa-pwned-should-not-exist')).toBe(false);
  });
});
