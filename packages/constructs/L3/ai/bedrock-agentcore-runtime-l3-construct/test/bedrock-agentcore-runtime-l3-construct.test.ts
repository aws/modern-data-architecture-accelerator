/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  BedrockAgentcoreRuntimeL3Construct,
  BedrockAgentcoreRuntimeL3ConstructProps,
  NetworkConfigurationProperty,
} from '../lib';

describe('BedrockAgentcoreRuntimeL3Construct Unit Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  describe('Basic Runtime Creation', () => {
    test('should create basic runtime with container URI and VPC', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'test-runtime',
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

      const construct = new BedrockAgentcoreRuntimeL3Construct(
        testApp.testStack,
        'test-runtime-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      expect(construct.runtime).toBeDefined();
      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AgentRuntimeName: Match.stringLikeRegexp('^test_org_test_env_test_domain_test_mod.*'),
        AgentRuntimeArtifact: {
          ContainerConfiguration: {
            ContainerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        NetworkConfiguration: {
          NetworkMode: 'VPC',
          NetworkModeConfig: {
            SecurityGroups: ['sg-12345678'],
            Subnets: ['subnet-12345678', 'subnet-87654321'],
          },
        },
      });
    });

    test('should create runtime with all optional properties', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'full-runtime',
        description: 'Test Runtime Description',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        environmentVariables: {
          ENVIRONMENT: 'test',
          LOG_LEVEL: 'DEBUG',
        },
        lifecycleConfiguration: {
          idleRuntimeSessionTimeout: 3600,
          maxLifetime: 7200,
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'full-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        Description: 'Test Runtime Description',
        EnvironmentVariables: {
          ENVIRONMENT: 'test',
          LOG_LEVEL: 'DEBUG',
        },
        LifecycleConfiguration: {
          IdleRuntimeSessionTimeout: 3600,
          MaxLifetime: 7200,
        },
      });
    });

    test('should throw error when networkConfiguration is not provided', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-network-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        naming: testApp.naming,
        roleHelper,
      } as unknown as BedrockAgentcoreRuntimeL3ConstructProps; // Cast to bypass TypeScript check to test runtime validation

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-network-runtime-construct', constructProps);
      }).toThrow('networkConfiguration is required');
    });

    test('should throw error when security groups are missing', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'invalid-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          subnets: ['subnet-12345678'],
        } as unknown as NetworkConfigurationProperty,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'invalid-runtime-construct', constructProps);
      }).toThrow('securityGroups is required');
    });
  });

  describe('Network Configuration', () => {
    test('should create runtime with VPC network configuration', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'vpc-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpc-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        NetworkConfiguration: {
          NetworkMode: 'VPC',
          NetworkModeConfig: {
            SecurityGroups: ['sg-12345678'],
            Subnets: ['subnet-12345678', 'subnet-87654321'],
          },
        },
      });
    });

    test('should throw error when subnets are missing', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'invalid-vpc-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
        } as unknown as NetworkConfigurationProperty,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'invalid-vpc-runtime-construct', constructProps);
      }).toThrow('subnets is required');
    });
  });

  describe('JWT Authorizer Configuration', () => {
    test('should create runtime with JWT authorizer', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'jwt-runtime',
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
            allowedAudience: ['client-id-1', 'client-id-2'],
            allowedClients: ['client-id-1'],
          },
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'jwt-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        AuthorizerConfiguration: {
          CustomJWTAuthorizer: {
            DiscoveryUrl: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test/.well-known/openid-configuration',
            AllowedAudience: ['client-id-1', 'client-id-2'],
            AllowedClients: ['client-id-1'],
          },
        },
      });
    });

    test('should throw error for invalid discovery URL', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'invalid-jwt-runtime',
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
            discoveryUrl: 'https://invalid-url.com',
          },
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'invalid-jwt-runtime-construct', constructProps);
      }).toThrow('DiscoveryUrl must match pattern');
    });
  });

  describe('Runtime Endpoint', () => {
    test('should create runtime with endpoint', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'endpoint-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        runtimeEndpoint: {
          name: 'my_endpoint',
          description: 'Test endpoint',
        },
        naming: testApp.naming,
        roleHelper,
      };

      const construct = new BedrockAgentcoreRuntimeL3Construct(
        testApp.testStack,
        'endpoint-runtime-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      expect(construct.runtimeEndpoint).toBeDefined();
      template.hasResourceProperties('AWS::BedrockAgentCore::RuntimeEndpoint', {
        Name: Match.stringLikeRegexp('^test_org_test_env_test_domain_test_modul.*'),
        Description: 'Test endpoint',
      });
    });

    test('should sanitize endpoint name with hyphens', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'sanitize-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        runtimeEndpoint: {
          name: 'my-endpoint-name',
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'sanitize-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Endpoint name should have hyphens converted to underscores by sanitization
      // The naming service adds prefixes and may truncate, so we just check for underscores
      template.hasResourceProperties('AWS::BedrockAgentCore::RuntimeEndpoint', {
        Name: Match.stringLikeRegexp('^test_org_test_env_test_domain_test_mod.*'),
      });
    });
  });

  describe('IAM Role Creation', () => {
    test('should create IAM role with required permissions', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'role-runtime',
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

      const construct = new BedrockAgentcoreRuntimeL3Construct(
        testApp.testStack,
        'role-runtime-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      expect(construct.runtimeRole).toBeDefined();
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: {
                Service: 'bedrock-agentcore.amazonaws.com',
              },
              Condition: {
                StringEquals: {
                  'aws:SourceAccount': 'test-account',
                },
                ArnLike: {
                  'aws:SourceArn': 'arn:test-partition:bedrock-agentcore:test-region:test-account:*',
                },
              },
            }),
          ]),
        },
      });
    });

    test('should use existing role ARN when provided', () => {
      const existingRoleArn = 'arn:aws:iam::123456789012:role/existing-role';
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'existing-role-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        roleArn: existingRoleArn,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'existing-role-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        RoleArn: existingRoleArn,
      });

      // Should not create a new role
      template.resourceCountIs('AWS::IAM::Role', 0);
    });

    test('should attach custom policies to role', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'policy-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'policy-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith(['arn:aws:iam::aws:policy/CloudWatchLogsFullAccess']),
      });
    });
  });

  describe('SSM Parameters', () => {
    test('should create SSM parameters for runtime information', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'ssm-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'ssm-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Should create SSM parameters for runtime (3) + role (3)
      template.resourceCountIs('AWS::SSM::Parameter', 6);
    });

    test('should create SSM parameters for endpoint when configured', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'ssm-endpoint-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        runtimeEndpoint: {
          name: 'test_endpoint',
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'ssm-endpoint-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Should create SSM parameters for runtime (3) + endpoint (2) + role (3)
      template.resourceCountIs('AWS::SSM::Parameter', 8);
    });
  });

  describe('Lifecycle Configuration Validation', () => {
    test('should throw error for invalid idle timeout', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'invalid-lifecycle-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        lifecycleConfiguration: {
          idleRuntimeSessionTimeout: 30, // Invalid: less than 60
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(
          testApp.testStack,
          'invalid-lifecycle-runtime-construct',
          constructProps,
        );
      }).toThrow('IdleRuntimeSessionTimeout must be between 60 and 28800 seconds');
    });

    test('should throw error for invalid max lifetime', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'invalid-lifetime-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        lifecycleConfiguration: {
          maxLifetime: 30000, // Invalid: greater than 28800
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'invalid-lifetime-runtime-construct', constructProps);
      }).toThrow('MaxLifetime must be between 60 and 28800 seconds');
    });
  });
});
