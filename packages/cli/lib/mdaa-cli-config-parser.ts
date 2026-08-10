/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigConfigPathValueTransformer, MdaaConfigTransformer } from '@aws-mdaa/config';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as configJsonSchema from './config-schema.json';
// nosemgrep
import * as path from 'path';
import { MdaaConfigContents } from './config-types';
import { validateConfigContents } from './config-field-policy';

const avj = new Ajv();

// Interfaces live in ./config-types (see there); re-exported for existing importers.
export {
  HookConfig,
  MdaaConfigContents,
  MdaaDomainConfig,
  MdaaEnvironmentConfig,
  MdaaModuleConfig,
  TerraformConfig,
} from './config-types';

export interface MdaaParserConfig {
  readonly filename?: string;
  readonly configContents?: object;
}

export class MdaaCliConfig {
  public readonly contents: MdaaConfigContents;

  private props: MdaaParserConfig;

  // TYPE_WARNING: need to revisit this to make sure the types really match
  private configSchema = configJsonSchema as unknown as JSONSchemaType<MdaaConfigContents>;

  constructor(props: MdaaParserConfig) {
    this.props = props;

    if (!this.props.filename && !this.props.configContents) {
      throw new Error("ConfigParser class requires either 'filename' or 'configContents' to be specified");
    }

    const configShapeValidator: ValidateFunction = avj.compile(this.configSchema);
    if (this.props.filename) {
      // nosemgrep
      const configFileContentsString = fs.readFileSync(this.props.filename, { encoding: 'utf8' });
      let relativePathTransformedContents: unknown;
      try {
        const parsedContents = yaml.parse(configFileContentsString);
        //Resolve relative paths in parsedYaml
        const baseDir = path.dirname(this.props.filename.trim());
        relativePathTransformedContents = new MdaaConfigTransformer(
          new ConfigConfigPathValueTransformer(baseDir),
        ).transformConfig(parsedContents);
      } catch (err) {
        throw new Error(`${this.props.filename}: Structural problem found in the YAML file: ${err} `);
      }
      // Confirm our provided file matches our Schema (verification of Data shape)
      if (!configShapeValidator(relativePathTransformedContents)) {
        throw new Error(
          `${this.props.filename}' contains shape errors\n: ${JSON.stringify(configShapeValidator.errors, null, 2)}`,
        );
      }
      // Config file is shaped correctly and contains required values!
      this.contents = relativePathTransformedContents as MdaaConfigContents;
    } else {
      if (!configShapeValidator(this.props.configContents)) {
        throw new Error(
          `Config contents contains shape errors\n: ${JSON.stringify(configShapeValidator.errors, null, 2)}`,
        );
      } else {
        // Config file is shaped correctly and contains required values!
        this.contents = this.props.configContents as MdaaConfigContents;
      }
    }
    this.validateConfig();
  }

  /** Fail-fast parse-time format validation of constrained fields (see {@link ./config-field-policy}). */
  private validateConfig() {
    validateConfigContents(this.contents);
  }
}
