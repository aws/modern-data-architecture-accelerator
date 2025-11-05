#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MdaaInstallerStack } from '../lib/mdaa-installer-stack';
import * as pjson from '../package.json';

const app = new cdk.App();
const packageName = pjson.name.split('/')[1] ?? 'unknown';
const stackDescription = `(${pjson.solution_id}-${packageName}) ${pjson.solution_name}. Version ${pjson.version}`;

new MdaaInstallerStack(app, 'MdaaInstallerStack', {
  description: stackDescription,
});
