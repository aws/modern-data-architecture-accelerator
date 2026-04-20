#!/usr/bin/env node
/**
 * Diffs two CloudFormation template JSON files using the CDK toolkit
 * and prints the diff output to stdout.
 *
 * Usage: node baseline-diff-helper.mjs <old-template.json> <new-template.json>
 *
 * Exit code 0: no differences or diff printed successfully
 * Exit code 1: error
 */

import { Toolkit, DiffMethod, NonInteractiveIoHost } from '@aws-cdk/toolkit-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const [oldFile, newFile] = process.argv.slice(2);

if (!oldFile || !newFile) {
  console.error('Usage: node baseline-diff-helper.mjs <old-template.json> <new-template.json>');
  process.exit(1);
}

// Create a minimal cloud assembly directory with the new template
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdk-diff-'));
const stackName = 'DiffStack';
const templateFileName = `${stackName}.template.json`;

// Copy new template into the assembly
fs.copyFileSync(newFile, path.join(tmpDir, templateFileName));

// Write minimal manifest
const manifest = {
  version: '36.0.0',
  artifacts: {
    [stackName]: {
      type: 'aws:cloudformation:stack',
      environment: 'aws://unknown-account/unknown-region',
      properties: {
        templateFile: templateFileName,
      },
    },
  },
};
fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest));

// Capture IO host output
const lines = [];
const ioHost = new NonInteractiveIoHost({ isCI: true });
ioHost.notify = async msg => {
  if (msg.message) {
    lines.push(msg.message);
  }
};

const toolkit = new Toolkit({ ioHost });
const source = await toolkit.fromAssemblyDirectory(tmpDir);

await toolkit.diff(source, {
  method: DiffMethod.LocalFile(oldFile),
  stacks: { strategy: 'all-stacks', patterns: [] },
});

// Print captured diff output
console.log(lines.join('\n'));

// Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });
