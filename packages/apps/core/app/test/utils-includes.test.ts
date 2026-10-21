/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { readYamlFileWithIncludes } from '../lib/utils';

describe('readYamlFileWithIncludes', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdaa-yaml-includes-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('inlines a referenced file as a raw string with !include', () => {
    fs.writeFileSync(path.join(tmpDir, 'query.sql'), 'SELECT 1');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'query: !include ./query.sql\n');

    const result = readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml')) as { query: string };

    expect(result.query).toBe('SELECT 1');
  });

  it('splices a referenced file in as a parsed structure with !includeYaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'forms.yaml'), 'SimpleForm:\n  fields:\n    note:\n      type: String\n');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'metadataForms: !includeYaml ./forms.yaml\n');

    const result = readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml')) as {
      metadataForms: { SimpleForm: { fields: { note: { type: string } } } };
    };

    expect(result.metadataForms).toEqual({ SimpleForm: { fields: { note: { type: 'String' } } } });
  });

  it('resolves nested !include tags relative to the included file, not the root file', () => {
    fs.mkdirSync(path.join(tmpDir, 'nested'));
    fs.writeFileSync(path.join(tmpDir, 'nested', 'query.sql'), 'SELECT 2');
    fs.writeFileSync(path.join(tmpDir, 'nested', 'forms.yaml'), 'query: !include ./query.sql\n');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'config: !includeYaml ./nested/forms.yaml\n');

    const result = readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml')) as { config: { query: string } };

    expect(result.config.query).toBe('SELECT 2');
  });

  it('inlines a referenced file as a raw string with !include given a quoted scalar path', () => {
    fs.writeFileSync(path.join(tmpDir, 'query.sql'), 'SELECT 3');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'query: !include "./query.sql"\n');

    const result = readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml')) as { query: string };

    expect(result.query).toBe('SELECT 3');
  });

  it('resolves a nested !includeYaml within an !includeYaml file', () => {
    fs.mkdirSync(path.join(tmpDir, 'nested'));
    fs.writeFileSync(path.join(tmpDir, 'nested', 'inner-form.yaml'), 'fields:\n  note:\n    type: String\n');
    fs.writeFileSync(path.join(tmpDir, 'nested', 'forms.yaml'), 'SimpleForm: !includeYaml ./inner-form.yaml\n');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'metadataForms: !includeYaml ./nested/forms.yaml\n');

    const result = readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml')) as {
      metadataForms: { SimpleForm: { fields: { note: { type: string } } } };
    };

    expect(result.metadataForms).toEqual({ SimpleForm: { fields: { note: { type: 'String' } } } });
  });

  it('resolves a plain relative path value inside an !includeYaml file against that file, not the root', () => {
    fs.mkdirSync(path.join(tmpDir, 'nested'));
    fs.writeFileSync(path.join(tmpDir, 'nested', 'forms.yaml'), 'seedCodePath: ./code.zip\n');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'config: !includeYaml ./nested/forms.yaml\n');

    const result = readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml')) as { config: { seedCodePath: string } };

    expect(result.config.seedCodePath).toBe(path.join(tmpDir, 'nested', 'code.zip'));
  });

  it('throws naming the missing file when !includeYaml references a file that does not exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'config: !includeYaml ./missing.yaml\n');

    expect(() => readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml'))).toThrow(/missing\.yaml/);
  });

  it('throws when !includeYaml has no path', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'config: !includeYaml\n');

    expect(() => readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml'))).toThrow(/requires a file path/);
  });

  it('throws when !includeYaml is given a mapping instead of a scalar path', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'config: !includeYaml {a: 1}\n');

    expect(() => readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml'))).toThrow(/requires a file path/);
  });

  it('throws naming the chain when a file includes itself via !includeYaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.yaml'), 'a: !includeYaml ./a.yaml\n');

    expect(() => readYamlFileWithIncludes(path.join(tmpDir, 'a.yaml'))).toThrow(/Circular !includeYaml/);
  });

  it('throws naming the chain when two files include each other via !includeYaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.yaml'), 'a: !includeYaml ./b.yaml\n');
    fs.writeFileSync(path.join(tmpDir, 'b.yaml'), 'b: !includeYaml ./a.yaml\n');

    expect(() => readYamlFileWithIncludes(path.join(tmpDir, 'a.yaml'))).toThrow(/Circular !includeYaml/);
  });

  it('throws naming the included file when it has a YAML syntax error', () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.yaml'), 'foo: [1, 2\n');
    fs.writeFileSync(path.join(tmpDir, 'main.yaml'), 'config: !includeYaml ./bad.yaml\n');

    expect(() => readYamlFileWithIncludes(path.join(tmpDir, 'main.yaml'))).toThrow(/bad\.yaml/);
  });
});
