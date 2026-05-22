---
inclusion: manual
---

# Module and Construct Creation - Steering Guide

Create new MDAA app modules and constructs following the working-backwards approach. This steering file generates proper skeleton packages with all required configuration, test scaffolding, and documentation.

#[[file:CONTRIBUTING.md]]
#[[file:TESTING.md]]

## Design Approach

Follow the "Developing Modules" section in CONTRIBUTING.md. Always work backwards:

1. Define the user's configuration experience first
2. Design sample configs (minimal + comprehensive)
3. Then implement constructs to fulfill that configuration
4. Prefer reusing existing L2/L3 constructs over creating new ones

## Creating a New App Module

### Inputs Required

Before starting, gather:
- **Module name**: e.g., `my-service` (used in package name `@aws-mdaa/my-service`)
- **Category**: one of `ai`, `analytics`, `core`, `datalake`, `dataops`, `governance`, `utility`
- **What it deploys**: which AWS resources and what user problem it solves
- **Config properties**: what the user needs to control

### Directory Structure

```
packages/apps/{category}/{module}-app/
├── bin/
│   └── {module}.ts              # CDK app entry point
├── lib/
│   ├── {module}.ts              # App class
│   ├── {module}-config.ts       # Config interface
│   └── index.ts                 # Exports
├── sample_configs/
│   ├── sample-config-minimal.yaml
│   └── sample-config-comprehensive.yaml
├── test/
│   ├── {module}.diff.test.ts    # Diff baseline tests
│   ├── {module}.snapshot.test.ts # Snapshot tests
│   ├── {module}.synth.test.ts   # Synth tests
│   └── __snapshots__/           # Baseline JSON files (generated)
├── .npmignore
├── cdk.json
├── jest.config.js
├── package.json
├── README.md
└── tsconfig.json
```

### Skeleton Files

#### package.json

```json
{
  "name": "@aws-mdaa/{module}",
  "description": "MDAA {Module Display Name} module",
  "version": "1.6.0",
  "license": "Apache-2.0",
  "author": {
    "name": "Amazon Web Services",
    "url": "https://aws.amazon.com/solutions"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/aws/modern-data-architecture-accelerator"
  },
  "bin": {
    "{module}-cdk": "bin/{module}.js"
  },
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "scripts": {
    "build": "tsc && typescript-json-schema --required --noExtraProps tsconfig.json {ConfigInterface} --include 'lib/*.ts' --include '../../../../node_modules/@types/**/*.ts' --include 'lib/config-schema.json' > lib/config-schema.json && cp lib/config-schema.json ../../../../schemas/${npm_package_name}.json",
    "watch": "tsc -w",
    "test": "jest --passWithNoTests --coverage",
    "cdk": "cdk",
    "lint": "eslint --max-warnings 0 -c ../../../../eslint.config.mjs",
    "test:update-baselines": "UPDATE_BASELINES=true jest --passWithNoTests --testPathPattern='.*\\.diff\\.test\\.ts'"
  },
  "dependencies": {
    "@aws-mdaa/app": "1.6.0",
    "@aws-mdaa/config": "1.6.0",
    "@aws-mdaa/iam-role-helper": "1.6.0",
    "@aws-mdaa/l3-construct": "1.6.0",
    "@aws-mdaa/naming": "1.6.0",
    "ajv": "8.18.0",
    "aws-cdk-lib": "2.220.0",
    "cdk-nag": "2.37.55",
    "constructs": "10.0.96",
    "source-map-support": "0.5.21",
    "yaml": "1.10.2"
  },
  "devDependencies": {
    "@aws-mdaa/testing": "1.6.0",
    "@types/jest": "29.5.14",
    "@types/node": "22.9.0",
    "@types/prettier": "2.6.0",
    "jest": "29.7.0",
    "ts-jest": "29.4.9",
    "ts-node": "10.9.2",
    "typescript": "5.9.3",
    "typescript-json-schema": "0.67.1"
  }
}
```

**Note:** Add the L3 construct dependency once it exists. Match version numbers to the current repo version in the root `package.json`.

