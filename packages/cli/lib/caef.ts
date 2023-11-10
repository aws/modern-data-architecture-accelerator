/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefDeploy } from "./caef-cli";


const commandLineArgs = require( 'command-line-args' )

const pjson = require( '../package.json' );
console.log( `CAEF Version: ${ pjson.version }` );

const optionDefinitions = [
    {
        name: 'config',
        alias: 'c',
        type: String,
        defaultValue: 'caef.yaml',
        description: "Optional - The path to the CAEF config file."
    },
    {
        name: 'action',
        alias: 'a',
        type: String,
        defaultOption: true,
        description: "Required - One of 'synth','diff','deploy', 'dryrun', 'destroy', 'list'."
    },
    {
        name: 'domain',
        alias: 'd',
        type: String,
        description: "Optional - If specified, only matching domains (by name) will be processed. Multiple values can be specified as comma separated."
    },
    {
        name: 'env',
        alias: 'e',
        type: String,
        description: "Optional - If specified, only matching envs (by name) will be processed. Multiple values can be specified as comma separated."
    },
    {
        name: 'module',
        alias: 'm',
        type: String,
        description: "Optional - If specified, only matching modules (by name) will be processed. Multiple values can be specified as comma separated."
    },
    {
        name: 'tag',
        alias: 't',
        type: String,
        description: "Optional - If specified, value will be passed to NPM as a dist-tag during package installation."
    },
    {
        name: 'role_arn',
        alias: 'r',
        type: String,
        description: "Optional - If specified, will be passed to the -r (--roleArn) parameter of the CDK command."
    },
    {
        name: 'working_dir',
        alias: 'w',
        type: String,
        description: "Optional - Override the working dir location (default ./caef_working)"
    },
    {
        name: 'clear',
        alias: 'x',
        type: Boolean,
        description: "Optional - Clears working directory of all installed packages."
    },
    {
        name: 'caef_version',
        alias: 'u',
        type: String,
        description: "Optional - Specify the CAEF module version to be used."
    },
    {
        name: 'npm_debug',
        alias: 'n',
        type: Boolean,
        description: "Optional - Runs all NPM commands in debug mode"
    },
    {
        name: 'output_effective_config',
        alias: 'o',
        type: Boolean,
        description: "Each module will output it's effective config to console."
    },
    {
        name: 'local_mode',
        alias: 'l',
        type: Boolean,
        description: "CAEF code will be executed from local source code instead of from installed NPM packages"
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: "Prints this help."
    }
]

const options = commandLineArgs( optionDefinitions )

if ( options[ 'help' ] ) {
    console.log( JSON.stringify( optionDefinitions, undefined, 2 ) )
    process.exit( 0 )
}

const caef = new CaefDeploy( options )
caef.deploy()
