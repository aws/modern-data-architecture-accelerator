/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
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

    test('should add ECR repository permissions for containerUri', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'ecr-permissions-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'ecr-permissions-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Verify the managed policy contains ECR repository access permissions
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'ECRRepositoryAccess',
              Effect: 'Allow',
              Action: ['ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage'],
              Resource: 'arn:test-partition:ecr:us-east-1:123456789012:repository/my-runtime',
            }),
          ]),
        },
      });
    });

    test('should throw error for invalid containerUri format', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'invalid-uri-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: 'invalid-uri-format',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'invalid-uri-runtime-construct', constructProps);
      }).toThrow('Invalid ECR container URI format');
    });

    test('should throw error for containerUri without account', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-account-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: 'dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-account-runtime-construct', constructProps);
      }).toThrow('Invalid ECR container URI format');
    });

    test('should throw error for containerUri without region', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-region-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.amazonaws.com/my-repo:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-region-runtime-construct', constructProps);
      }).toThrow('Invalid ECR container URI format');
    });

    test('should throw error for containerUri without repository', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-repo-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-repo-runtime-construct', constructProps);
      }).toThrow('Invalid ECR container URI format');
    });

    test('should parse containerUri with different regions', () => {
      const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

      regions.forEach(region => {
        const testAppRegion = new MdaaTestApp();
        const roleHelperRegion = new MdaaRoleHelper(testAppRegion.testStack, testAppRegion.naming);

        const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
          agentRuntimeName: `runtime-${region}`,
          agentRuntimeArtifact: {
            containerConfiguration: {
              containerUri: `123456789012.dkr.ecr.${region}.amazonaws.com/my-repo:latest`,
            },
          },
          networkConfiguration: {
            securityGroups: ['sg-12345678'],
            subnets: ['subnet-12345678'],
          },
          naming: testAppRegion.naming,
          roleHelper: roleHelperRegion,
        };

        new BedrockAgentcoreRuntimeL3Construct(testAppRegion.testStack, `runtime-${region}-construct`, constructProps);
        const template = Template.fromStack(testAppRegion.testStack);

        // Verify the managed policy contains ECR repository access with correct region
        template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Sid: 'ECRRepositoryAccess',
                Resource: `arn:test-partition:ecr:${region}:123456789012:repository/my-repo`,
              }),
            ]),
          },
        });
      });
    });

    test('should parse containerUri with nested repository paths', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'nested-repo-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-org/my-team/my-repo:v1.0.0',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'nested-repo-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Verify the managed policy contains ECR repository access with nested path
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'ECRRepositoryAccess',
              Resource: 'arn:test-partition:ecr:us-east-1:123456789012:repository/my-org/my-team/my-repo',
            }),
          ]),
        },
      });
    });

    test('should parse containerUri without tag', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-tag-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-tag-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Verify the managed policy contains ECR repository access
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'ECRRepositoryAccess',
              Resource: 'arn:test-partition:ecr:us-east-1:123456789012:repository/my-repo',
            }),
          ]),
        },
      });
    });

    test('should parse containerUri with digest instead of tag', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'digest-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri:
              '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo@sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'digest-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // Verify the managed policy contains ECR repository access
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'ECRRepositoryAccess',
              Resource: 'arn:test-partition:ecr:us-east-1:123456789012:repository/my-repo',
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

      // Should not create a new execution role. The two roles present belong to the
      // always-on log-protection custom resource (its Lambda handler + CR provider),
      // not the runtime execution role.
      template.resourceCountIs('AWS::IAM::Role', 2);
    });

    test('should scope GetAgentAccessToken to the default workload-identity directory', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'workload-identity-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'workload-identity-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'GetAgentAccessToken',
              Effect: 'Allow',
              Action: [
                'bedrock-agentcore:GetWorkloadAccessToken',
                'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
                'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
              ],
              Resource: [
                'arn:test-partition:bedrock-agentcore:test-region:test-account:workload-identity-directory/default',
                'arn:test-partition:bedrock-agentcore:test-region:test-account:workload-identity-directory/default/workload-identity/*',
              ],
            }),
          ]),
        },
      });
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

  describe('Model ARN Scoping', () => {
    test('should use broad permissions when allowedModelArns is not provided', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'broad-model-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'broad-model-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockModelInvocation',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource: [
                'arn:test-partition:bedrock:*::foundation-model/*',
                'arn:test-partition:bedrock:test-region:test-account:*',
              ],
            }),
          ]),
        },
      });
    });

    test('should scope permissions to specific model ARNs when allowedModelArns is provided', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'scoped-model-runtime',
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
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'scoped-model-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockModelInvocation',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource: [
                'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6-20250514-v1:0',
                'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
              ],
            }),
          ]),
        },
      });
    });

    test('should support wildcard model ARN patterns', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'wildcard-model-runtime',
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
          'arn:aws:bedrock:us-east-1::foundation-model/anthropic.*',
          'arn:aws:bedrock:us-west-2::foundation-model/anthropic.*',
        ],
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'wildcard-model-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'BedrockModelInvocation',
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource: [
                'arn:aws:bedrock:us-east-1::foundation-model/anthropic.*',
                'arn:aws:bedrock:us-west-2::foundation-model/anthropic.*',
              ],
            }),
          ]),
        },
      });
    });

    test('should not affect role creation when allowedModelArns is provided with roleArn', () => {
      const existingRoleArn = 'arn:aws:iam::123456789012:role/existing-role';
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'existing-role-scoped-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        allowedModelArns: ['arn:aws:bedrock:us-east-1::foundation-model/anthropic.*'],
        roleArn: existingRoleArn,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(
        testApp.testStack,
        'existing-role-scoped-runtime-construct',
        constructProps,
      );
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        RoleArn: existingRoleArn,
      });

      // Should not create a new execution role - allowedModelArns only applies to created
      // roles. The two roles present belong to the always-on log-protection custom resource.
      template.resourceCountIs('AWS::IAM::Role', 2);
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

      // Should create SSM parameters for runtime (3) + role (3) + always-on log
      // protection: KMS key (2) + custom-resource Lambda handler (3)
      template.resourceCountIs('AWS::SSM::Parameter', 11);
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

      // Should create SSM parameters for runtime (3) + endpoint (2) + role (3) + always-on
      // log protection: KMS key (2) + custom-resource Lambda handler (3)
      template.resourceCountIs('AWS::SSM::Parameter', 13);
    });
  });

  describe('Protocol Configuration', () => {
    test('should create runtime with MCP protocol configuration', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'mcp-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        protocolConfiguration: 'MCP',
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'mcp-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        ProtocolConfiguration: 'MCP',
      });
    });

    test('should create runtime with HTTP protocol configuration', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'http-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        protocolConfiguration: 'HTTP',
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'http-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        ProtocolConfiguration: 'HTTP',
      });
    });

    test('should create runtime with A2A protocol configuration', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'a2a-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        protocolConfiguration: 'A2A',
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'a2a-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        ProtocolConfiguration: 'A2A',
      });
    });

    test('should not include ProtocolConfiguration when not provided', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-protocol-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-protocol-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::BedrockAgentCore::Runtime', {
        ProtocolConfiguration: Match.absent(),
      });
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

  describe('Enforce VPC Only', () => {
    test('should create resource policy with correct resourceArn and dependency on runtime', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'vpc-enforced-runtime',
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
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpc-enforced-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::BedrockAgentCore::ResourcePolicy', 1);

      // Verify the resource policy references the runtime ARN
      template.hasResourceProperties('AWS::BedrockAgentCore::ResourcePolicy', {
        ResourceArn: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*Runtime.*'), 'AgentRuntimeArn']),
        }),
      });

      // Verify the resource policy depends on the runtime resource
      const resources = template.toJSON().Resources;
      const policyLogicalId = Object.keys(resources).find(
        key => resources[key].Type === 'AWS::BedrockAgentCore::ResourcePolicy',
      );
      expect(policyLogicalId).toBeDefined();
      const policyResource = resources[policyLogicalId!];
      expect(policyResource.DependsOn).toBeDefined();

      const runtimeLogicalId = Object.keys(resources).find(
        key => resources[key].Type === 'AWS::BedrockAgentCore::Runtime',
      );
      expect(runtimeLogicalId).toBeDefined();
      expect(policyResource.DependsOn).toContain(runtimeLogicalId);
    });

    test('should not create resource policy when enforceVpcOnly is absent', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-enforce-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-enforce-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::BedrockAgentCore::ResourcePolicy', 0);
    });

    test('should not create resource policy when enforceVpcOnly is false', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'enforce-false-runtime',
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
        enforceVpcOnly: false,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'enforce-false-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::BedrockAgentCore::ResourcePolicy', 0);
    });

    test('should throw error when enforceVpcOnly is true but vpcId is missing', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'no-vpcid-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        enforceVpcOnly: true,
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-vpcid-runtime-construct', constructProps);
      }).toThrow('networkConfiguration.vpcId is required when enforceVpcOnly is true');
    });
  });

  describe('VPC Endpoint Creation', () => {
    const baseNetworkConfiguration: NetworkConfigurationProperty = {
      vpcId: 'vpc-0123456789abcdef0',
      securityGroups: ['sg-12345678'],
      subnets: ['subnet-12345678', 'subnet-87654321'],
    };

    const baseProps = {
      agentRuntimeName: 'vpce-runtime',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
        },
      },
    };

    test('should create AgentCore interface endpoint with Private DNS in the runtime subnets', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {},
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: 'com.amazonaws.test-region.bedrock-agentcore',
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
        SubnetIds: ['subnet-12345678', 'subnet-87654321'],
        VpcId: 'vpc-0123456789abcdef0',
      });
    });

    test('should restrict endpoint security group ingress to the runtime security groups on 443', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {},
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-sg-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        SourceSecurityGroupId: 'sg-12345678',
      });
    });

    test('should create supporting endpoints when configured', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: { createSupportingEndpoints: true },
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-supporting-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // AgentCore + ECR API + ECR Docker + STS + CloudWatch Logs
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
    });

    test('should not create VPC endpoint when vpcEndpoint is absent', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: baseNetworkConfiguration,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'no-vpce-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
    });

    test('should throw error when vpcEndpoint is configured but vpcId is missing', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
          vpcEndpoint: {},
        },
        naming: testApp.naming,
        roleHelper,
      };

      expect(() => {
        new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-no-vpcid-runtime-construct', constructProps);
      }).toThrow('networkConfiguration.vpcId is required when networkConfiguration.vpcEndpoint is configured');
    });

    test('should warn when enforceVpcOnly is enabled without endpoint creation', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: baseNetworkConfiguration,
        enforceVpcOnly: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'enforce-no-vpce-runtime-construct', constructProps);

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('.*enforceVpcOnly is enabled but networkConfiguration.vpcEndpoint is not configured.*'),
      );
      expect(warnings.length).toBeGreaterThan(0);
    });

    test('should not warn when enforceVpcOnly is enabled with endpoint creation', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {},
        },
        enforceVpcOnly: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'enforce-vpce-runtime-construct', constructProps);

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('.*enforceVpcOnly is enabled but networkConfiguration.vpcEndpoint is not configured.*'),
      );
      expect(warnings.length).toBe(0);
    });

    test('should restrict endpoint policy to configured IAM principals', () => {
      const callerRoleArn = 'arn:aws:iam::123456789012:role/my-caller-role';
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {
            endpointPolicy: {
              allowPrincipals: [callerRoleArn],
            },
          },
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-principals-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: Match.objectLike({
          Statement: [
            Match.objectLike({
              Sid: 'AgentCoreInvokeThroughEndpoint',
              Effect: 'Allow',
              Principal: {
                AWS: callerRoleArn,
              },
            }),
          ],
        }),
      });
      // The default wildcard principal must not be present when principals are restricted
      const endpoints = template.findResources('AWS::EC2::VPCEndpoint');
      Object.values(endpoints).forEach(endpoint => {
        const statements = endpoint.Properties.PolicyDocument?.Statement ?? [];
        statements.forEach((statement: { Principal: unknown }) => {
          expect(statement.Principal).not.toEqual('*');
        });
      });
    });

    test('should warn on wildcard endpoint principal for a SigV4 runtime', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {},
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-sigv4-warn-construct', constructProps);

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('.*allows any principal.*SigV4.*'),
      );
      expect(warnings.length).toBeGreaterThan(0);
    });

    test('should not warn on wildcard endpoint principal when a JWT authorizer is configured', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {},
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-jwt-nowarn-construct', constructProps);

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('.*allows any principal.*SigV4.*'),
      );
      expect(warnings.length).toBe(0);
    });

    test('should not warn when allowPrincipals is set on a SigV4 runtime', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {
            endpointPolicy: {
              allowPrincipals: ['arn:aws:iam::123456789012:role/my-caller-role'],
            },
          },
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-principals-nowarn-construct', constructProps);

      const warnings = Annotations.fromStack(testApp.testStack).findWarning(
        '*',
        Match.stringLikeRegexp('.*allows any principal.*SigV4.*'),
      );
      expect(warnings.length).toBe(0);
    });

    test('should create SSM parameter for the endpoint ID', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        ...baseProps,
        networkConfiguration: {
          ...baseNetworkConfiguration,
          vpcEndpoint: {},
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'vpce-ssm-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*vpc-endpoint.*agentcore.*id'),
      });
    });
  });

  describe('Log Encryption', () => {
    test('should always create KMS key and log protection custom resource', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'encrypted-log-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'encrypted-log-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::KMS::Key', 1);
      template.resourceCountIs('Custom::AgentCoreLogProtection', 1);

      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        runtimeId: Match.anyValue(),
        kmsKeyArn: Match.anyValue(),
      });
    });

    test('should pass retention days to custom resource', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'retention-runtime',
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
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'retention-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        retentionDays: '90',
      });
    });

    test('should add KMS key policy for CloudWatch Logs service', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'kms-policy-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'kms-policy-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowCloudWatchLogsEncryption',
              Effect: 'Allow',
              Action: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
              Principal: {
                Service: Match.stringLikeRegexp('logs\\..*\\.amazonaws\\.com'),
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Data Protection', () => {
    test('should always mask the built-in identifier floor even with no dataProtection config', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'dp-default-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'dp-default-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('Custom::AgentCoreLogProtection', 1);
      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        dataProtectionPolicy: Match.stringLikeRegexp(
          '.*EmailAddress.*CreditCardNumber.*Ssn-US.*Name.*Address.*PhoneNumber-US.*IpAddress.*',
        ),
        runtimeId: Match.anyValue(),
      });
    });

    test('should add additionalIdentifiers on top of the built-in floor', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'dp-custom-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        dataProtection: {
          additionalIdentifiers: ['DriversLicense-US', 'PassportNumber-US'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'dp-custom-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      // The built-in floor is still present...
      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        dataProtectionPolicy: Match.stringLikeRegexp(
          '.*EmailAddress.*CreditCardNumber.*Ssn-US.*Name.*Address.*PhoneNumber-US.*IpAddress.*',
        ),
      });
      // ...and the additional identifiers are layered on top.
      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        dataProtectionPolicy: Match.stringLikeRegexp('.*DriversLicense-US.*'),
      });
      template.hasResourceProperties('Custom::AgentCoreLogProtection', {
        dataProtectionPolicy: Match.stringLikeRegexp('.*PassportNumber-US.*'),
      });
    });

    test('should not duplicate an additionalIdentifier that is already in the built-in floor', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'dp-dedupe-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        dataProtection: {
          additionalIdentifiers: ['EmailAddress'],
        },
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'dp-dedupe-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      const resources = template.findResources('Custom::AgentCoreLogProtection');
      const policy = Object.values(resources)[0].Properties.dataProtectionPolicy as string;
      const emailMatches = policy.match(/EmailAddress/g) ?? [];
      // EmailAddress appears once per statement (audit + redact) = 2 occurrences,
      // not duplicated by the redundant additionalIdentifier.
      expect(emailMatches).toHaveLength(2);
    });
  });

  describe('Transaction Search Configuration', () => {
    test('should create TransactionSearchConfig by default', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'default-xray-runtime',
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

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'default-xray-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::XRay::TransactionSearchConfig', 1);
      template.hasResourceProperties('AWS::XRay::TransactionSearchConfig', {
        IndexingPercentage: 1,
      });
    });

    test('should create TransactionSearchConfig when explicitly enabled', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'enabled-xray-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        enableTransactionSearch: true,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'enabled-xray-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::XRay::TransactionSearchConfig', 1);
    });

    test('should not create TransactionSearchConfig when disabled', () => {
      const constructProps: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'disabled-xray-runtime',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        enableTransactionSearch: false,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'disabled-xray-runtime-construct', constructProps);
      const template = Template.fromStack(testApp.testStack);

      template.resourceCountIs('AWS::XRay::TransactionSearchConfig', 0);
    });

    test('should allow multiple runtimes in same stack when TransactionSearch disabled', () => {
      const constructProps1: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'multi-runtime-1',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-12345678'],
          subnets: ['subnet-12345678'],
        },
        enableTransactionSearch: false,
        naming: testApp.naming,
        roleHelper,
      };

      const constructProps2: BedrockAgentcoreRuntimeL3ConstructProps = {
        agentRuntimeName: 'multi-runtime-2',
        agentRuntimeArtifact: {
          containerConfiguration: {
            containerUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-runtime:latest',
          },
        },
        networkConfiguration: {
          securityGroups: ['sg-87654321'],
          subnets: ['subnet-87654321'],
        },
        enableTransactionSearch: false,
        naming: testApp.naming,
        roleHelper,
      };

      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'multi-runtime-1-construct', constructProps1);
      new BedrockAgentcoreRuntimeL3Construct(testApp.testStack, 'multi-runtime-2-construct', constructProps2);
      const template = Template.fromStack(testApp.testStack);

      // Should have 2 runtimes but no TransactionSearchConfig
      template.resourceCountIs('AWS::BedrockAgentCore::Runtime', 2);
      template.resourceCountIs('AWS::XRay::TransactionSearchConfig', 0);
    });
  });
});
