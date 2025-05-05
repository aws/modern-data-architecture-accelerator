/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Code } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import fs = require('fs');
import os = require('os');

export type PythonVersion = '3.12' | '3.13';
export interface MdaaPythonCodeAssetProps {
  readonly pythonRequirementsPath: string;
  readonly pythonVersion?: PythonVersion;
}

export class MdaaPythonCodeAsset extends Construct {
  public readonly code: Code;
  public constructor(scope: Construct, id: string, props: MdaaPythonCodeAssetProps) {
    super(scope, id);
    if (!fs.existsSync(props.pythonRequirementsPath)) {
      throw new Error(`Python requirements file ${props.pythonRequirementsPath} does not exists`);
    }
    const pythonVersion = props.pythonVersion || '3.12';
    const tempDir = fs.mkdtempSync(os.tmpdir());
    fs.copyFileSync(props.pythonRequirementsPath, `${tempDir}/requirements.txt`);
    const dockerCommand = process.env.CDK_DOCKER ?? 'docker';
    const commandExists = require('command-exists');
    const dockerCommandExists = commandExists.sync(dockerCommand);
    /* istanbul ignore next */
    if (dockerCommandExists && pythonVersion == '3.12') {
      //Docker build for Python 3.13 not yet available.
      console.log(`Using ${dockerCommand} to build asset`);
      fs.copyFileSync(`${__dirname}/../src/docker/Dockerfile_${pythonVersion}`, `${tempDir}/Dockerfile`);
      this.code = Code.fromDockerBuild(tempDir);
    } else {
      console.log(`Docker command '${dockerCommand}' does not exist. Attempting asset build using Pip in ${tempDir}.`);
      const cmd = ['sh', `${__dirname}/../src/scripts/build_layer.sh`, tempDir, pythonVersion];
      this.code = Code.fromCustomCommand(tempDir, cmd, {
        commandOptions: {
          stdio: 'inherit',
        },
      });
    }
  }
}