#### cdk.json

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/{module}.ts",
  "context": {
    "aws-cdk:enableDiffNoFail": true,
    "@aws-cdk/core:enablePartitionLiterals": true
  }
}
```

#### jest.config.js

```javascript
const baseConfig = require("../../jest.config");

module.exports = {
  ...baseConfig,
};
```

#### tsconfig.json

Use the standard app tsconfig — copy from an existing app module in the same category and update the `include` paths. Must include `"lib/config-schema.json"` in the `include` array.

#### .npmignore

```
*.ts
*.tsbuildinfo
.eslintrc.js
tsconfig.json
typedoc.json
coverage
test/
*.tgz
dist
!*.js
!*.d.ts
jest.config.js
```

### Implementation Order

1. **Config interface** (`lib/{module}-config.ts`) — define all user-facing properties with JSDoc
2. **Sample configs** — write minimal and comprehensive YAML configs
3. **App class** (`lib/{module}.ts`) — translate config into L3 construct props
4. **Entry point** (`bin/{module}.ts`) — standard CDK app bootstrap
5. **Index** (`lib/index.ts`) — export the app class and config interface
6. **Tests** — diff, snapshot, and synth tests for each sample config
7. **README** — following Module Documentation Standards
8. **Build and validate** — `npm run build && npm run test`

### Class Skeletons

#### bin/{module}.ts — Entry Point

```typescript
#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { {ModuleName}App } from '../lib/{module}';
new {ModuleName}App().generateStack();
```

#### lib/{module}-config.ts — Config Interface and Parser

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface {ModuleName}ConfigContents extends MdaaBaseConfigContents {
  // Define user-facing config properties here with JSDoc.
  // Every property should be readonly. Optional properties use ?.
  // See code-documentation steering file for JSDoc template.
}

export class {ModuleName}ConfigParser extends MdaaAppConfigParser<{ModuleName}ConfigContents> {
  // Expose parsed config values as public readonly properties.
  // Apply defaults and transform config values in the constructor.

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    // Parse and expose config properties:
    // this.someProperty = this.configContents.someProperty ?? 'default';
  }
}
```

#### lib/{module}.ts — App Class

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { {ModuleName}L3Construct, {ModuleName}L3ConstructProps } from '@aws-mdaa/{module}-l3-construct';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { {ModuleName}ConfigParser } from './{module}-config';

export class {ModuleName}App extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new {ModuleName}ConfigParser(stack, parserProps);

    const constructProps: {ModuleName}L3ConstructProps = {
      // Map parsed config values to L3 construct props.
      // Spread l3ConstructProps to include naming, roleHelper, etc.
      ...l3ConstructProps,
    };

    new {ModuleName}L3Construct(stack, '{module}', constructProps);
    return [stack];
  }
}
```

**Note:** App modules do not have an `index.ts` — the entry point is `bin/{module}.ts` and the app class is imported directly in tests.

## Creating a New L3 Construct

### Directory Structure

```
packages/constructs/L3/{category}/{module}-l3-construct/
├── docs/
│   └── {ModuleName}.png         # Architecture diagram
├── lib/
│   ├── {module}-construct.ts    # Main construct
│   └── index.ts                 # Exports
├── test/
│   ├── {module}.compliance.test.ts
│   └── {module}.test.ts
├── .npmignore
├── jest.config.js
├── package.json
├── README.md
├── tsconfig.json
└── typedoc.json
```

### Key Differences from Apps

- Built with JSII (`jsii --project-references`) for multi-language support
- Props interface extends `MdaaL3ConstructProps`
- No sample configs, no diff baselines — tested with CDK Assertions
- `package.json` has `jsii` configuration section and `peerDependencies`

### Class Skeletons

#### lib/{module}-construct.ts — L3 Construct

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';

/** Props for the {ModuleName} L3 construct. */
export interface {ModuleName}L3ConstructProps extends MdaaL3ConstructProps {
  // Add module-specific props here.
  // These are populated by the app class from the parsed config.
}

/**
 * Deploys {description of what AWS resources this creates}.
 * {Description of compliance controls enforced.}
 */
export class {ModuleName}L3Construct extends MdaaL3Construct {
  protected readonly props: {ModuleName}L3ConstructProps;

  constructor(scope: Construct, id: string, props: {ModuleName}L3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Compose L2 constructs and CDK resources here.
    // Use this.props.naming for MDAA naming conventions.
    // Use this.props.roleHelper for IAM role resolution.
    // Use this.account and this.region for account/region context.
  }
}
```

