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
