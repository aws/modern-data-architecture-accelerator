/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  AuthorizerConfigurationProperty,
  BedrockAgentcoreRuntimeL3Construct,
  BedrockAgentcoreRuntimeL3ConstructProps,
} from '../lib';

const USER_DISCOVERY_URL =
  'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXISTING/.well-known/openid-configuration';

/**
 * Covers the Runtime's composition of the MDAA-managed Cognito IdP: that the pool is
 * created only on the `cognito` path, and that the authorizer the runtime receives is
 * wired to it without the user supplying a discovery URL or audience.
 */
describe('BedrockAgentcoreRuntimeL3Construct Cognito authorizer', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  function buildConstruct(
    authorizerConfiguration?: AuthorizerConfigurationProperty,
  ): BedrockAgentcoreRuntimeL3Construct {
    const props: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'cognito-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      authorizerConfiguration,
      naming: testApp.naming,
      roleHelper,
    };
    return new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'cognito-runtime-construct', props);
  }

  /** The `Name` of every SSM parameter in the synthesized stack. */
  function ssmParameterNames(): string[] {
    return Object.values(Template.fromStack(testApp.testStack).findResources('AWS::SSM::Parameter')).map(
      param => param.Properties.Name as string,
    );
  }

  describe('cognito path', () => {
    test('should create a user pool and client from an empty cognito block', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });

    test('should wire the runtime authorizer to the created pool and client', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      const template = Template.fromStack(testApp.testStack);
      const poolId = Object.keys(template.findResources('AWS::Cognito::UserPool'))[0];
      const clientId = Object.keys(template.findResources('AWS::Cognito::UserPoolClient'))[0];

      // The discovery URL renders as a Join around the pool's Ref, which is what lets the
      // runtime consume the pool in the same stack with no SSM indirection.
      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AuthorizerConfiguration: {
          CustomJWTAuthorizer: {
            DiscoveryUrl: {
              'Fn::Join': [
                '',
                [
                  'https://cognito-idp.test-region.amazonaws.com/',
                  { Ref: poolId },
                  '/.well-known/openid-configuration',
                ],
              ],
            },
            AllowedAudience: [{ Ref: clientId }],
          },
        },
      });
    });

    test('should not set AllowedClients, which would AND with AllowedAudience', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      const runtime = Object.values(
        Template.fromStack(testApp.testStack).findResources('AWS::BedrockAgentCore::Runtime'),
      )[0];
      expect(runtime.Properties.AuthorizerConfiguration.CustomJWTAuthorizer.AllowedClients).toBeUndefined();
    });

    test('should append user-supplied audiences after the created client', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {}, allowedAudience: ['extra-audience'] } });

      const template = Template.fromStack(testApp.testStack);
      const clientId = Object.keys(template.findResources('AWS::Cognito::UserPoolClient'))[0];
      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AuthorizerConfiguration: {
          CustomJWTAuthorizer: { AllowedAudience: [{ Ref: clientId }, 'extra-audience'] },
        },
      });
    });

    test('should apply the agentic token defaults to the created client', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        IdTokenValidity: 15,
        AccessTokenValidity: 15,
        AllowedOAuthFlowsUserPoolClient: false,
      });
    });

    test('should pass configuration through to the pool', () => {
      buildConstruct({
        customJwtAuthorizer: { cognito: { idTokenValidityMinutes: 30, mfa: 'required', removalPolicy: 'retain' } },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', { IdTokenValidity: 30 });
      template.hasResource('AWS::Cognito::UserPool', {
        Properties: Match.objectLike({ MfaConfiguration: 'ON' }),
        DeletionPolicy: 'Retain',
      });
    });

    test('should expose the created resources on the construct', () => {
      const construct = buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      expect(construct.cognitoAuth).toBeDefined();
      expect(construct.cognitoAuth?.userPool).toBeDefined();
      expect(construct.cognitoAuth?.userPoolClient).toBeDefined();
    });

    test('should publish the pool identifiers as SSM parameters', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      const paramNames = ssmParameterNames();
      expect(paramNames).toEqual(
        expect.arrayContaining([
          expect.stringContaining('cognito/cognito-runtime/user-pool-id'),
          expect.stringContaining('cognito/cognito-runtime/client-id'),
          expect.stringContaining('cognito/cognito-runtime/discovery-url'),
        ]),
      );
    });

    // Names alone would still pass if the values were swapped or mis-mapped, so pin each
    // parameter to its source.
    test('should publish the correct value in each pool parameter', () => {
      buildConstruct({ customJwtAuthorizer: { cognito: {} } });

      const template = Template.fromStack(testApp.testStack);
      const poolId = Object.keys(template.findResources('AWS::Cognito::UserPool'))[0];
      const clientId = Object.keys(template.findResources('AWS::Cognito::UserPoolClient'))[0];
      const valueBySuffix = Object.fromEntries(
        Object.values(template.findResources('AWS::SSM::Parameter'))
          .map(param => param.Properties as { Name: string; Value: unknown })
          .filter(props => typeof props.Name === 'string' && props.Name.includes('/cognito/'))
          .map(props => [props.Name.split('/').pop(), props.Value]),
      );

      expect(valueBySuffix['user-pool-id']).toEqual({ Ref: poolId });
      expect(valueBySuffix['client-id']).toEqual({ Ref: clientId });
      expect(valueBySuffix['discovery-url']).toEqual({
        'Fn::Join': [
          '',
          ['https://cognito-idp.test-region.amazonaws.com/', { Ref: poolId }, '/.well-known/openid-configuration'],
        ],
      });
    });

    test('should publish the domain parameter only when a hosted UI is configured', () => {
      buildConstruct({
        customJwtAuthorizer: { cognito: { hostedUi: { callbackUrls: ['https://app.example.com/cb'] } } },
      });

      const paramNames = ssmParameterNames();
      expect(paramNames).toEqual(expect.arrayContaining([expect.stringContaining('cognito/cognito-runtime/domain')]));
    });

    test('should work through the deprecated jwtAuthorizer alias', () => {
      buildConstruct({ jwtAuthorizer: { cognito: {} } });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
    });
  });

  describe('discoveryUrl path', () => {
    test('should create no Cognito resources and use the supplied URL', () => {
      buildConstruct({
        customJwtAuthorizer: { discoveryUrl: USER_DISCOVERY_URL, allowedAudience: ['my-existing-client-id'] },
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPool', 0);
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 0);
      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AuthorizerConfiguration: {
          CustomJWTAuthorizer: {
            DiscoveryUrl: USER_DISCOVERY_URL,
            AllowedAudience: ['my-existing-client-id'],
          },
        },
      });
    });

    test('should still support allowedClients for access-token callers', () => {
      buildConstruct({
        customJwtAuthorizer: { discoveryUrl: USER_DISCOVERY_URL, allowedClients: ['my-client'] },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AuthorizerConfiguration: { CustomJWTAuthorizer: { AllowedClients: ['my-client'] } },
      });
    });
  });

  describe('AWS IAM path', () => {
    test('should create no Cognito resources when no authorizer is configured', () => {
      buildConstruct(undefined);

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPool', 0);
    });
  });

  describe('XOR validation', () => {
    test('should fail synth when both discoveryUrl and cognito are configured', () => {
      expect(() => buildConstruct({ customJwtAuthorizer: { discoveryUrl: USER_DISCOVERY_URL, cognito: {} } })).toThrow(
        /accepts either discoveryUrl or cognito, not both/,
      );
    });

    test('should fail synth when neither is configured', () => {
      expect(() => buildConstruct({ customJwtAuthorizer: {} })).toThrow(
        /requires exactly one of discoveryUrl or cognito/,
      );
    });

    // The pool must not be created before the conflict is detected, or a rejected config
    // would still leave Cognito resources in the template.
    test('should reject a conflicting config before creating any pool', () => {
      expect(() =>
        buildConstruct({ customJwtAuthorizer: { discoveryUrl: USER_DISCOVERY_URL, cognito: {} } }),
      ).toThrow();
      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('AWS::Cognito::UserPool', 0);
    });
  });
});
