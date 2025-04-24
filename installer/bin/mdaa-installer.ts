#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MdaaInstallerStack } from '../lib/mdaa-installer-stack';

const app = new cdk.App();
new MdaaInstallerStack(app, 'MdaaInstallerStack');
