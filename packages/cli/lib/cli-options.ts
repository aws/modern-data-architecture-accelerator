/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const commandLineArgs = require('command-line-args');

/**
 * Actions handled by `MdaaDeploy`. An allowlist rather than a fallthrough, so an
 * unknown verb is reported by the caller instead of being passed to cdk as if it were one.
 */
export const DEPLOY_ACTIONS = new Set(['synth', 'diff', 'deploy', 'destroy', 'list', 'ls']);

/** Actions handled by the scaffolding path, and the only ones that accept {@link INIT_OPTION_DEFINITIONS}. */
export const INIT_ACTIONS = new Set(['init', 'upgrade']);

/** One `command-line-args` option definition. */
export interface OptionDefinition {
  readonly name: string;
  readonly alias?: string;
  readonly type: typeof String | typeof Boolean;
  /** Receives the first bare argument. Set on `action` alone. */
  readonly defaultOption?: boolean;
  readonly defaultValue?: string;
  readonly description: string;
}

/**
 * Options every action accepts.
 *
 * A deploy action forwards each argv token these definitions do not claim to `cdk`, so this
 * list doubles as the boundary of what MDAA consumes: adding an option here takes that
 * spelling away from cdk for every action.
 */
export const BASE_OPTION_DEFINITIONS: readonly OptionDefinition[] = [
  {
    name: 'config',
    alias: 'c',
    type: String,
    defaultValue: './mdaa.yaml',
    description: 'Optional - The path to the MDAA config file.',
  },
  {
    name: 'action',
    alias: 'a',
    type: String,
    defaultOption: true,
    description: "Required - One of 'init','upgrade','synth','diff','deploy','destroy','list','ls'.",
  },
  {
    name: 'domain',
    alias: 'd',
    type: String,
    description:
      'Optional - If specified, only matching domains (by name) will be processed. Multiple values can be specified as comma separated.',
  },
  {
    name: 'env',
    alias: 'e',
    type: String,
    description:
      'Optional - If specified, only matching envs (by name) will be processed. Multiple values can be specified as comma separated.',
  },
  {
    name: 'module',
    alias: 'm',
    type: String,
    description:
      'Optional - If specified, only matching modules (by name) will be processed. Multiple values can be specified as comma separated.',
  },
  {
    name: 'tag',
    alias: 't',
    type: String,
    description: 'Optional - If specified, value will be passed to NPM as a dist-tag during package installation.',
  },
  {
    name: 'role-arn',
    alias: 'r',
    type: String,
    description: 'Optional - If specified, will be passed to the -r (--roleArn) parameter of the CDK command.',
  },
  {
    name: 'role_arn',
    type: String,
    description: 'Optional - Backwards compatible alias for --role-arn',
  },
  {
    name: 'working-dir',
    alias: 'w',
    type: String,
    description: 'Optional - Override the working dir location (default ./mdaa_working)',
  },
  {
    name: 'working_dir',
    type: String,
    description: 'Optional - Backwards compatible alias for --working_dir',
  },
  {
    name: 'clear',
    alias: 'x',
    type: Boolean,
    description: 'Optional - Clears working directory of all installed packages.',
  },
  {
    name: 'mdaa-version',
    alias: 'u',
    type: String,
    description: 'Optional - Specify the MDAA module version to be used.',
  },
  {
    name: 'mdaa_version',
    type: String,
    description: 'Optional - Backwards compatible alias for --mdaa-version',
  },
  {
    name: 'version',
    alias: 'v',
    type: Boolean,
    description: 'Provides information about the installed MDAA version',
  },
  {
    name: 'npm-debug',
    alias: 'n',
    type: Boolean,
    description: 'Optional - Runs all NPM commands in debug mode',
  },
  {
    name: 'npm_debug',
    type: Boolean,
    description: 'Optional - Backwards compatible alias for --npm-debug.',
  },
  {
    name: 'local-mode',
    alias: 'l',
    type: Boolean,
    description: 'MDAA code will be executed from local source code instead of from installed NPM packages',
  },
  {
    name: 'local_mode',
    type: Boolean,
    description: 'Optional - Backwards compatible alias for --local-mode.',
  },
  {
    name: 'devops',
    alias: 'p',
    type: Boolean,
    description: 'Deploys MDAA DevOps Resources and Pipelines.',
  },
  {
    name: 'cdk-verbose',
    alias: 'b',
    type: Boolean,
    description: 'Increase CDK cli verbosity',
  },
  {
    name: 'cdk_verbose',
    type: Boolean,
    description: 'Optional - Backwards compatible alias for --cdk-verbose.',
  },
  {
    name: 'nofail',
    alias: 'f',
    type: Boolean,
    description: 'Continue execution after failure',
  },
  {
    name: 'cdk-out',
    alias: 'k',
    type: String,
    description: 'Optional - Override the CDK output directory (default uses working-dir/cdk.out)',
  },
  {
    name: 'baseline',
    alias: 'B',
    type: String,
    description:
      'Optional - For diff action, compare against baseline templates in this directory instead of deployed stacks',
  },
  {
    name: 'diff-out',
    alias: 'D',
    type: String,
    description:
      'Optional - For diff action, write diff output for each module to files in this directory instead of console',
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Prints this help.',
  },
  {
    name: 'testing',
    type: Boolean,
    description: 'Testing mode - prints CDK commands without executing them.',
  },
];

