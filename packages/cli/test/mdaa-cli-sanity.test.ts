/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DuplicateAccountLevelModulesException } from '../lib/exceptions';
import { getMdaaConfig } from '../lib/module-service';
import { findDuplicates } from '../lib/utils';
import { MdaaDeploy } from '../lib/mdaa-cli';
import { createConfig, isAccountLevelModule } from './testing_utils';
import { ConfigurationElement } from '@aws-mdaa/config';

const commandExists = require('command-exists');

// Mock the imported getMdaaConfig function
jest.mock('../lib/module-service', () => ({
  getMdaaConfig: jest.fn(),
}));
jest.mock('../lib/utils', () => ({
  findDuplicates: jest.fn(),
}));
jest.mock('command-exists', () => ({
  sync: jest.fn(),
}));

describe('MdaaDeploy.sanityCheck', () => {
  const options = {
    testing: 'true',
    action: 'synth',
    npm_debug: 'true',
    working_dir: 'test/test_working',
    config: './test/resources/mdaa_account-level-no-overlap.yaml',
    local_mode: 'true',
  };

  const actualFindDuplicates = jest.requireActual('../lib/utils').findDuplicates;

  beforeEach(() => {
    // Mock console.log to suppress output during tests
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // mod1 is an account level module
    (getMdaaConfig as jest.Mock).mockImplementation(isAccountLevelModule);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should not trigger any problems since none of the modules is account level in the yaml file', () => {
    (commandExists.sync as jest.Mock).mockReturnValue(true);

    const mdaaDeploy = new MdaaDeploy(options);

    // Module is not account-level
    (getMdaaConfig as jest.Mock).mockReturnValue(false);

    const expectedInput = {};
    (findDuplicates as jest.Mock).mockReturnValue(actualFindDuplicates(expectedInput));

    mdaaDeploy.sanityCheck();

    expect(findDuplicates).toHaveBeenCalledWith(expectedInput);
  });
  test('should fail the sanity test because module 1 is account level and it appears in the default account three times', () => {
    // in this scenario we have mod1, which is account_level, appearing in the same account1 in all three places
    const config: ConfigurationElement = {
      organization: 'sample-org',
      domains: createConfig([
        [
          {
            modules: [1, 2],
          },
          {
            modules: [1],
          },
        ],
        [
          {
            modules: [1],
          },
        ],
      ]),
    };
    const mdaaDeploy = new MdaaDeploy(options, undefined, config);

    const expectedInput = {
      default: { mod1: 3 },
    };
    (findDuplicates as jest.Mock).mockReturnValue(actualFindDuplicates(expectedInput));
    expect(() => {
      mdaaDeploy.sanityCheck();
    }).toThrow(DuplicateAccountLevelModulesException);

    expect(findDuplicates).toHaveBeenCalledWith(expectedInput);
  });
  test('should pass sanity check because module 1 appears in different accounts', () => {
    // in this scenario we have mod1, which is account_level, appearing in the same account1 in all three places
    const config: ConfigurationElement = {
      organization: 'sample-org',
      domains: createConfig([
        [
          {
            account: 'acct1',
            modules: [1, 2, 3],
          },
          {
            account: 'acct3',
            modules: [1],
          },
        ],
        [
          {
            account: 'acct2',
            modules: [1, 3],
          },
        ],
      ]),
    };
    const mdaaDeploy = new MdaaDeploy(options, undefined, config);

    const expectedInput = {
      acct1: { mod1: 1, mod3: 1 },
      acct2: { mod1: 1, mod3: 1 },
      acct3: { mod1: 1 },
    };
    (findDuplicates as jest.Mock).mockReturnValue(actualFindDuplicates(expectedInput));
    mdaaDeploy.sanityCheck();

    // Verify the correct accounting of modules
    expect(findDuplicates).toHaveBeenCalledWith(expectedInput);
  });
});
