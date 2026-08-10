/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import Ajv, { JSONSchemaType } from 'ajv';
import { Workspace } from '@aws-mdaa/config';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { ShellCommand } from './shell-command';

const workSpaceSchema: JSONSchemaType<Workspace[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      location: { type: 'string' },
    },
    required: ['name', 'location'],
    additionalProperties: true,
  },
};

const ajv = new Ajv();
const validateWorkSpace = ajv.compile(workSpaceSchema);

export function loadLocalPackages() {
  // nosemgrep
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  // Route the repo-root path through ShellCommand so it is quoted at the sink
  // like every other value the CLI interpolates into a shell command.
  const npmQueryCmd = ShellCommand.for('npm').flags('query', '.workspace').option('--prefix', repoRoot).build();
  const workspaceQueryJson = execSync(npmQueryCmd).toString(); // NOSONAR
  const workspaces: Workspace[] = JSON.parse(workspaceQueryJson);
  const valid = validateWorkSpace(workspaces);
  if (!valid) {
    throw new Error(`npm query returned unexpected data: ${validateWorkSpace.errors}`);
  }
  const localPackages = Object.fromEntries(
    workspaces
      .filter(pkgInfo => {
        return pkgInfo['location'].startsWith('packages/apps/');
      })
      .map(pkgInfo => {
        // nosemgrep
        return [`${pkgInfo['name']}`, path.resolve(`${__dirname}/../../../${pkgInfo['location']}`)];
      }),
  );
  /* istanbul ignore next */
  if (Object.entries(localPackages).length > 0) {
    console.log(`Loaded ${Object.entries(localPackages).length} MDAA modules from local codebase.`);
  }
  return localPackages;
}