#### lib/index.ts — Exports

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './{module}-construct';
```

### package.json (L3)

```json
{
  "name": "@aws-mdaa/{module}-l3-construct",
  "version": "1.6.0",
  "description": "MDAA {Module Display Name} L3 Construct",
  "license": "Apache-2.0",
  "scripts": {
    "build": "export JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 && jsii --project-references",
    "watch": "jsii -w --project-references",
    "package": "jsii-pacmak --npmignore=false",
    "test": "jest --passWithNoTests --coverage",
    "lint": "eslint --max-warnings 0 -c ../../../../../eslint.config.mjs"
  },
  "stability": "experimental",
  "jsii": {
    "outdir": "jsii-dist",
    "versionFormat": "full",
    "targets": {}
  }
}
```

**Note:** Adjust the eslint config path based on directory depth. L3 constructs are 5 levels deep from root.

## Creating a New L2 Construct

### Directory Structure

```
packages/constructs/L2/{resource}-constructs/
├── lib/
│   ├── {resource}.ts            # Main construct
│   └── index.ts                 # Exports
├── test/
│   ├── {resource}.compliance.test.ts
│   └── {resource}.test.ts
├── .npmignore
├── jest.config.js
├── package.json
├── README.md
├── tsconfig.json
└── typedoc.json
```

### Key Differences from L3

- Props interface extends `MdaaConstructProps`
- Must be generic and reusable across modules
- Enforces compliance defaults (encryption, access controls, logging)
- L2 constructs are 4 levels deep — eslint path is `../../../../eslint.config.mjs`

### Class Skeletons

#### lib/{resource}.ts — L2 Construct

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mdaa_construct from '@aws-mdaa/construct';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { Construct } from 'constructs';

export interface Mdaa{ResourceName}Props extends mdaa_construct.MdaaConstructProps {
  // Add resource-specific props here.
  // These should be generic enough for reuse across modules.
}

/**
 * Deploys a compliant {ResourceName} with {compliance controls}.
 * Enforces {specific defaults like encryption, access blocking, etc.}.
 */
export class Mdaa{ResourceName} extends Construct {
  constructor(scope: Construct, id: string, props: Mdaa{ResourceName}Props) {
    super(scope, id);

    // Create the AWS resource with compliance defaults.
    // Use props.naming for MDAA naming conventions.
    // Publish identifiers via MdaaParamAndOutput.
  }
}
```

#### lib/index.ts — Exports

```typescript
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './{resource}';
```

## Post-Creation Checklist

After creating any new package:

1. **Add to workspace** — verify the package path matches a glob in root `package.json` `workspaces`
2. **Install dependencies** — run `npm install` from the repo root
3. **Build** — `npx lerna run build` (or `npm run build` in the package)
4. **Lint** — `npm run lint`
5. **Test** — `npm run test`
6. **Generate baselines** (apps only) — `npm run test:update-baselines`
7. **Commit baselines** — add `test/__snapshots__/*.baseline.json` to git
8. **Verify CI** — ensure the package is picked up by Nx affected detection

## Anti-Patterns

### Creating an app without an L3 construct

App modules should not contain significant construct logic. If the app class is doing more than translating config into props, the logic belongs in an L3 construct.

### Hardcoding construct IDs that include config values

Construct IDs must be stable across config changes. Don't use user-provided values (bucket names, role names) as construct IDs — use descriptive static strings.

### Skipping the config interface

Every app module needs a typed config interface, even for simple modules. The interface drives schema generation, sample config validation, and documentation.

### Creating an L2 construct that's only used by one module

L2 constructs should be reusable. If the construct is specific to one module's architecture, it belongs in the L3 construct instead.
