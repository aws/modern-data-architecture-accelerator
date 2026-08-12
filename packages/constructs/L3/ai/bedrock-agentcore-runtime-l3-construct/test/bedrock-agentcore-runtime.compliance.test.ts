/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { BedrockAgentcoreRuntimeL3Construct, BedrockAgentcoreRuntimeL3ConstructProps } from '../lib';

describe('BedrockAgentcoreRuntimeL3Construct Compliance Tests', () => {
  describe('Basic runtime with VPC', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with multi-subnet VPC configuration', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'vpc-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678', 'subnet-87654321'],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'vpc-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with JWT authorizer', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'jwt-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      authorizerConfiguration: {
        customJwtAuthorizer: {
          discoveryUrl: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test/.well-known/openid-configuration',
          allowedAudience: ['client-id'],
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'jwt-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with allowedModelArns', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'model-scoped-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      allowedModelArns: [
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6-20250514-v1:0',
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
      ],
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'model-scoped-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with enforceVpcOnly', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'vpc-enforced-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        vpcId: 'vpc-0123456789abcdef0',
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      enforceVpcOnly: true,
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'vpc-enforced-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with VPC endpoint', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'vpce-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        vpcId: 'vpc-0123456789abcdef0',
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678', 'subnet-87654321'],
        vpcEndpoint: {},
      },
      enforceVpcOnly: true,
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'vpce-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with VPC endpoint, restricted principals, and supporting endpoints', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'vpce-full-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        vpcId: 'vpc-0123456789abcdef0',
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678', 'subnet-87654321'],
        vpcEndpoint: {
          endpointPolicy: {
            allowPrincipals: ['arn:aws:iam::123456789012:role/my-caller-role'],
          },
          createSupportingEndpoints: true,
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'vpce-full-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with additional data protection identifiers', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'encrypted-log-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      logRetentionDays: 90,
      dataProtection: {
        additionalIdentifiers: ['DriversLicense-US', 'PassportNumber-US'],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'encrypted-log-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with managed policies', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'policy-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      policies: [
        {
          policyArn: 'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess',
        },
      ],
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'policy-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with alarms and a created notification topic', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'alarm-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      alarms: {
        errorRateThreshold: 10,
        throttleCountThreshold: 100,
        createNotificationTopic: true,
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'alarm-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with EventBridge alerts', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'eventbridge-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      alarms: {
        throttleCountThreshold: 100,
        createNotificationTopic: true,
      },
      eventBridgeAlerts: {
        rules: {
          'auth-failure': {
            description: 'Denied AgentCore invocations',
            errorCodes: ['AccessDeniedException', 'UnauthorizedException'],
          },
          'config-change': {
            description: 'Out-of-band runtime configuration change',
            eventNames: ['UpdateAgentRuntime', 'DeleteAgentRuntime'],
            targetLambdaArn: 'arn:aws:lambda:test-region:test-account:function:agentcore-remediation',
          },
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'eventbridge-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });

  describe('Runtime with MDAA-managed Cognito authorizer', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
      agentRuntimeName: 'cognito-compliant-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
      networkConfiguration: {
        securityGroups: ['sg-12345678'],
        subnets: ['subnet-12345678'],
      },
      // The hosted UI is included so the nag rules also see the OAuth-enabled client and
      // the domain, not just the default OAuth-disabled client.
      authorizerConfiguration: {
        customJwtAuthorizer: {
          cognito: {
            hostedUi: {
              callbackUrls: ['https://app.example.com/callback'],
              cognitoDomainPrefix: 'compliance-agent-auth',
            },
          },
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new BedrockAgentcoreRuntimeL3Construct(stack, 'cognito-compliant-runtime-construct', constructProps);

    testApp.checkCdkNagCompliance(stack);
  });
});
