# MDAA CLI

This package provides the MDAA orchestration layer. Specifically, it provides the `mdaa` command line utility and config parser, which can be used to orchestrate the execution and deployment of multiple MDAA-compliant CDK apps. See the top-level README for more details on MDAA.

## Supported Platforms

The MDAA CLI runs on macOS, Linux, and Windows. On POSIX systems, the CLI can be invoked directly via `./bin/mdaa` (bash) or through npm (`npx mdaa`). On Windows, use `npx mdaa` or `node bin/mdaa.js`.

## Usage

```bash
mdaa <action> [options]
```

### Actions

- `init` - Scaffold a new MDAA config project from a starter kit, or enhance an existing config directory with schemas, docs, and AI steering
- `upgrade` - Upgrade `mdaa_version` in `mdaa.yaml` and refresh all `.mdaa/` assets (schemas, docs, steering)
- `synth` - Synthesize CloudFormation templates for all modules
- `diff` - Show differences between current code and deployed stacks (or baseline templates)
- `deploy` - Deploy all modules to AWS
- `destroy` - Destroy all deployed modules
- `list` / `ls` - List modules without deploying

### Common Options

| Option                     | Alias | Description                                               |
| -------------------------- | ----- | --------------------------------------------------------- |
| `--config <path>`          | `-c`  | Path to MDAA config file (default: `./mdaa.yaml`)         |
| `--domain <name>`          | `-d`  | Filter by domain name (comma-separated for multiple)      |
| `--env <name>`             | `-e`  | Filter by environment name (comma-separated for multiple) |
| `--module <name>`          | `-m`  | Filter by module name (comma-separated for multiple)      |
| `--working-dir <path>`     | `-w`  | Override working directory (default: `./.mdaa_working`)   |
| `--role-arn <arn>`         | `-r`  | IAM role ARN to assume for CDK operations                 |
| `--tag <tag>`              | `-t`  | NPM dist-tag for package installation                     |
| `--mdaa-version <version>` | `-u`  | Override MDAA module version                              |
| `--cdk-verbose`            | `-b`  | Increase CDK CLI verbosity                                |
| `--nofail`                 | `-f`  | Continue execution after failures                         |
| `--clear`                  | `-x`  | Clear working directory of installed packages             |
| `--devops`                 | `-p`  | Deploy MDAA DevOps resources and pipelines                |
| `--help`                   | `-h`  | Show help                                                 |
| `--version`                | `-v`  | Show MDAA version                                         |

### Init Options

These options apply to the `init` action, which takes a target directory as its positional argument:

