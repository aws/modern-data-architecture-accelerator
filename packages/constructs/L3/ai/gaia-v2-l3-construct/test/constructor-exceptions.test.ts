/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../lib';

/**
 * Builds a valid GAIAL3ConstructProps and applies a caller-supplied override
 * to produce an invalid configuration for negative testing. The baseline
 * configuration below is known-good (it satisfies every runtime validator in
 * GAIAL3Construct and its sub-constructs); each test mutates it minimally to
 * trigger a single validator.
 */
const buildProps = (testApp: MdaaTestApp, override: Partial<GAIAL3ConstructProps['gaia']>): GAIAL3ConstructProps => {
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  const baseline: GAIAL3ConstructProps['gaia'] = {
    waf: { skipGlobalDefaultWaf: true },
    dataAdminRoles: [{ name: 'test-admin' }],
    bedrock: { knowledgeBaseId: 'kb' },
    webSocketApi: {
      bedrockRagDataSource: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        lambdaRole: { id: 'generated-role-id:bedrock-rag-datasource' },
      },
    },
    vpc: { vpcId: 'XXXXXXXX', appSubnets: ['subnet1'] },
    auth: {
      cognitoDomain: 'test-domain',
      entraIdOIDCConfiguration: {
        entraIdConfigSecretArn: 'arn:aws:secretsmanager:ca-central-1:123456789102:secret:oidc-secret-rkfLVz',
        attributeMapping: { fullname: 'name' },
      },
    },
    userFeedback: { reasons: ['accuracy'] },
  };
  return {
    gaia: { ...baseline, ...override },
    roleHelper,
    naming: testApp.naming,
  };
};

describe('GAIAL3Construct Constructor Exception Scenarios', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('throws when WebSocketApiProps configures more than one data source', () => {
    const props = buildProps(testApp, {
      webSocketApi: {
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:rag' },
        },
        invokeModelDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:invoke' },
        },
      },
    });
    expect(() => {
      new GAIAL3Construct(testApp.testStack, 'teststack', props);
    }).toThrow(/exactly one of bedrockRagDataSource, invokeModelDataSource, customDataSource/i);
  });

  test('throws when bedrockRagDataSource is configured without bedrock.knowledgeBaseId', () => {
    const props = buildProps(testApp, {
      bedrock: {}, // knowledgeBaseId intentionally omitted
      webSocketApi: {
        bedrockRagDataSource: {
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
          lambdaRole: { id: 'generated-role-id:rag' },
        },
      },
    });
    expect(() => {
      new GAIAL3Construct(testApp.testStack, 'teststack', props);
    }).toThrow(/bedrockRagDataSource requires bedrock\.knowledgeBaseId/i);
  });

  test('throws when auth has neither cognitoDomain nor entraIdOIDCConfiguration', () => {
    const props = buildProps(testApp, {
      auth: {} as unknown as GAIAL3ConstructProps['gaia']['auth'],
    });
    expect(() => {
      new GAIAL3Construct(testApp.testStack, 'teststack', props);
    }).toThrow(/at least one of cognitoDomain or entraIdOIDCConfiguration/i);
  });

  test('throws when vpc.appSubnets is empty', () => {
    const props = buildProps(testApp, {
      vpc: { vpcId: 'XXXXXXXX', appSubnets: [] },
    });
    expect(() => {
      new GAIAL3Construct(testApp.testStack, 'teststack', props);
    }).toThrow(/appSubnets must contain at least one subnet/i);
  });
});
