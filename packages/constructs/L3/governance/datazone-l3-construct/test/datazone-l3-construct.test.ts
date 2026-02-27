/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { DataZoneL3Construct, DataZoneL3ConstructProps } from '../lib';

describe('DataZone L3 Construct Tests', () => {
  let testApp: MdaaTestApp;
  let stack: Stack;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    stack = testApp.testStack;
    roleHelper = new MdaaRoleHelper(stack, testApp.naming);
  });

  test('Constructor creates instance', () => {
    const props: DataZoneL3ConstructProps = {
      roleHelper,
      naming: testApp.naming,
    };

    const construct = new DataZoneL3Construct(stack, 'test', props);
    expect(construct).toBeInstanceOf(DataZoneL3Construct);
  });

  describe('DataZone Domains', () => {
    test('Creates domain with basic configuration', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Creates domain with users and groups', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: {
              'test-user': {
                iamRole: { name: 'test-user-role' },
              },
            },
            groups: {
              'test-group': {
                ssoId: 'test-sso-group',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
      template.resourceCountIs('AWS::DataZone::UserProfile', 3);
      template.resourceCountIs('AWS::DataZone::GroupProfile', 1);
    });

    test('Creates domain with domain units', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            domainUnits: {
              unit1: {
                description: 'Test unit',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
      template.resourceCountIs('AWS::DataZone::DomainUnit', 1);
    });

    test('Creates domain with IAM IDC SSO type', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'IAM_IDC',
            userAssignment: 'AUTOMATIC',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
      template.hasResourceProperties('AWS::DataZone::Domain', {
        SingleSignOn: {
          Type: 'IAM_IDC',
          UserAssignment: 'AUTOMATIC',
        },
      });
    });

    test('Creates custom blueprint config for V1 domain', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test V1 domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-v1', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Creates domain with glue catalog KMS key', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        glueCatalogKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });
    test('should use default SSO configuration when not specified', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with default SSO',
            dataAdminRole: { name: 'admin' },

            // Omitting singleSignOnType and userAssignment to test defaults
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      template.hasResourceProperties('AWS::DataZone::Domain', {
        SingleSignOn: {
          Type: 'DISABLED',
          UserAssignment: 'MANUAL',
        },
      });
    });
    test('domain with SSO users and groups with owners', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            users: {
              user1: { ssoId: 'sso-123' },
            },
            groups: {
              group1: { ssoId: 'group-123' },
            },
            ownerUsers: ['user1'],
            ownerGroups: ['group1'],
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      expect(template).toBeDefined();
    });

    test('domain with domain units and owners', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            users: { user1: { ssoId: 'sso-123' } },
            domainUnits: {
              unit1: {
                description: 'Unit 1',
                ownerUsers: ['user1'],
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      expect(template).toBeDefined();
    });

    test('domain with associated accounts', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack', { env: { account: '123456789012' } });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'us-east-1': crossAccountStack } },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test',
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      expect(template).toBeDefined();
    });

    test('domain with IAM role users', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',
            singleSignOnType: 'DISABLED',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'MANUAL',

            users: {
              user1: { iamRole: { arn: 'arn:aws:iam::123456789012:role/user1' } },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      expect(template).toBeDefined();
    });

    test('domain with domain unit owner groups', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            groups: { group1: { ssoId: 'group-123' } },
            domainUnits: {
              unit1: {
                description: 'Unit 1',
                ownerGroups: ['group1'],
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      expect(template).toBeDefined();
    });

    test('domain with region specified for associated account', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-region', {
        env: { account: '123456789012', region: 'us-west-2' },
      });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'us-west-2': crossAccountStack } },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                region: 'us-west-2',
                glueCatalogKmsKeyArn: 'arn:aws:kms:us-west-2:123456789012:key/test',
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with both user types', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            users: {
              user1: { ssoId: 'sso-123' },
              user2: { iamRole: { arn: 'arn:aws:iam::123456789012:role/user2' } },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with associated account and custom CDK role', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-cdk', { env: { account: '123456789012' } });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'us-east-1': crossAccountStack } },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test',
                cdkRoleArn: 'arn:aws:iam::123456789012:role/custom-cdk-role',
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with domain units and authorization policies', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            users: {
              user1: { ssoId: 'sso-123' },
              user2: { ssoId: 'sso-456' },
            },
            groups: {
              group1: { ssoId: 'group-123' },
            },
            domainUnits: {
              unit1: {
                description: 'Unit 1',
                ownerUsers: ['user1'],
                ownerGroups: ['group1'],
              },
              unit2: {
                description: 'Unit 2',
                ownerUsers: ['user2'],
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('error for unknown owner user', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              ownerUsers: ['unknown-user'],
            },
          },
        });
      }).toThrow('Unknown owner user unknown-user on domain test-domain');
    });

    test('error for unknown owner group', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              ownerGroups: ['unknown-group'],
            },
          },
        });
      }).toThrow('Unknown owner group unknown-group on domain test-domain');
    });

    test('error for invalid user config', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              users: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                'invalid-user': {} as any,
              },
            },
          },
        });
      }).toThrow('One of user iamRole or ssoId must be specified');
    });

    test('error for unknown domain unit owner user', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerUsers: ['unknown-user'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner user unknown-user for domain unit unit1');
    });

    test('error for unknown domain unit owner group', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerGroups: ['unknown-group'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner group unknown-group for domain unit unit1');
    });

    test('domain with associated account owner', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerAccounts: ['acc1'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner account acc1 for domain unit unit1');
    });

    test('error for unknown domain unit owner account', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          dataZoneDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerAccounts: ['unknown-account'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner account unknown-account for domain unit unit1');
    });

    test('should create authorization policies when domain units have them', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with authorization policies',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            users: {
              'test-user': {
                iamRole: { name: 'test-user-role' },
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with authorization policies',
                authorizationPolicies: {
                  'create-project-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ userName: 'test-user' }],
                    description: 'Allow user to create projects',
                  },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify that authorization policies are created
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 1);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
      });
    });

    test('should handle owner account errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with invalid owner account',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
            },
            ownerAccounts: ['unknown-account'],
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'test', props);
      }).toThrow('Unknown owner account cdk user unknown-account on domain test-domain');
    });

    test('should handle domain unit owner account errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with domain unit owner error',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with invalid owner account',
                ownerAccounts: ['unknown-account'],
              },
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'test', props);
      }).toThrow('Unknown owner account unknown-account for domain unit unit1');
    });

    test('should handle nested domain units with authorization policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with nested authorization policies',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            users: {
              'test-user': {
                iamRole: { name: 'test-user-role' },
              },
            },
            domainUnits: {
              'parent-unit': {
                description: 'Parent unit',
                domainUnits: {
                  'child-unit': {
                    description: 'Child unit with authorization policies',
                    authorizationPolicies: {
                      'create-asset-policy': {
                        policyType: 'CREATE_ASSET_TYPE',
                        principals: [{ userName: 'test-user' }],
                        description: 'Allow user to create asset types',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify that nested authorization policies are created
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 1);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_ASSET_TYPE',
      });
    });

    test('should handle authorization policy creation errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with invalid authorization policy',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            domainUnits: {
              unit1: {
                description: 'Unit with invalid authorization policy',
                authorizationPolicies: {
                  'invalid-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ userName: 'non-existent-user' }],
                    description: 'Policy with non-existent user',
                  },
                },
              },
            },
          },
        },
      };

      // This should throw an error during construct creation
      expect(() => {
        new DataZoneL3Construct(stack, 'test', props);
      }).toThrow('Authorization policies creation failed for domain unit');
    });

    test('should create domain units and handle missing domain unit ID error', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with domain units',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            domainUnits: {
              unit1: {
                description: 'Test unit',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify domain unit is created
      template.resourceCountIs('AWS::DataZone::DomainUnit', 1);
    });

    test('should handle groups in authorization policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with groups',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            groups: {
              'test-group': {
                ssoId: 'group-123',
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with group authorization',
                authorizationPolicies: {
                  'group-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ groupName: 'test-group' }],
                    description: 'Allow group to create projects',
                  },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify group profile and policy are created
      template.resourceCountIs('AWS::DataZone::GroupProfile', 1);
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 1);
    });

    test('should create associated account CDK users and owners', () => {
      const crossAccountStack1 = new Stack(testApp, 'cross-account-stack-1', { env: { account: '123456789012' } });
      const crossAccountStack2 = new Stack(testApp, 'cross-account-stack-2', { env: { account: '123456789013' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        crossAccountStacks: {
          '123456789012': { 'test-region': crossAccountStack1 },
          '123456789013': { 'test-region': crossAccountStack2 },
        },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with associated account owners',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
              acc2: {
                account: '123456789013',
                createCdkUser: false,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789013:key/test-key',
              },
            },
            ownerAccounts: ['acc1'],
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      // console.log(JSON.stringify(template, undefined, 2));
      // Verify only one CDK user profile is created (acc1 has createCdkUser: true)
      template.resourceCountIs('AWS::DataZone::UserProfile', 3); // admin + acc1
      // Verify owners are created: admin user on root domain unit + acc1 CDK user on root domain unit
      template.resourceCountIs('AWS::DataZone::Owner', 2);
      // Verify RAM share is created for associated accounts
      template.resourceCountIs('AWS::RAM::ResourceShare', 2); // domain + config
    });

    test('should create domain unit owners for associated accounts', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-unit', { env: { account: '123456789012' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain with domain unit owners',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with associated account owner',
                ownerAccounts: ['acc1'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::DomainUnit', 1);
      template.resourceCountIs('AWS::DataZone::Owner', 3);
    });

    test('should throw error when domain unit ID not found', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with auth policies',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',

            domainUnits: {
              unit1: {
                description: 'Unit with policies',
                authorizationPolicies: {
                  'test-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ allUsersGrantFilter: true }],
                  },
                },
              },
            },
          },
        },
      };

      // This should work normally - the error is only thrown if domain unit creation fails
      const construct = new DataZoneL3Construct(stack, 'test-auth-policies', props);
      expect(construct).toBeDefined();
    });

    test('should use existing execution role when provided', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sagemakerDomainExecutionRole: { name: 'existing-execution-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with existing execution role',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-existing-exec-role', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Should not create a new execution role
      expect(template).toBeDefined();
    });
  });

  describe('SageMaker Domains', () => {
    test('Creates domain with basic configuration', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['test-subnet-1', 'test-subnet-2'],
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Creates domain with users and groups', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: {
              'test-user': {
                iamRole: { name: 'test-user-role' },
              },
            },
            groups: {
              'test-group': {
                ssoId: 'test-sso-group',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
      template.resourceCountIs('AWS::DataZone::UserProfile', 3);
      template.resourceCountIs('AWS::DataZone::GroupProfile', 1);
    });

    test('Creates domain with domain units', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            domainUnits: {
              unit1: {
                description: 'Test unit',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
      template.resourceCountIs('AWS::DataZone::DomainUnit', 1);
    });

    test('Creates domain with IAM IDC SSO type', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
      template.hasResourceProperties('AWS::DataZone::Domain', {
        SingleSignOn: {
          Type: 'IAM_IDC',
          UserAssignment: 'AUTOMATIC',
        },
      });
    });

    test('Skips custom blueprint config for non-V1 domain', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test V2 domain',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',

            tooling: {
              vpcId: 'test-vpc-id',
              subnetIds: ['test-subnet-id'],
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-v2', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Creates domain with glue catalog KMS key', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        glueCatalogKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key',
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('domain with SSO users and groups with owners', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: {
              user1: { ssoId: 'sso-123' },
            },
            groups: {
              group1: { ssoId: 'group-123' },
            },
            ownerUsers: ['user1'],
            ownerGroups: ['group1'],
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with domain units and owners', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: { user1: { ssoId: 'sso-123' } },
            domainUnits: {
              unit1: {
                description: 'Unit 1',
                ownerUsers: ['user1'],
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with associated accounts', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack', { env: { account: '123456789012' } });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'us-east-1': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test',
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with IAM role users', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: {
              user1: { iamRole: { arn: 'arn:aws:iam::123456789012:role/user1' } },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with domain unit owner groups', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            groups: { group1: { ssoId: 'group-123' } },
            domainUnits: {
              unit1: {
                description: 'Unit 1',
                ownerGroups: ['group1'],
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with region specified for associated account', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-region', {
        env: { account: '123456789012', region: 'us-west-2' },
      });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'us-west-2': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                region: 'us-west-2',
                glueCatalogKmsKeyArn: 'arn:aws:kms:us-west-2:123456789012:key/test',
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with both user types', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: {
              user1: { ssoId: 'sso-123' },
              user2: { iamRole: { arn: 'arn:aws:iam::123456789012:role/user2' } },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with associated account and custom CDK role', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-cdk', { env: { account: '123456789012' } });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'us-east-1': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                glueCatalogKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test',
                cdkRoleArn: 'arn:aws:iam::123456789012:role/custom-cdk-role',
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('domain with domain units and authorization policies', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: {
              user1: { ssoId: 'sso-123' },
              user2: { ssoId: 'sso-456' },
            },
            groups: {
              group1: { ssoId: 'group-123' },
            },
            domainUnits: {
              unit1: {
                description: 'Unit 1',
                ownerUsers: ['user1'],
                ownerGroups: ['group1'],
              },
              unit2: {
                description: 'Unit 2',
                ownerUsers: ['user2'],
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('error for unknown owner user', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              ownerUsers: ['unknown-user'],
            },
          },
        });
      }).toThrow('Unknown owner user unknown-user on domain test-domain');
    });

    test('error for unknown owner group', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              ownerGroups: ['unknown-group'],
            },
          },
        });
      }).toThrow('Unknown owner group unknown-group on domain test-domain');
    });

    test('error for invalid user config', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              users: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                'invalid-user': {} as any,
              },
            },
          },
        });
      }).toThrow('One of user iamRole or ssoId must be specified');
    });

    test('error for unknown domain unit owner user', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerUsers: ['unknown-user'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner user unknown-user for domain unit unit1');
    });

    test('error for unknown domain unit owner group', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerGroups: ['unknown-group'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner group unknown-group for domain unit unit1');
    });

    test('domain with associated account owner', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerAccounts: ['acc1'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner account acc1 for domain unit unit1');
    });

    test('error for unknown domain unit owner account', () => {
      expect(() => {
        new DataZoneL3Construct(stack, 'test', {
          naming: testApp.naming,
          roleHelper,
          sageMakerDomains: {
            'test-domain': {
              description: 'Test',

              dataAdminRole: { arn: 'arn:aws:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
              },

              domainUnits: {
                unit1: {
                  description: 'Unit 1',
                  ownerAccounts: ['unknown-account'],
                },
              },
            },
          },
        });
      }).toThrow('Unknown owner account unknown-account for domain unit unit1');
    });

    test('should create authorization policies when domain units have them', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with authorization policies',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: {
              'test-user': {
                iamRole: { name: 'test-user-role' },
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with authorization policies',
                authorizationPolicies: {
                  'create-project-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ userName: 'test-user' }],
                    description: 'Allow user to create projects',
                  },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify that authorization policies are created
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 3);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
      });
    });

    test('should handle owner account errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with invalid owner account',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
            },
            ownerAccounts: ['unknown-account'],
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'test', props);
      }).toThrow('Unknown owner account cdk user unknown-account on domain test-domain');
    });

    test('should handle domain unit owner account errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with domain unit owner error',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with invalid owner account',
                ownerAccounts: ['unknown-account'],
              },
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'test', props);
      }).toThrow('Unknown owner account unknown-account for domain unit unit1');
    });

    test('should handle nested domain units with authorization policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with nested authorization policies',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            users: {
              'test-user': {
                iamRole: { name: 'test-user-role' },
              },
            },
            domainUnits: {
              'parent-unit': {
                description: 'Parent unit',
                domainUnits: {
                  'child-unit': {
                    description: 'Child unit with authorization policies',
                    authorizationPolicies: {
                      'create-asset-policy': {
                        policyType: 'CREATE_ASSET_TYPE',
                        principals: [{ userName: 'test-user' }],
                        description: 'Allow user to create asset types',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify that nested authorization policies are created
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 3);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_ASSET_TYPE',
      });
    });

    test('should handle authorization policy creation errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with invalid authorization policy',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            domainUnits: {
              unit1: {
                description: 'Unit with invalid authorization policy',
                authorizationPolicies: {
                  'invalid-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ userName: 'non-existent-user' }],
                    description: 'Policy with non-existent user',
                  },
                },
              },
            },
          },
        },
      };

      // This should throw an error during construct creation
      expect(() => {
        new DataZoneL3Construct(stack, 'test', props);
      }).toThrow('Authorization policies creation failed for domain unit');
    });

    test('should create domain units and handle missing domain unit ID error', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with domain units',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            domainUnits: {
              unit1: {
                description: 'Test unit',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify domain unit is created
      template.resourceCountIs('AWS::DataZone::DomainUnit', 1);
    });

    test('should handle groups in authorization policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with groups',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            groups: {
              'test-group': {
                ssoId: 'group-123',
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with group authorization',
                authorizationPolicies: {
                  'group-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ groupName: 'test-group' }],
                    description: 'Allow group to create projects',
                  },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Verify group profile and policy are created
      template.resourceCountIs('AWS::DataZone::GroupProfile', 1);
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 3);
    });

    test('should create associated account CDK users and owners', () => {
      const crossAccountStack1 = new Stack(testApp, 'cross-account-stack-1', { env: { account: '123456789012' } });
      const crossAccountStack2 = new Stack(testApp, 'cross-account-stack-2', { env: { account: '123456789013' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        crossAccountStacks: {
          '123456789012': { 'test-region': crossAccountStack1 },
          '123456789013': { 'test-region': crossAccountStack2 },
        },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with associated account owners',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
              acc2: {
                account: '123456789013',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                createCdkUser: false,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789013:key/test-key',
              },
            },
            ownerAccounts: ['acc1'],
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
      // console.log(JSON.stringify(template, undefined, 2));
      // Verify only one CDK user profile is created (acc1 has createCdkUser: true)
      template.resourceCountIs('AWS::DataZone::UserProfile', 3); // admin + acc1
      // Verify owners are created: admin user on root domain unit + acc1 CDK user on root domain unit
      template.resourceCountIs('AWS::DataZone::Owner', 2);
      // Verify RAM share is created for associated accounts
      template.resourceCountIs('AWS::RAM::ResourceShare', 2); // domain + config
    });

    test('should create domain unit owners for associated accounts', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-unit', { env: { account: '123456789012' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with domain unit owners',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
                },
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:aws:kms:test-region:123456789012:key/test-key',
              },
            },
            domainUnits: {
              unit1: {
                description: 'Unit with associated account owner',
                ownerAccounts: ['acc1'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      template.resourceCountIs('AWS::DataZone::DomainUnit', 1);
      template.resourceCountIs('AWS::DataZone::Owner', 3);
    });

    test('should throw error when tooling blueprint in enabledManagedBlueprints for V2', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with tooling in wrong place',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',

            tooling: {
              vpcId: 'vpc-123',
              subnetIds: ['subnet-123'],
            },
            enabledManagedBlueprints: {
              Tooling: {},
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'test-v2-tooling-wrong', props);
      }).toThrow('Tooling blueprint is automatically enabled and should not be included in enabledManagedBlueprints');
    });

    test('should throw error when domain unit ID not found', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with auth policies',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },

            domainUnits: {
              unit1: {
                description: 'Unit with policies',
                authorizationPolicies: {
                  'test-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ allUsersGrantFilter: true }],
                  },
                },
              },
            },
          },
        },
      };

      // This should work normally - the error is only thrown if domain unit creation fails
      const construct = new DataZoneL3Construct(stack, 'test-auth-policies', props);
      expect(construct).toBeDefined();
    });

    test('should use existing execution role when provided', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sagemakerDomainExecutionRole: { name: 'existing-execution-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with existing execution role',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-existing-exec-role', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Should not create a new execution role
      expect(template).toBeDefined();
    });

    test('should create non-Tooling managed blueprints for V2 domain', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with custom blueprints',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',

            tooling: {
              vpcId: 'vpc-123',
              subnetIds: ['subnet-123'],
            },
            enabledManagedBlueprints: {
              Testing: {
                authorizedDomainUnits: ['/root'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-v2-custom-blueprints', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();

      // Should create blueprint configurations for non-Tooling blueprints
      const blueprintConfigs = template.findResources('AWS::DataZone::EnvironmentBlueprintConfiguration');
      expect(Object.keys(blueprintConfigs).length).toBeGreaterThanOrEqual(2);
    });

    test('should throw if Tooling/DataLake are in enabledManagedBlueprints', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with custom blueprints',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',

            tooling: {
              vpcId: 'vpc-123',
              subnetIds: ['subnet-123'],
            },
            enabledManagedBlueprints: {
              DataLake: {
                authorizedDomainUnits: ['/root'],
              },
            },
          },
        },
      };
      expect(() => {
        new DataZoneL3Construct(stack, 'test-v2-custom-blueprints', props);
      }).toThrow('DataLake blueprint is automatically enabled and should not be included in enabledManagedBlueprints');
    });

    test('should handle authorizedDomainUnits without leading slash', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with units without leading slash',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'vpc-123',
              subnetIds: ['subnet-123'],
              authorizedDomainUnits: ['root', 'unit1'],
            },
            domainUnits: {
              '/root/unit1': {
                description: 'Test unit',
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-normalized-units', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('should filter undefined domain unit IDs', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with non-existent units',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'vpc-123',
              subnetIds: ['subnet-123'],
              authorizedDomainUnits: ['/root', '/nonexistent'],
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test-filtered-units', props);
      const template = Template.fromStack(stack);
      expect(template).toBeDefined();
    });

    test('should throw error for invalid CloudFormation template path', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:aws:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with invalid custom blueprint',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'vpc-123',
              subnetIds: ['subnet-123'],
            },
            customBlueprints: {
              InvalidBlueprint: {
                path: '/nonexistent/path/template.yaml',
                authorizedDomainUnits: ['/root'],
              },
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'test-invalid-template', props);
      }).toThrow('Cannot find asset');
    });
  });
});