| Option                 | Description                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--starter-kit <name>` | Starter kit to scaffold into a new (empty) directory. Omit to choose interactively.                                                                   |
| `--enhance`            | Add schemas, docs, and AI steering to an existing config directory, skipping the "add to this directory?" confirmation. Does not suppress the per-file overwrite prompt — use `--force` or `--no-prompt` for that. |
| `--no-prompt`          | Never block on input: skips the confirmation and leaves any user-owned file that was modified since generation untouched. For scaffolding, requires `--starter-kit`. |
| `--force` / `-F`       | Overwrite user-owned files (e.g. `CLAUDE.md`, `.github/copilot-instructions.md`) even when they've been modified since generation, without prompting. |

Behavior:

- Target directory is empty or new -> scaffolds the selected starter kit, prompts for `<YOUR_...>` placeholder values (unless `--no-prompt`), then adds versioned schemas/docs under `.mdaa/<version>/` and AI steering files.
- Target directory already exists and is non-empty -> enhances it in place (prompts for confirmation unless `--enhance` or `--no-prompt`). It must be an MDAA config project: without an `mdaa.yaml` the command refuses rather than writing into an unrelated directory. `--starter-kit` cannot scaffold into a non-empty directory, but combined with `--enhance` it labels a project that has no `.mdaa/metadata.json` yet.
- A bare `.git`, `.gitignore`, or `.DS_Store` does not count as occupied, so `git init proj && mdaa init proj --starter-kit minimal` works.

What `init` writes:

- `mdaa_version` pinned in `mdaa.yaml` — ensures deploy uses the same version used to generate schemas
- `.mdaa/<version>/schemas/` and `.mdaa/<version>/docs/` - versioned JSON schemas and module documentation
- `agent_rules/` - canonical config-authoring rule bodies (references rewritten to the versioned asset paths)
- `.kiro/steering/`, `CLAUDE.md` + `.claude/rules/`, `.github/` - tool-specific AI steering wrappers that reference `agent_rules/`
- `yaml-language-server` schema directives injected into config files for editor validation

Committing the generated files (including `.mdaa/`) gives every clone schema validation and
AI context immediately, with no `--enhance` step. Size is the trade-off: `.mdaa/` is roughly
13 MB across ~290 files, and because `upgrade` prunes the old version directory while writing
the new one, each upgrade lands as an ~13 MB delete plus an ~13 MB add in git history.

If that history cost matters more than out-of-the-box validation, gitignore the versioned
assets and have each clone regenerate them:

```gitignore
# Regenerate with: npx @aws-mdaa/cli@<version> init --enhance .
.mdaa/*/
```

Keep `.mdaa/metadata.json` tracked either way — it records the kit name and the generated-file
hashes that let `--enhance`/`upgrade` tell your edits from MDAA's output.

### Upgrade Options

The `upgrade` action bumps the MDAA version and refreshes all project assets. Run it from the project root (where `mdaa.yaml` lives):

```bash
mdaa upgrade [--force] [version]
```

If no version is specified, upgrades to the currently installed CLI version. Schemas and
docs are generated from the installed CLI, so an explicit `[version]` must match it — to
move a project to a different version, install that version and let it upgrade the project:
`npx @aws-mdaa/cli@<version> upgrade`.

| Option           | Description                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--force` / `-F` | Overwrite user-owned files (e.g. `CLAUDE.md`, `.github/copilot-instructions.md`) even when they've been modified since generation, without prompting. |

Like `init`, `upgrade` regenerates MDAA-owned files unconditionally but prompts before
overwriting a user-owned file that has been modified since MDAA generated it. In a
non-interactive shell those files are left untouched.

What `upgrade` does:

1. Updates `mdaa_version` in `mdaa.yaml`
2. Regenerates `.mdaa/<new-version>/` with fresh schemas and docs
3. Rewrites `$schema` directives in config files to reference the new version
4. Prunes old `.mdaa/<old-version>/` directories
5. Refreshes AI steering files

Upgrade workflow:

```bash
# Install the new CLI version and upgrade the project
npx @aws-mdaa/cli@1.8.0 upgrade

# Review schema validation warnings in your editor
# Check CHANGELOG for breaking changes

# Deploy with the new version
npx @aws-mdaa/cli@1.8.0 deploy
```

### Baseline Diff Options

These options enable comparing synthesized templates against stored baseline templates without requiring a deployed AWS environment:

| Option              | Alias | Description                                                                     |
| ------------------- | ----- | ------------------------------------------------------------------------------- |
| `--cdk-out <path>`  | `-k`  | Override CDK output directory (default: `<working-dir>/cdk.out`)                |
| `--baseline <path>` | `-B`  | Compare against baseline templates in this directory instead of deployed stacks |
| `--diff-out <path>` | `-D`  | Write diff output for each module to files in this directory instead of console |

## Baseline Diff Workflow

The baseline diff feature allows you to compare CloudFormation template changes without deploying to AWS. This is useful for:

- Regression testing across releases
- CI/CD pipelines to detect unexpected changes
- Reviewing infrastructure changes before deployment

### Setup Baselines

Generate baseline templates from a known-good version:

```bash
mdaa synth -k ./baselines
```

Commit the `./baselines` directory to version control.

### Compare Against Baselines

On each PR or code change, diff against the stored baselines:

```bash
mdaa diff -B ./baselines -D ./diff-output
```

This will:

1. Synthesize current templates to the default working directory
2. Compare each module's template against the baseline
3. Write diff results to `./diff-output/{org}/{domain}/{env}/{module}/diff.txt`
4. Print a summary to console indicating which modules have changes

### Advanced Usage

Generate new baselines while comparing against existing ones:

```bash
mdaa diff -k ./new-baselines -B ./current-baselines -D ./diff-output
```

This synthesizes to `./new-baselines`, compares against `./current-baselines`, and writes diffs to `./diff-output`.

## Examples

```bash
# Scaffold a new project interactively (choose a starter kit, fill placeholders)
mdaa init ./my-data-platform

# Scaffold a specific starter kit without prompts
mdaa init ./my-data-platform --starter-kit basic_datalake --no-prompt

# Enhance an existing config directory with schemas, docs, and AI steering
mdaa init ./existing-config --enhance

# Upgrade a project to a specific MDAA version (refreshes schemas, docs, steering)
npx @aws-mdaa/cli@1.8.0 upgrade

# Upgrade to the currently installed CLI version
mdaa upgrade

# Deploy all modules
mdaa deploy

# Deploy specific domain and environment
mdaa deploy -d analytics -e prod

# Synthesize templates to custom location
mdaa synth -k ./templates

# Diff against deployed stacks
mdaa diff

# Diff against baseline templates with output to files
mdaa diff -B ./baselines -D ./diff-results

# Deploy with specific MDAA version
mdaa deploy -u 1.4.0
```

## Testing

The CLI's observable contract is the shell command it emits per module: config hierarchy resolution, `{{...}}` reference transformation, and argv encoding all complete before any CloudFormation template exists. Tests therefore pin the command string.

### Command Baselines

`test/cli-commands.diff.test.ts` runs each `sample_configs/sample-config-{usecase}.yaml` through the real CLI in `--testing` mode — which prints every command instead of executing it, so no AWS credentials, CDK, network, Terraform, Checkov, or pip is required — and diffs the result against `test/__snapshots__/cli-commands-{usecase}.baseline.json`.

One config per concern: `hierarchy`, `env-templates`, `refs`, `shell-values`, `orchestration`, `npm-version`, `terraform`. Baselines record current behavior including known defects, each documented in the header of the config that exercises it.

```bash
npm test                                 # verify no drift
npm run test:update-baselines            # regenerate after an intentional change

# Compare a different CLI build against the committed baselines
MDAA_CLI_ENTRYPOINT_OVERRIDE=/path/to/packages/cli/lib/mdaa.js npx jest --testPathPattern=cli-commands
```

Never hand-edit a baseline — change the CLI and regenerate, so the diff is the evidence of the change. A CLI change that alters command format also requires regenerating the starter kit baselines (`UPDATE_BASELINES=true npm run test:starter-kits:all` from the repo root).

Use baselines for behavior emergent from composition — assembled command text, module ordering, merge outcomes. Field validation, parsing, and error handling belong in the unit tests alongside them.

See [TESTING.md](../../TESTING.md#cli) for the full approach.
