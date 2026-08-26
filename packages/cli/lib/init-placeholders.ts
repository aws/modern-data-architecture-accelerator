/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import { findFiles } from './init-fs';

/** Yaml comment prefix indicating a task for the user (used in placeholder detection and cleanup) */
export const YAML_TASK_PREFIX = '# TODO:'; // NOSONAR

/** Find all yaml files recursively, skipping node_modules and bundled schemas */
export function findYamlFiles(dir: string): string[] {
  return findFiles(dir, name => name.endsWith('.yaml') || name.endsWith('.yml'));
}

/** Scan a single file for <YOUR_...> placeholders and add them to the map */
export function scanFileForPlaceholders(file: string, found: Map<string, string>): void {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(/<YOUR_[A-Z0-9_]+>/g);
    if (!matches) continue;
    for (const placeholder of matches) {
      if (found.has(placeholder)) continue;
      const description =
        i > 0 && lines[i - 1].trim().startsWith(YAML_TASK_PREFIX) ? lines[i - 1].trim().replace(/^# TODO:\s*/, '') : '';
      found.set(placeholder, description);
    }
  }
}

/** Discover all <YOUR_...> placeholders with their descriptions from preceding comments */
export function discoverPlaceholders(outputDir: string): Array<{ placeholder: string; description: string }> {
  const found = new Map<string, string>();
  const yamlFiles = findYamlFiles(outputDir);

  for (const file of yamlFiles) {
    scanFileForPlaceholders(file, found);
  }

  return Array.from(found.entries())
    .map(([placeholder, description]) => ({ placeholder, description }))
    .sort((a, b) => a.placeholder.localeCompare(b.placeholder));
}

/** Apply placeholder replacements to a single file */
export function applyReplacementsToFile(file: string, replacements: Record<string, string>): void {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  const newLines: string[] = [];
  for (const line of lines) {
    let processed = line;
    for (const [placeholder, value] of Object.entries(replacements)) {
      if (processed.includes(placeholder)) {
        processed = processed.split(placeholder).join(value);
        const prev = newLines.at(-1);
        if (prev?.trimStart().startsWith('# ')) {
          // Remove the task marker prefix from the comment above, keeping the description
          newLines[newLines.length - 1] = prev.replace(YAML_TASK_PREFIX, '#');
        }
      }
    }
    newLines.push(processed);
  }
  fs.writeFileSync(file, newLines.join('\n'));
}

/** Apply placeholder replacements to all yaml files in the output directory */
export function applyReplacements(outputDir: string, replacements: Record<string, string>): void {
  if (Object.keys(replacements).length === 0) return;
  const yamlFiles = findYamlFiles(outputDir);
  for (const file of yamlFiles) {
    applyReplacementsToFile(file, replacements);
  }
}
