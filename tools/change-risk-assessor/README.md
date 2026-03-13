# Change Risk Assessor

Python application that powers the MDAA CI/CD infrastructure change risk assessment pipeline. It detects infrastructure regressions introduced by merge requests by comparing CloudFormation templates synthesized from the current MR code against a known-good baseline from the MDAA GitHub repository's `main` branch. A GenAI service (Bedrock) evaluates the diffs and assigns a risk score; if the score meets or exceeds a configurable threshold, the pipeline blocks the merge.

## Pipeline phases

The pipeline has two phases:

1. **Baseline generation** — run after each GitHub release to produce and upload the "known good" templates to S3.
2. **Risk assessment** — run during every merge request to synthesize, diff, assess, and gate.

---

## Phase 1: Baseline Generation

### What it does

Generates baseline CloudFormation templates from the MDAA GitHub repository's `main` branch and uploads them to S3. The baselines serve as the "known good" reference that MR pipelines compare against.

### How it works

Three repos are involved:

| Repo | Purpose |
|------|---------|
| **MDAA GitHub repository** (`https://github.com/aws/modern-data-architecture-accelerator.git`) | Cloned at `main` to get the commit hash (used as S3 key) and optionally to run synth |
| **Config repo** (e.g. `git@ssh.gitlab.aws.dev:mdaa/mdaa-testing.git`) | Contains `mdaa.yaml` test configurations used for synthesis |
| **Current repo** | Where this tool lives. By default its code is NOT used for synth, but `--use-local-cli` switches to the current repo's `bin/mdaa` instead of the GitHub repository's |

**Flow:**

1. Validate configuration (region is required; bucket name defaults to `mdaa-baseline-{account-id}-{region}`)
2. Create a temp directory for all intermediate artifacts (cleaned up on exit)
3. Ensure the S3 bucket exists (auto-creates with versioning + public access block if missing)
4. Clone the MDAA GitHub repository at `main` — capture the commit hash
5. Clone (or use local path for) the config repo
6. Zip the config repo into a bundle named `{repoName}_{fullCommitHash}.zip`
7. Run `mdaa synth --cdk-out <output-dir>` from the config directory
8. Zip the synthesized templates into `templates.zip`
9. Upload `templates.zip` and `configs.zip` to S3 under `baselines/{commitHash}/{repoName}/{repoHash}/`
10. Upload `metadata.json` to `baselines/{commitHash}/` recording the default config bundle path
11. Verify the upload

### S3 layout produced

```
s3://{BASELINE_BUCKET}/baselines/{githubCommitHash}/
  ├── metadata.json          ({"default_config": "{configRepoName}/{configRepoCommitHash}"})
  └── {configRepoName}/
      └── {configRepoCommitHash}/
          ├── templates.zip    (zipped synthesized CloudFormation templates)
          └── configs.zip      (zipped test configuration files)
```

Templates are zipped before upload to avoid syncing thousands of individual files. The `asset.*` directories (bundled Lambda code, Docker contexts, layer zips) are excluded from `templates.zip` to keep the archive small — only CloudFormation templates, manifests, tree.json, NagReport CSVs, and CDK metadata are included. The `metadata.json` at the commit hash level records the default config bundle path so that downstream consumers can discover which config bundle to use without needing git access to the config repo.

### CLI options

| Flag | Description | Default |
|------|-------------|---------|
| `--region <region>` | AWS region for the S3 bucket | `AWS_REGION` env var (required) |
| `--bucket <name>` | S3 bucket name | `mdaa-baseline-{account-id}-{region}` |
| `--config-repo <path\|url>` | Config repo with `mdaa.yaml` | `git@ssh.gitlab.aws.dev:mdaa/mdaa-testing.git` |
| `--mdaa-repo-url <url>` | MDAA GitHub repository URL | `https://github.com/aws/modern-data-architecture-accelerator.git` |
| `--use-local-cli` | Use current repo's `bin/mdaa` instead of the GitHub repository's | Off (uses GitHub repository) |

### Examples

**Minimal (uses all defaults, requires AWS_REGION to be set):**

```bash
export AWS_REGION=us-east-1
uv run generate-baselines
```

**Explicit region and bucket:**

