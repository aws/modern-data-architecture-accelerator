/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared helpers for GAIA v2 L3 construct infrastructure tests.
 *
 * The same valid baseline GAIAL3Construct configuration is needed by several
 * test files (gaia-construct, admin-ui, client-ui, authentication, etc.),
 * so the factory below is extracted here to avoid duplication and keep
 * tests short and focused on their specific assertions.
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { GAIAL3Construct, GAIAL3ConstructProps } from '../../lib';

/**
 * Instantiates a GAIAL3Construct against a known-good baseline configuration
 * and returns the synthesized CloudFormation template.
 *
 * Pass a partial `gaiaConfig` override to exercise a specific sub-construct's
 * configuration; properties present on the override replace the matching
 * properties on the baseline.
 */
export const createGaiaTemplate = (gaiaConfig: Partial<GAIAL3ConstructProps['gaia']> = {}): Template => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const defaultConfig: GAIAL3ConstructProps['gaia'] = {
    waf: { skipGlobalDefaultWaf: true },
    dataAdminRoles: [{ name: 'test-admin' }],
    bedrock: { knowledgeBaseId: 'knowledgeBaseId' },
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

  const constructProps: GAIAL3ConstructProps = {
    gaia: { ...defaultConfig, ...gaiaConfig },
    roleHelper,
    naming: testApp.naming,
  };

  new GAIAL3Construct(testApp.testStack, 'teststack', constructProps);
  return Template.fromStack(testApp.testStack);
};
