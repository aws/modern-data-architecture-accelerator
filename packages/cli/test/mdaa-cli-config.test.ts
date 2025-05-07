/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaCliConfig, MdaaConfigContents } from '../lib/mdaa-cli-config-parser';

test('ConfigParseTest', () => {
  expect(() => new MdaaCliConfig({ filename: 'test/resources/mdaa.yaml' })).not.toThrow();
});

test('BadOrgNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test_bad_org',
    domains: {},
  };

  expect(() => new MdaaCliConfig({ configContents: configContents })).toThrow();
});

test('GoodOrgNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {},
  };

  expect(() => new MdaaCliConfig({ configContents: configContents })).not.toThrow();
});

test('BadDomainNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      test_bad_domain: {
        environments: {},
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).toThrow();
});

test('GoodDomainNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      'test-good-domain': {
        environments: {},
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).not.toThrow();
});

test('BadEnvNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      'test-good-domain': {
        environments: {
          test_bad_env: {
            modules: {},
          },
        },
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).toThrow();
});

test('GoodEnvNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      'test-good-domain': {
        environments: {
          'test-good-env': {
            modules: {},
          },
        },
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).not.toThrow();
});

test('BadModuleNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      'test-good-domain': {
        environments: {
          'test-good-env': {
            modules: {
              test_bad_module: {
                module_path: 'test',
              },
            },
          },
        },
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).toThrow();
});

test('GoodModuleNameTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      'test-good-domain': {
        environments: {
          'test-good-env': {
            modules: {
              'test-good-module': {
                module_path: 'test',
              },
            },
          },
        },
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).not.toThrow();
});

test('TerraformModuleTest', () => {
  const configContents: MdaaConfigContents = {
    organization: 'test-good-org',
    domains: {
      'test-good-domain': {
        environments: {
          'test-good-env': {
            modules: {
              'test-tf-mdaa-module': {
                module_type: 'tf',
                module_path: 'aws-mdaa/test',
              },
              'test-tf-3p-mdaa-module': {
                module_type: 'tf',
                mdaa_compliant: true,
              },
              'test-tf-3p-module': {
                module_type: 'tf',
                mdaa_compliant: false,
              },
            },
          },
        },
      },
    },
  };
  expect(() => new MdaaCliConfig({ configContents: configContents })).not.toThrow();
});
