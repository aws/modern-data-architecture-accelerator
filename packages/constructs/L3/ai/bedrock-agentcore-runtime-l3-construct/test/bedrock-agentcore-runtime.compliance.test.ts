/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { BedrockAgentcoreRuntimeL3Construct, BedrockAgentcoreRuntimeL3ConstructProps } from '../lib';

describe('BedrockAgentcoreRuntimeL3Construct Compliance Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  test('should pass cdk-nag checks for basic runtime with VPC', () => {
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
      roleHelper,
    };

    new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'compliant-runtime-construct', constructProps);

    Aspects.of(testApp.testStack).add(new AwsSolutionsChecks({ verbose: true }));

    const errors = Annotations.fromStack(testApp.testStack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    expect(errors).toHaveLength(0);
  });

  test('should pass cdk-nag checks for runtime with VPC configuration', () => {
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
      roleHelper,
    };

    new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpc-compliant-runtime-construct', constructProps);

    Aspects.of(testApp.testStack).add(new AwsSolutionsChecks({ verbose: true }));

    const errors = Annotations.fromStack(testApp.testStack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    expect(errors).toHaveLength(0);
  });

  test('should pass cdk-nag checks for runtime with JWT authorizer', () => {
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
      roleHelper,
    };

    new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'jwt-compliant-runtime-construct', constructProps);

    Aspects.of(testApp.testStack).add(new AwsSolutionsChecks({ verbose: true }));

    const errors = Annotations.fromStack(testApp.testStack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    expect(errors).toHaveLength(0);
  });

  test('should pass cdk-nag checks for runtime with managed policies', () => {
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
      roleHelper,
    };

    new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'policy-compliant-runtime-construct', constructProps);

    Aspects.of(testApp.testStack).add(new AwsSolutionsChecks({ verbose: true }));

    const errors = Annotations.fromStack(testApp.testStack).findError('*', Match.stringLikeRegexp('AwsSolutions-.*'));

    expect(errors).toHaveLength(0);
  });
});
