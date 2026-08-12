/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { CognitoAuthProperty, createAgentcoreCognitoAuth } from '../lib';

/**
 * MdaaNagSuppressions base64-encodes suppression reasons into the template metadata, so a
 * test asserting on reason text has to decode it first.
 */
function suppressionReason(
  pool: { Metadata?: { cdk_nag?: { rules_to_suppress?: { id: string; reason: string }[] } } },
  id: string,
): string {
  const rule = (pool.Metadata?.cdk_nag?.rules_to_suppress ?? []).find(r => r.id === id);
  return rule ? Buffer.from(rule.reason, 'base64').toString('utf8') : '';
}

const SAML_METADATA_URL = 'https://login.microsoftonline.com/tenant/federationmetadata/2007-06/federationmetadata.xml';

describe('createAgentcoreCognitoAuth', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  describe('user pool security defaults', () => {
    test('should create pool with PLUS feature plan and enforced threat protection', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolTier: 'PLUS',
        UserPoolAddOns: { AdvancedSecurityMode: 'ENFORCED' },
      });
    });

    test('should enforce an 8+ character mixed-class password policy', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
          },
        },
      });
    });

    test('should disable self-signup and restrict recovery to email only', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
        AccountRecoverySetting: { RecoveryMechanisms: [{ Name: 'verified_email', Priority: 1 }] },
        UsernameAttributes: ['email'],
      });
    });

    // Compliance-by-default: the unconfigured pool is the one that satisfies the MFA nag
    // rules, so weakening it has to be an explicit line in a config.
    test('should default MFA to required TOTP without SMS', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        MfaConfiguration: 'ON',
        EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
      });
    });

    // This pool hardcodes TOTP-only MFA and email-only recovery, so CDK generates no
    // Cognito SMS role — suppressions for it would target a resource that is not in the
    // template, which is the opposite of scoping a suppression as narrowly as possible.
    test('should carry no SMS-role suppressions, since no SMS role is generated', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      const pool = Object.values(template.findResources('AWS::Cognito::UserPool'))[0];
      const ids = ((pool.Metadata?.cdk_nag?.rules_to_suppress ?? []) as { id: string }[]).map(r => r.id);
      expect(ids).not.toContain('AwsSolutions-IAM5');
      expect(ids.filter(id => id.includes('IAMNoInlinePolicy'))).toHaveLength(0);
    });

    test('should carry no MFA nag suppressions on the default path', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const suppressions = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPool'),
      )[0].Metadata?.cdk_nag?.rules_to_suppress;
      const ids = (suppressions ?? []).map((s: { id: string }) => s.id);
      expect(ids).not.toContain('AwsSolutions-COG2');
      expect(ids.filter((id: string) => id.includes('CognitoUserPoolMFA'))).toHaveLength(0);
    });

    // checkCdkNagCompliance only fails on nag *errors*, and the MFA rules surface as
    // warnings — so without this the suppression could be dropped and the compliance test
    // would still pass.
    // 'off' and 'optional' relax different amounts of the control, so the suppression must
    // not justify the weaker setting with the stronger case.
    test('should justify the optional suppression with the non-interactive-caller case', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa: 'optional' },
        naming: testApp.naming,
      });

      const pool = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPool'))[0];
      const reason = suppressionReason(pool, 'AwsSolutions-COG2');
      expect(reason).toContain("set to 'optional'");
      expect(reason).toContain('TOTP remains available');
    });

    test('should justify the off suppression with the federated-users case', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          mfa: 'off',
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: { saml: { metadataUrl: SAML_METADATA_URL } },
        },
        naming: testApp.naming,
      });

      const pool = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPool'))[0];
      const reason = suppressionReason(pool, 'AwsSolutions-COG2');
      expect(reason).toContain("set to 'off'");
      expect(reason).toContain('federated');
      // Must not borrow the optional-mode justification.
      expect(reason).not.toContain('TOTP remains available');
    });

    // 'off' only earns the suppression alongside federation, which supplies the MFA it
    // delegates to; 'optional' earns it on its own.
    const SUPPRESSED_CONFIGS: [string, CognitoAuthProperty][] = [
      [
        'off with federation',
        {
          mfa: 'off',
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: { saml: { metadataUrl: SAML_METADATA_URL } },
        },
      ],
      ['optional', { mfa: 'optional' }],
    ];

    test.each(SUPPRESSED_CONFIGS)('should suppress the MFA nag warnings for %s', (_label, cognitoConfig) => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig,
        naming: testApp.naming,
      });

      // Anchored on the cdk-nag message format (`<RuleId>: <description>`) rather than
      // matching the ID anywhere, so MDAA's own advisory warnings — which mention the rule
      // by name — are not mistaken for an unsuppressed nag.
      const mfaWarnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('^(AwsSolutions-COG2|.*CognitoUserPoolMFA):.*'),
      );
      expect(mfaWarnings).toHaveLength(0);
    });

    // The off-mode suppression is justified by federation supplying MFA instead. Without
    // federation that claim is false, so the pool must keep the nag rather than have the
    // finding it genuinely earns silenced.
    test('should not suppress the MFA nag when mfa is off and no federation delegates it', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa: 'off' },
        naming: testApp.naming,
      });

      const pool = Object.values(Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPool'))[0];
      const ids = ((pool.Metadata?.cdk_nag?.rules_to_suppress ?? []) as { id: string }[]).map(r => r.id);
      expect(ids).not.toContain('AwsSolutions-COG2');
    });

    test('should not suppress the MFA nag when mfa is required, so a regression resurfaces', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa: 'required' },
        naming: testApp.naming,
      });

      const suppressions = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPool'),
      )[0].Metadata?.cdk_nag?.rules_to_suppress;
      expect((suppressions ?? []).map((s: { id: string }) => s.id)).not.toContain('AwsSolutions-COG2');
    });

    test.each([
      ['off', 'OFF'],
      ['optional', 'OPTIONAL'],
      ['required', 'ON'],
    ] as const)('should map mfa %s to MfaConfiguration %s', (mfa, expected) => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        MfaConfiguration: expected,
      });
    });
  });

  // Required MFA with no hosted UI is valid and often deliberate, but it is also what a
  // deployment that took the defaults gets — and there it surfaces only when the first
  // sign-in fails with an MFA_SETUP challenge that does not mention MFA.
  describe('required-MFA enrolment warning', () => {
    const WARNING_PATTERN = '.*requires every user to register a TOTP authenticator.*';

    test('should warn when MFA is required by default and no hosted UI is configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp(WARNING_PATTERN),
      );
      expect(warnings.length).toBeGreaterThan(0);
    });

    test('should not warn when a hosted UI supplies the enrolment flow', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/callback'] } },
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp(WARNING_PATTERN),
      );
      expect(warnings).toHaveLength(0);
    });

    test.each(['optional', 'off'] as const)('should not warn when mfa is %s', mfa => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa },
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp(WARNING_PATTERN),
      );
      expect(warnings).toHaveLength(0);
    });

    test('should name both exits so the message is actionable', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa: 'required' },
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp(WARNING_PATTERN),
      );
      const message = JSON.stringify(warnings[0].entry.data);
      expect(message).toContain('cognito.hostedUi');
      expect(message).toContain("cognito.mfa: 'optional'");
      expect(message).toContain('AssociateSoftwareToken');
    });
  });

  // `off` removes the second factor for everyone, which is only justified where Cognito
  // applies none anyway — a fully federated pool. The nag suppression asserts that
  // rationale, so a non-federated pool using `off` would assert a federation it lacks.
  describe('mfa off without federation warning', () => {
    const PATTERN = '.*no second factor for any principal.*';

    test('should warn when mfa is off and no federation is configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa: 'off' },
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning('*', Match.stringLikeRegexp(PATTERN));
      expect(warnings.length).toBeGreaterThan(0);
    });

    test('should not warn when mfa is off on a federated pool', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          mfa: 'off',
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: { saml: { metadataUrl: SAML_METADATA_URL } },
        },
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning('*', Match.stringLikeRegexp(PATTERN));
      expect(warnings).toHaveLength(0);
    });

    test.each(['optional', 'required'] as const)('should not warn when mfa is %s', mfa => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { mfa },
        naming: testApp.naming,
      });

      const warnings = Annotations.fromStack(testApp.testStack).findWarning('*', Match.stringLikeRegexp(PATTERN));
      expect(warnings).toHaveLength(0);
    });
  });

  describe('removal policy', () => {
    // An identity store's failure modes are asymmetric: a wrongly retained pool costs a
    // manual cleanup, a wrongly destroyed one takes every user record with it.
    test('should default to retaining the pool so user records survive stack deletion', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('should enable deletion protection on a retained pool', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPool', { DeletionProtection: 'ACTIVE' });
    });

    // Deletion protection on a pool the stack is meant to delete would leave a stack that
    // cannot be deleted without a manual console step; CDK does not reject that pairing.
    test('should disable deletion protection when the pool is destroyed with the stack', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { removalPolicy: 'destroy' },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResource('AWS::Cognito::UserPool', {
        Properties: Match.objectLike({ DeletionProtection: 'INACTIVE' }),
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    test('should destroy the pool when configured, so an ephemeral stack tears down cleanly', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { removalPolicy: 'destroy' },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    test('should retain the pool when explicitly configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { removalPolicy: 'retain' },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });
  });

  describe('app client token validity', () => {
    test('should default both ID and access tokens to 15 minutes', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        IdTokenValidity: 15,
        AccessTokenValidity: 15,
        TokenValidityUnits: { IdToken: 'minutes', AccessToken: 'minutes' },
      });
    });

    // Cognito's own refresh-token default is 30 days, which would let a leaked refresh
    // token mint fresh 15-minute access tokens for a month.
    test('should bound the refresh token rather than accept the 30-day service default', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        RefreshTokenValidity: 1440,
        TokenValidityUnits: Match.objectLike({ RefreshToken: 'minutes' }),
      });
    });

    test('should honour a configured validity', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { idTokenValidityMinutes: 30 },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        IdTokenValidity: 30,
        AccessTokenValidity: 30,
      });
    });

    test.each([4, 61, 0, -5, 15.5])('should reject out-of-range validity %s', invalid => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: { idTokenValidityMinutes: invalid },
          naming: testApp.naming,
        }),
      ).toThrow(/idTokenValidityMinutes must be a whole number of minutes between 5 and 60/);
    });

    test.each([5, 60])('should accept boundary validity %s', valid => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: { idTokenValidityMinutes: valid },
          naming: testApp.naming,
        }),
      ).not.toThrow();
    });
  });

  describe('app client hardening', () => {
    // USER_PASSWORD_AUTH sends the password to the API rather than proving knowledge of it
    // via SRP, so it is enabled only where nothing else works: a caller talking to
    // InitiateAuth directly. A hosted-UI deployment signs in through the code grant.
    test('should omit the plaintext-password flow when a hosted UI is configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/callback'] } },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      const client = Object.values(template.findResources('AWS::Cognito::UserPoolClient'))[0];
      expect(client.Properties.ExplicitAuthFlows).not.toContain('ALLOW_USER_PASSWORD_AUTH');
      expect(client.Properties.ExplicitAuthFlows).toContain('ALLOW_USER_SRP_AUTH');
      // The hosted-UI grant is independent of these flows, so sign-in still works.
      expect(client.Properties.AllowedOAuthFlows).toEqual(['code']);
    });

    test('should enable the plaintext-password flow without a hosted UI, where it is the only option', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      const client = Object.values(template.findResources('AWS::Cognito::UserPoolClient'))[0];
      expect(client.Properties.ExplicitAuthFlows).toContain('ALLOW_USER_PASSWORD_AUTH');
      expect(client.Properties.ExplicitAuthFlows).toContain('ALLOW_USER_SRP_AUTH');
    });

    test('should create a public client with direct user auth flows and token revocation', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        GenerateSecret: false,
        ExplicitAuthFlows: Match.arrayWith([
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ]),
        PreventUserExistenceErrors: 'ENABLED',
        EnableTokenRevocation: true,
      });
    });

    // CDK's addClient defaults would otherwise enable the implicit grant, grant
    // aws.cognito.signin.user.admin, and set CallbackURLs to https://example.com.
    test('should disable OAuth entirely when no hosted UI is configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const client = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPoolClient'),
      )[0];
      expect(client.Properties.AllowedOAuthFlowsUserPoolClient).toBe(false);
      expect(client.Properties.AllowedOAuthFlows).toBeUndefined();
      expect(client.Properties.AllowedOAuthScopes).toBeUndefined();
      expect(client.Properties.CallbackURLs).toBeUndefined();
    });

    test('should not create a hosted-UI domain when no hosted UI is configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPoolDomain', 0);
    });
  });

  describe('hosted UI', () => {
    test('should enable only the authorization code grant with the default scopes', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/callback'] } },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        AllowedOAuthFlowsUserPoolClient: true,
        AllowedOAuthFlows: ['code'],
        AllowedOAuthScopes: ['openid', 'profile', 'email'],
        CallbackURLs: ['https://app.example.com/callback'],
      });
    });

    test('should honour explicitly requested scopes and logout URLs', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: {
            callbackUrls: ['https://app.example.com/callback'],
            logoutUrls: ['https://app.example.com/logout'],
            allowedOAuthScopes: ['openid'],
          },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        AllowedOAuthScopes: ['openid'],
        LogoutURLs: ['https://app.example.com/logout'],
      });
    });

    test('should create a domain with the configured prefix', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'], cognitoDomainPrefix: 'my-agent-auth' },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
        Domain: 'my-agent-auth',
      });
    });

    // Managed login (v2), not the classic hosted UI Cognito would otherwise default to.
    // It is the only sign-in experience that walks a user through TOTP enrolment, so a
    // pool using `mfa: required` depends on it.
    // ManagedLoginVersion 2 alone does not activate managed login: the console assigns a
    // default branding style but the API and CloudFormation do not, so without this
    // resource the sign-in page never renders — and with it the TOTP enrolment path.
    test('should create a managed login branding style so the hosted UI renders', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/callback'] } },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::ManagedLoginBranding', 1);
      template.hasResourceProperties('AWS::Cognito::ManagedLoginBranding', {
        UseCognitoProvidedValues: true,
      });
    });

    test('should create no branding style when there is no hosted UI', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::ManagedLoginBranding', 0);
    });

    test('should opt in to managed login rather than the classic hosted UI', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/callback'] } },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolDomain', { ManagedLoginVersion: 2 });
    });

    test('should derive a domain prefix from MDAA naming when none is configured', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/callback'] } },
        naming: testApp.naming,
      });

      const domain = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::Cognito::UserPoolDomain'),
      )[0];
      expect(domain.Properties.Domain).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    });

    test('should reject an empty callbackUrls list', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: { hostedUi: { callbackUrls: [] } },
          naming: testApp.naming,
        }),
      ).toThrow(/callbackUrls is required/);
    });

    test('should reject a plain-http callback URL', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: { hostedUi: { callbackUrls: ['http://app.example.com/callback'] } },
          naming: testApp.naming,
        }),
      ).toThrow(/must use https/);
    });

    test('should permit http for localhost so local development still works', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: { hostedUi: { callbackUrls: ['http://localhost:3000/callback'] } },
          naming: testApp.naming,
        }),
      ).not.toThrow();
    });

    test('should reject a plain-http logout URL', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            hostedUi: { callbackUrls: ['https://app.example.com/cb'], logoutUrls: ['http://app.example.com/lo'] },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/must use https/);
    });

    test.each(['My-Domain', 'domain_prefix', '-leading', 'trailing-'])(
      'should reject invalid domain prefix %s',
      prefix => {
        expect(() =>
          createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
            cognitoConfig: {
              hostedUi: { callbackUrls: ['https://app.example.com/cb'], cognitoDomainPrefix: prefix },
            },
            naming: testApp.naming,
          }),
        ).toThrow(/cognitoDomainPrefix/);
      },
    );
  });

  describe('federation', () => {
    test('should register a SAML provider and enable it alongside Cognito-native sign-in', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: { saml: { metadataUrl: SAML_METADATA_URL } },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ProviderType: 'SAML',
        ProviderDetails: Match.objectLike({ MetadataURL: SAML_METADATA_URL }),
        AttributeMapping: { email: 'email' },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: Match.arrayWith(['COGNITO']),
      });
    });

    test('should map a custom SAML email claim', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: { saml: { metadataUrl: SAML_METADATA_URL, emailClaim: 'emailAddress' } },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        AttributeMapping: { email: 'emailAddress' },
      });
    });

    // Without an explicit dependency CDK can order the client before the provider,
    // which fails at deploy with an unrecognized-provider error.
    test('should order the app client after the federation provider', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: { saml: { metadataUrl: SAML_METADATA_URL } },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      const providerId = Object.keys(template.findResources('AWS::Cognito::UserPoolIdentityProvider'))[0];
      const client = Object.values(template.findResources('AWS::Cognito::UserPoolClient'))[0];
      expect(client.DependsOn).toContain(providerId);
    });

    test('should register an OIDC provider', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: {
            oidc: {
              issuerUrl: 'https://login.microsoftonline.com/tenant/v2.0',
              clientId: 'oidc-client',
              clientSecret: 'oidc-secret',
            },
          },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ProviderType: 'OIDC',
        ProviderDetails: Match.objectLike({ client_id: 'oidc-client' }),
      });
    });

    test('should map a custom OIDC email claim', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: {
            oidc: {
              issuerUrl: 'https://login.microsoftonline.com/tenant/v2.0',
              clientId: 'oidc-client',
              clientSecret: 'oidc-secret',
              emailClaim: 'upn',
            },
          },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        AttributeMapping: { email: 'upn' },
      });
    });

    test('should order the app client after an OIDC federation provider', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {
          hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
          federation: {
            oidc: { issuerUrl: 'https://idp.example.com', clientId: 'c', clientSecret: 's' },
          },
        },
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      const providerId = Object.keys(template.findResources('AWS::Cognito::UserPoolIdentityProvider'))[0];
      const client = Object.values(template.findResources('AWS::Cognito::UserPoolClient'))[0];
      expect(client.DependsOn).toContain(providerId);
    });

    test('should reject a non-https OIDC issuerUrl', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
            federation: { oidc: { issuerUrl: 'http://idp.example.com', clientId: 'c', clientSecret: 's' } },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/issuerUrl must be an https URL/);
    });

    test('should reject an OIDC provider missing its client ID', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
            federation: { oidc: { issuerUrl: 'https://idp.example.com', clientId: '', clientSecret: 's' } },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/requires both clientId and clientSecret/);
    });

    // Federated users sign in only through the hosted-UI Login/Authorize endpoints, so
    // without a hosted UI the provider would be created and unreachable.
    test('should reject federation without a hosted UI', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: { federation: { saml: { metadataUrl: SAML_METADATA_URL } } },
          naming: testApp.naming,
        }),
      ).toThrow(/cognito.federation requires cognito.hostedUi/);
    });

    test('should reject OIDC federation without a hosted UI', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            federation: { oidc: { issuerUrl: 'https://idp.example.com', clientId: 'c', clientSecret: 's' } },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/cognito.federation requires cognito.hostedUi/);
    });

    test('should reject both saml and oidc together', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
            federation: {
              saml: { metadataUrl: SAML_METADATA_URL },
              oidc: { issuerUrl: 'https://idp.example.com', clientId: 'c', clientSecret: 's' },
            },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/at most one of saml or oidc/);
    });

    test('should reject a non-https SAML metadata URL', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
            federation: { saml: { metadataUrl: 'http://idp.example.com/metadata' } },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/metadataUrl must be an https URL/);
    });

    test('should reject an OIDC provider missing its client secret', () => {
      expect(() =>
        createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
          cognitoConfig: {
            hostedUi: { callbackUrls: ['https://app.example.com/callback'] },
            federation: { oidc: { issuerUrl: 'https://idp.example.com', clientId: 'c', clientSecret: '' } },
          },
          naming: testApp.naming,
        }),
      ).toThrow(/requires both clientId and clientSecret/);
    });

    test('should create no identity provider when federation is omitted', () => {
      createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPoolIdentityProvider', 0);
    });
  });

  describe('returned authorizer values', () => {
    test('should compose a discovery URL that satisfies the AgentCore OIDC pattern', () => {
      const auth = createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      // The unresolved token still has to match, because the runtime validates the URL at
      // synth time — before the token resolves.
      expect(auth.discoveryUrl).toMatch(/^.+\/\.well-known\/openid-configuration$/);
      expect(auth.discoveryUrl).toContain('https://cognito-idp.test-region.amazonaws.com/');
    });

    test('should return the created pool, client, and audience', () => {
      const auth = createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: {},
        naming: testApp.naming,
      });

      expect(auth.userPool).toBeDefined();
      expect(auth.userPoolClient).toBeDefined();
      expect(auth.audience).toBe(auth.userPoolClient.userPoolClientId);
      expect(auth.userPoolDomain).toBeUndefined();
    });

    test('should return the domain when a hosted UI is configured', () => {
      const auth = createAgentcoreCognitoAuth(testApp.testStack, 'TestCognito', {
        cognitoConfig: { hostedUi: { callbackUrls: ['https://app.example.com/cb'] } },
        naming: testApp.naming,
      });

      expect(auth.userPoolDomain).toBeDefined();
    });
  });
});
