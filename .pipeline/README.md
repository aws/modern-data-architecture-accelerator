# Pipeline Base Image

This directory contains the Dockerfile for the CI/CD base image used across all pipeline jobs.

## Overview

The base image is built from `public.ecr.aws/docker/library/node:20` and includes all the tools and dependencies required to build, test, package, and publish the MDAA project.

## Installed Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22.x | JavaScript runtime (base image) |
| npm | 10.x | Package manager |
| AWS CDK | 2.x | Infrastructure as Code |
| Lerna | 8.x | Monorepo management |
| JSII / jsii-pacmak | latest | Multi-language CDK construct publishing |
| Python 3 | system | Python runtime and testing |
| UV / UVX | latest | Fast Python package management |
| AWS CLI v2 | latest | AWS service interactions |
| Maven | system | Java build tool |
| Terraform | latest | Infrastructure provisioning |
| SonarQube Scanner | 5.0.1 | Code quality analysis |
| git-secrets | latest | Prevents committing secrets |
| MkDocs + plugins | latest | Documentation generation |
| Twine | latest | Python package publishing |

## How It's Used in CI

### Image Building

The `base_image` stage runs first in every pipeline and builds the Docker image using [Kaniko](https://github.com/chainguard-forks/kaniko):

```yaml
base_image:
  stage: base_image
  image: ${MDAA_BASE_IMAGE}
  script:
    - /kaniko/executor
      --dockerfile "${CI_PROJECT_DIR}/.pipeline/Dockerfile"
      --destination "${CI_REGISTRY_IMAGE}:base-latest"
      --destination "${CI_REGISTRY_IMAGE}:base-${CI_COMMIT_SHA:0:8}"
```

The image is tagged with:
- `base-latest` - Always points to the most recent build
- `base-<commit-sha>` - Commit-specific tag for traceability

### Image Consumption

All subsequent pipeline jobs use this image via the global `image` directive:

```yaml
image: ${CI_REGISTRY_IMAGE}:base-latest
```

This ensures consistent tooling across all stages: prebuild, build, test, analyze, package, and publish.

## Caching

Kaniko layer caching is enabled to speed up rebuilds:
- Cache repo: `${CI_REGISTRY_IMAGE}/cache`
- Cache TTL: 72 hours

Only changed layers are rebuilt, making subsequent pipeline runs faster.

## Updating the Image

To update the base image:

1. Modify the `Dockerfile` in this directory
2. Commit and push your changes
3. The `base_image` stage will automatically rebuild the image
4. All jobs in the same pipeline will use the updated image
