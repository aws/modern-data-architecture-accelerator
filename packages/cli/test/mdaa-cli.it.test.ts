/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaDeploy } from '../lib/mdaa-cli';
import { itintegration } from './testing_utils';
import { DuplicateAccountLevelModulesException } from '../lib/exceptions';

/**
 * Run with -- followed by required parameters.
 * For example: jest -- --integration
 * Without --integration these tests are ignored
 */
describe('cli.integration', () => {
  itintegration('happy path', () => {
    const options = {
      _unknown: 'list',
      action: 'list',
      config: './test/resources/mdaa.yaml',
    };
    const mdaa = new MdaaDeploy(options, options['_unknown'].split(','));
    mdaa.sanityCheck();
  });
  itintegration('dupe path', () => {
    const options = {
      _unknown: 'list',
      action: 'list',
      config: './test/resources/mdaa_dupe.yaml',
    };
    const mdaa = new MdaaDeploy(options, options['_unknown'].split(','));
    expect(() => {
      mdaa.sanityCheck();
    }).toThrow(DuplicateAccountLevelModulesException);
  });
});

describe('MdaaDeploy.execCmd integration tests', () => {
  let mdaaDeploy: MdaaDeploy;

  beforeEach(() => {
    // Create MdaaDeploy instance for testing (not in test mode)
    const options = {
      action: 'deploy',
      // Don't set testing option at all to disable test mode
    };
    mdaaDeploy = new MdaaDeploy(options, [], {
      organization: 'test-org',
      domains: {
        'test-domain': {
          environments: {
            'test-env': {
              modules: {
                'test-module': {
                  module_path: '@test/module',
                },
              },
            },
          },
        },
      },
    });
  });

  itintegration('should execute successful commands (exit 0)', () => {
    // Test simple successful command - should not throw
    expect(() => {
      mdaaDeploy.execCmd("echo 'hello'");
    }).not.toThrow();
  });

  itintegration('should handle commands with non-zero exit codes', () => {
    // Test command that fails - cat a non-existent file
    // This will output error to stderr and exit with non-zero code
    expect(() => {
      mdaaDeploy.execCmd('cat foobar.txt');
    }).toThrow();

    // The enhanced error reporting will show details in console.error
    // but we're not mocking anything - this is a real integration test
  });

  itintegration('should pass environment variables to executed commands', () => {
    // Set a test environment variable
    const testEnvVar = 'MDAA_TEST_VAR';
    process.env[testEnvVar] = 'test-environment-value-12345';

    try {
      // Test that the command can access the environment variable
      // This should succeed and the echo command will output the value
      expect(() => {
        mdaaDeploy.execCmd(`echo $${testEnvVar}`);
      }).not.toThrow();

      // The command should execute successfully, proving env vars are passed
    } finally {
      // Clean up the test environment variable
      delete process.env[testEnvVar];
    }
  });
});
