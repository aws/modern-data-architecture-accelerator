# MDAA CLI

This package provides the MDAA orchestration layer. Specifically, it provides the `mdaa` command line utility and config parser, which can be used to orchestrate the execution and deployment of multiple MDAA-compliant CDK apps. See the top-level README for more details on MDAA.

## Supported Platforms

The MDAA CLI runs on macOS, Linux, and Windows. On POSIX systems, the CLI can be invoked directly via `./bin/mdaa` (bash) or through npm (`npx mdaa`). On Windows, use `npx mdaa` or `node bin/mdaa.js`.

## Usage

```bash
mdaa <action> [options]
```

### Actions

- `synth` - Synthesize CloudFormation templates for all modules
- `diff` - Show differences between current code and deployed stacks (or baseline templates)
- `deploy` - Deploy all modules to AWS
- `destroy` - Destroy all deployed modules
- `list` / `ls` - List modules without deploying

### Common Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--config <path>` | `-c` | Path to MDAA config file (default: `./mdaa.yaml`) |
| `--domain <name>` | `-d` | Filter by domain name (comma-separated for multiple) |
| `--env <name>` | `-e` | Filter by environment name (comma-separated for multiple) |
| `--module <name>` | `-m` | Filter by module name (comma-separated for multiple) |
| `--working-dir <path>` | `-w` | Override working directory (default: `./.mdaa_working`) |
| `--role-arn <arn>` | `-r` | IAM role ARN to assume for CDK operations |
| `--tag <tag>` | `-t` | NPM dist-tag for package installation |
| `--mdaa-version <version>` | `-u` | Override MDAA module version |
| `--cdk-verbose` | `-b` | Increase CDK CLI verbosity |
| `--nofail` | `-f` | Continue execution after failures |
| `--clear` | `-x` | Clear working directory of installed packages |
| `--devops` | `-p` | Deploy MDAA DevOps resources and pipelines |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show MDAA version |

### Baseline Diff Options

These options enable comparing synthesized templates against stored baseline templates without requiring a deployed AWS environment:

| Option | Alias | Description |
|--------|-------|-------------|
| `--cdk-out <path>` | `-k` | Override CDK output directory (default: `<working-dir>/cdk.out`) |
| `--baseline <path>` | `-B` | Compare against baseline templates in this directory instead of deployed stacks |
| `--diff-out <path>` | `-D` | Write diff output for each module to files in this directory instead of console |

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
