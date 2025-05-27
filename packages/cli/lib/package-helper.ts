import Ajv, { JSONSchemaType } from 'ajv';
import { Workspace } from '@aws-mdaa/config';
import * as path from 'node:path';
import { execSync } from 'child_process';

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
  const workspaceQueryJson = execSync(`npm query .workspace --prefix '${__dirname}/../../../'`).toString();
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
