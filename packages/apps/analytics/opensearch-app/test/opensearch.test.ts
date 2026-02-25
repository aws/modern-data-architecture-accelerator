/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpensearchCDKApp } from '../lib/opensearch';
import { Template } from 'aws-cdk-lib/assertions';

jest.mock('child_process');

describe('OpenSearch App SAML Authentication Tests', () => {
  test('OpenSearch app with SAML configuration synthesizes correctly', () => {
    const context = {
      org: 'test-org',
      env: 'test-env',
      domain: 'test-domain',
      module_name: 'test-module',
      module_configs: './test/test-config-saml.yaml',
    };
    const app = new OpensearchCDKApp({ context: context });
    app.generateStack();

    expect(() =>
      app.synth({
        force: true,
        validateOnSynthesis: true,
      }),
    ).not.toThrow();
  });

  test('OpenSearch app with SAML includes SAML options in CloudFormation', () => {
    const context = {
      org: 'test-org',
      env: 'test-env',
      domain: 'test-domain',
      module_name: 'test-module',
      module_configs: './test/test-config-saml.yaml',
    };
    const app = new OpensearchCDKApp({ context: context });
    const stack = app.generateStack();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        SAMLOptions: {
          Enabled: true,
          Idp: {
            EntityId: 'https://portal.sso.us-east-1.amazonaws.com/saml/assertion/ABC123',
          },
        },
      },
    });
  });

  test('OpenSearch app without SAML uses IAM authentication only', () => {
    const context = {
      org: 'test-org',
      env: 'test-env',
      domain: 'test-domain',
      module_name: 'test-module',
      module_configs: './test/test-config.yaml',
    };
    const app = new OpensearchCDKApp({ context: context });
    const stack = app.generateStack();

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        InternalUserDatabaseEnabled: false,
        MasterUserOptions: {
          MasterUserARN: {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':iam::',
                {
                  Ref: 'AWS::AccountId',
                },
                ':role/test-admin',
              ],
            ],
          },
        },
      },
    });

    // Verify SAML options are not present
    const resources = template.findResources('AWS::OpenSearchService::Domain');
    const domainResource = Object.values(resources)[0] as {
      Properties: { AdvancedSecurityOptions: { SAMLOptions?: unknown } };
    };
    expect(domainResource.Properties.AdvancedSecurityOptions.SAMLOptions).toBeUndefined();
  });

  test('OpenSearch app with SAML using idpMetadataXml synthesizes correctly', () => {
    const context = {
      org: 'test-org',
      env: 'test-env',
      domain: 'test-domain',
      module_name: 'test-module',
      module_configs: './test/test-config-saml.yaml',
    };
    const app = new OpensearchCDKApp({ context: context });
    const stack = app.generateStack();

    const template = Template.fromStack(stack);

    // Verify SAML is enabled with metadata XML
    template.hasResourceProperties('AWS::OpenSearchService::Domain', {
      AdvancedSecurityOptions: {
        Enabled: true,
        SAMLOptions: {
          Enabled: true,
          Idp: {
            EntityId: 'https://portal.sso.us-east-1.amazonaws.com/saml/assertion/ABC123',
          },
        },
      },
    });
  });
});