/**
 * Options only `init` and `upgrade` accept.
 *
 * Withheld from the other actions on purpose: a deploy action pushes down whatever MDAA does
 * not recognise, so defining an option for every action silently reclaims that spelling from
 * cdk. `--force` defined globally is what stopped `mdaa destroy --force` suppressing cdk's
 * per-stack confirmation - the flag parsed, only the init and upgrade branches read it, and
 * it never reached cdk. `--overwrite` also keeps one meaning per spelling: `--force` belongs
 * to cdk, and it is what the flag does here.
 */
export const INIT_OPTION_DEFINITIONS: readonly OptionDefinition[] = [
  {
    name: 'starter-kit',
    type: String,
    description: 'Optional - Starter kit name for init action.',
  },
  {
    name: 'enhance',
    type: Boolean,
    description: 'Optional - Enhance an existing config directory without prompting (init action).',
  },
  {
    name: 'no-prompt',
    type: Boolean,
    description: 'Optional - Skip interactive prompts (init action, requires --starter-kit).',
  },
  {
    name: 'overwrite',
    type: Boolean,
    description: 'Optional - Overwrite user-owned files without prompting (init/upgrade action).',
  },
];

/** Every option MDAA defines, for the general `mdaa --help` table. */
export const ALL_OPTION_DEFINITIONS: readonly OptionDefinition[] = [
  ...BASE_OPTION_DEFINITIONS,
  ...INIT_OPTION_DEFINITIONS,
];

/**
 * The leftover tokens that were meant as options rather than values.
 *
 * A leading `-` alone does not make a token an option: `command-line-args` classifies `-1.7.0`
 * as a value, so treating everything dash-prefixed as one turns `mdaa upgrade -1.7.0` into
 * "Unknown option" instead of letting the version validator name the real problem. An option is
 * `--<something>`, or a single dash followed by a letter.
 */
export function flagLikeTokens(tokens: readonly string[]): string[] {
  return tokens.filter(token => token.startsWith('--') || /^-[a-zA-Z]/.test(token));
}

/**
 * Parse argv against the definitions the invoked action accepts, leaving everything else in
 * `_unknown` for the caller to push down to cdk or reject.
 *
 * Two passes, because the definition list depends on the action and the action is itself a
 * parse result.
 *
 * Pass 1 uses every definition, so no MDAA-defined value-taking option can have its value
 * mistaken for the positional action, on either side of it (`--config ./mdaa.yaml destroy`,
 * `--starter-kit minimal init ./proj`). Its action is therefore the authoritative one.
 *
 * Pass 2 re-parses without the init-only definitions, so an init-only option handed to a deploy
 * action reaches cdk instead of being swallowed. That pass does not define `--starter-kit`,
 * so a value following it falls into the `defaultOption` slot and becomes pass 2's action -
 * which is why the two are reconciled rather than pass 2 being trusted outright. Returning
 * pass 2's action would dispatch `--starter-kit destroy deploy` to destroy.
 *
 * The guarantee covers MDAA-defined options only. A value-taking flag bound for cdk is defined
 * in neither pass, so its value is still claimed as the action: `mdaa --profile myprofile
 * destroy` resolves to `myprofile`. Write a pushed-down flag after the action, or as
 * `--flag=value`.
 *
 * @param argv argv to parse, defaulting to the process arguments. Tests pass an explicit line.
 */
export function parseCliOptions(argv: string[] = process.argv.slice(2)) {
  const parseWith = (definitions: readonly OptionDefinition[]) => commandLineArgs(definitions, { partial: true, argv });
  const actionPass = parseWith(ALL_OPTION_DEFINITIONS);
  const action: string | undefined = actionPass['action'];
  if (action !== undefined && INIT_ACTIONS.has(action)) {
    return actionPass;
  }

  let basePass;
  try {
    basePass = parseWith(BASE_OPTION_DEFINITIONS);
  } catch {
    // Pass 1 parsed this argv with a superset of these definitions, so any throw here is an
    // artifact of the reduced list: a value that followed an init-only option becomes a bare
    // token, which `--action` having already claimed the slot turns into ALREADY_SET
    // (`--starter-kit minimal --action deploy`). Pass 1's result stands; the only cost is that
    // the init-only options are consumed rather than forwarded for that one invocation.
    return actionPass;
  }
  if (basePass['action'] === action) {
    return basePass;
  }

  // Pass 2 read some other token as the action. Take pass 1's, and drop that token from the
  // pushdown - left in, cdk would receive the action verb as a stack name.
  const unknown: string[] = basePass['_unknown'] ?? [];
  const actionIndex = action === undefined ? -1 : unknown.indexOf(action);
  return {
    ...basePass,
    action,
    _unknown: actionIndex >= 0 ? unknown.filter((_, index) => index !== actionIndex) : unknown,
  };
}
