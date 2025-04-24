/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaBootstrapCDKApp } from '../lib/bootstrap';

test('SynthTest', () => {
  const context = {
    org: 'test-org',
    env: 'test-env',
    domain: 'test-domain',
    module_name: 'test-module',
  };
  const app = new MdaaBootstrapCDKApp({ context: context });
  app.generateStack();
  expect(() =>
    app.synth({
      force: true,
      validateOnSynthesis: true,
    }),
  ).not.toThrow();
});