```bash
uv run generate-baselines --region us-east-1 --bucket my-baseline-bucket
```

**Use the current branch's CLI:**

```bash
uv run generate-baselines --region us-east-1 --use-local-cli
```

**Use a local config directory instead of cloning:**

```bash
uv run generate-baselines --region us-east-1 --use-local-cli \
  --config-repo /path/to/local/mdaa-testing
```

---

## Phase 2: Risk Assessment

Runs during every merge request to synthesize, diff, assess, and gate.

### How it works

1. Validate configuration (region, bucket, threshold, timeout)
2. Look up the GitHub repository's `main` branch commit hash via `git ls-remote`
3. Resolve the config bundle path: use `--config-bundle-path` if set, otherwise download `metadata.json` from `s3://{bucket}/baselines/{commitHash}/` and read the `default_config` field
4. Check if baselines exist at the resolved S3 path (fail if missing)
5. Download and extract `templates.zip` and `configs.zip` from S3
6. Run `mdaa diff --baseline <baselines> --diff-out <output>` from the extracted config directory. `cdk diff` runs synth internally, so there is no separate `mdaa synth` step
7. For each per-module `diff.txt` produced by `mdaa diff`, run GenAI assessment with a per-module timeout
8. Compute the worst-case (max) risk score across all per-module assessments
9. Generate `report.md` with a module score table and details for any modules exceeding the threshold
10. Compare worst-case risk score against threshold — exit 0 (pass) or 1 (fail)

### CLI options

| Flag | Description | Default |
|------|-------------|---------|
| `--region <region>` | AWS region for the S3 bucket | `AWS_REGION` env var (required) |
| `--bucket <name>` | S3 bucket name | `mdaa-baseline-{account-id}-{region}` |
| `--threshold <1-4>` | Risk score that triggers failure | `3` (high) |
| `--diff-output <path>` | Path for diff output and assessment JSON (required) | — |
| `--timeout <seconds>` | Timeout per module for GenAI assessment | `300` |
| `--config-bundle-path <path>` | Override config bundle path (skip metadata.json lookup) | Read from `metadata.json` in S3 |
| `--work-dir <path>` | Directory for intermediate files (persists for debugging) | Temp dir (auto-cleaned) |
| `--domain <name>` | Filter to a specific domain | (none — all domains) |
| `--module <name>` | Filter to a specific module | (none — all modules) |

### Output artifacts

```
diff-output/
  ├── report.md                    (human-readable summary with per-module scores)
  ├── diff_stderr.log              (stderr from mdaa diff, if any)
  └── {org}/{domain}/{env}/{module}/
      ├── diff.txt                 (per-module infrastructure diff)
      ├── assessment.json          (per-module GenAI assessment)
      └── assessment_stderr.log    (per-module GenAI stderr)
```

The `report.md` is the primary artifact for humans. It contains a table of all modules with their risk scores, pass/fail status, and — for any module that exceeded the threshold — the full risk details (identified risks, recommendations) and a pointer to the per-module `assessment.json` for deeper inspection.

### Assessment JSON schema

Each per-module `assessment.json` follows this schema:

```json
{
  "risk_score": 1,
  "summary": "...",
  "identified_risks": [
    {
      "category": "...",
      "description": "...",
      "severity": "...",
      "affected_resources": ["..."]
    }
  ],
  "recommendations": ["..."],
  "assessment_metadata": {
    "timestamp": "2025-01-01T00:00:00Z",
    "model_version": "..."
  }
}
```

Risk scores: 1 (low), 2 (medium), 3 (high), 4 (critical).

### Examples

**Minimal (uses all defaults, requires AWS credentials and region):**

```bash
export AWS_REGION=us-east-1
uv run assess-risk
```

**Override threshold and timeout:**

```bash
uv run assess-risk --threshold 2 --timeout 600
```

**Use a fixed work directory (persists intermediate files for debugging):**

```bash
uv run assess-risk --work-dir /tmp/risk-debug
```

**Override config bundle path (skip metadata.json lookup):**

```bash
uv run assess-risk --config-bundle-path "mdaa-testing/abc123def456"
```

**Filter to a single module for faster iteration:**

