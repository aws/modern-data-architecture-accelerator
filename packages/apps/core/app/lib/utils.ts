import * as fs from 'fs';
import * as yaml from 'yaml';

/**
 * cleans up context string values. This is especially useful for values created from addOptionalCdkContextStringParam
 * @param value
 */
export function cleanContextStringValue(value: string): string {
  return value.replace(/^"/, '').replace(/"$/, '');
}

export function readYamlFile(fileName: string): unknown {
  return yaml.parse(fs.readFileSync(fileName, 'utf8'));
}
