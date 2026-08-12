/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { createAgentcoreCognitoAuth } from '../lib';

describe('createAgentcoreCognitoAuth Compliance', () => {
  describe('widest surface', () => {
    const testApp = new MdaaTestApp();

    // Exercises the widest surface in one stack: hosted UI (which turns OAuth and the
    // domain on) plus SAML federation, so the nag rules see the client, domain, and
    // identity provider as well as the pool.
    createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
      cognitoConfig: {
        mfa: 'required',
        hostedUi: {
          callbackUrls: ['https://app.example.com/callback'],
          logoutUrls: ['https://app.example.com/logout'],
          cognitoDomainPrefix: 'test-agent-auth',
        },
        federation: {
          saml: {
            metadataUrl: 'https://login.microsoftonline.com/tenant/federationmetadata/2007-06/federationmetadata.xml',
          },
        },
      },
      naming: testApp.naming,
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
  });

  // The default path, which most deployments get. MFA is required here, so this case
  // carries no MFA suppressions at all — it is the compliance-clean configuration.
  describe('defaults', () => {
    const testApp = new MdaaTestApp();

    createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
      cognitoConfig: {},
      naming: testApp.naming,
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
  });

  // Non-interactive callers cannot enrol an authenticator, so they weaken MFA deliberately.
  // Covered separately so the suppression carrying that decision is exercised rather than
  // bypassed by only ever testing the compliant default.
  describe('optional MFA for non-interactive callers', () => {
    const testApp = new MdaaTestApp();

    createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
      cognitoConfig: { mfa: 'optional' },
      naming: testApp.naming,
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
  });
});
