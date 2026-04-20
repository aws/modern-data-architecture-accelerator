/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataLakeCDKApp } from '../lib/datalake';
import * as path from 'path';

describe('DataLake Validation', () => {
  test('rejects invalid CORS method', () => {
    const app = new DataLakeCDKApp({
      context: {
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        module_name: 'test-datalake-validation',
        module_configs: path.join(__dirname, 'invalid-cors-method.yaml'),
      },
    });
    expect(() => app.generateStack()).toThrow(/Config contains shape errors/);
  });
});