```bash
uv run assess-risk --domain mydomain --module mymodule
```

---

## Key design decisions

- **Single `mdaa diff` call**: `cdk diff` runs synth internally, so there's no separate synthesis step.
- **Per-module assessment**: Each module's `diff.txt` is assessed independently, allowing parallel assessment in the future and clear per-module attribution of risks.
- **Worst-case scoring**: The overall risk score is the maximum across all modules. If any single module is high-risk, the pipeline blocks.
- **Fail-closed on assessment failure**: If any module's assessment fails or times out, the pipeline is blocked. This prevents unassessed changes from merging.
- **`report.md` for humans**: A Markdown report with a table of all module scores and detailed breakdowns for modules exceeding the threshold.
- **Zipped uploads**: Both templates and configs are zipped before upload to avoid syncing thousands of individual files.
- **`metadata.json` for config discovery**: Written at the commit hash level so the risk assessment can discover which config bundle to use without needing git access to the config repo.
- **Bucket auto-creation**: If the S3 bucket doesn't exist, the baseline generator creates it with versioning enabled and public access blocked.

---

## Project structure

```
tools/change-risk-assessor/
├── pyproject.toml              # project metadata, dependencies, CLI entry points
├── README.md                   # this file
├── src/
│   └── change_risk_assessor/
│       ├── __init__.py
│       ├── cli.py              # CLI argument parsing (assess-risk, generate-baselines)
│       ├── pipeline.py        # end-to-end assessment orchestration
│       ├── config.py           # config validation, defaults, env var handling
│       ├── s3.py               # S3 utility functions: download, extract, upload, verify, bucket mgmt
│       ├── diff.py             # orchestrate mdaa diff
│       ├── assessment.py       # GenAI/Bedrock integration
│       ├── scoring.py          # risk score computation, threshold evaluation
│       └── report.py           # markdown report generation
└── tests/
    ├── conftest.py             # shared fixtures (moto mocks, sample data)
    ├── test_config.py
    ├── test_s3.py
    ├── test_assessment.py
    ├── test_scoring.py
    └── test_report.py
```

### Module responsibilities

| Module | Responsibility |
|--------|----------------|
| `config.py` | Config validation, defaults, env var / CLI arg resolution |
| `s3.py` | S3 utility functions: upload/download, zip/extract, bucket creation, metadata.json |
| `diff.py` | Orchestrate `mdaa diff` subprocess |
| `assessment.py` | GenAI/Bedrock integration with timeout handling |
| `scoring.py` | Risk score aggregation and threshold evaluation |
| `report.py` | Markdown report generation |
| `cli.py` | Click CLI argument parsing for `assess-risk` and `generate-baselines` |
| `pipeline.py` | End-to-end assessment orchestration (coordinates all other modules) |

---

## Development

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

### Setup

```bash
uv sync --dev
```

### Run tests

```bash
uv run pytest
```

### Run with coverage

```bash
uv run pytest --cov=change_risk_assessor
```

---

## Troubleshooting the GitLab API

When the risk assessment is blocked, the pipeline posts the report as a discussion thread on the merge request via the GitLab Discussions API. If the thread isn't appearing, verify that your token and project access are working with a simple curl:

```bash
curl -L -b ~/.midway/cookie -c ~/.midway/cookie \
  --header "PRIVATE-TOKEN: <token>" \
  --url "https://gitlab.aws.dev/api/v4/projects/mdaa%2Fcaef"
```

A successful response returns the project JSON. Common issues:

- **401 Unauthorized**: token is invalid or expired.
- **404 Not Found**: project path is wrong, or the token doesn't have access to the project.
- **HTML response instead of JSON**: Midway cookie is expired — run `mwinit` and retry.

To test posting a thread locally:

```bash
echo "Test thread body" | uv run python -m change_risk_assessor.gitlab \
  --api-url "https://gitlab.aws.dev/api/v4" \
  --token "<token>" \
  --project-id "mdaa/caef" \
  --mr-iid "<iid>" \
  --cookie ~/.midway/cookie
```

The `--mr-iid` is the number at the end of the merge request URL. For example, if the MR page is `https://gitlab.aws.dev/mdaa/caef/-/merge_requests/42`, the IID is `42`.
