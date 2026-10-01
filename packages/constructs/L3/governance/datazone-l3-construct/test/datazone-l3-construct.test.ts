/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { DataZoneL3Construct, DataZoneL3ConstructProps } from '../lib';

interface OwnerResource {
  Type: string;
  DependsOn?: string[];
  Properties: { EntityIdentifier?: unknown };
}

/**
 * Asserts the `AWS::DataZone::Owner` serialization invariants:
 *  - owners are grouped by their target domain unit (EntityIdentifier);
 *  - within each group the owners form a single linear DependsOn chain
 *    (exactly one head, every other owner depends on exactly one predecessor,
 *    and no owner is depended on by more than one successor);
 *  - the data-admin root owner is part of its group's chain — never a second,
 *    un-serialized writer on the root domain unit (the original race).
 */
function assertOwnersChainedPerEntity(template: Template): void {
  const json = template.toJSON() as { Resources: Record<string, OwnerResource> };
  const owners = Object.entries(json.Resources).filter(([, res]) => res.Type === 'AWS::DataZone::Owner');
  const ownerIds = new Set(owners.map(([id]) => id));
  expect(owners.length).toBeGreaterThan(1);

  // Group owner logical ids by their target entity (domain unit).
  const groups = new Map<string, string[]>();
  for (const [id, res] of owners) {
    const key = JSON.stringify(res.Properties.EntityIdentifier);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(id);
  }

  const ownerDeps = (id: string): string[] => (json.Resources[id].DependsOn ?? []).filter(dep => ownerIds.has(dep));

  // Every owner-to-owner dependency must stay within a single entity group —
  // cross-entity chaining would needlessly serialize independent domain units.
  const groupOf = new Map<string, string>();
  for (const [key, ids] of groups) ids.forEach(id => groupOf.set(id, key));

  for (const [key, ids] of groups) {
    // In-degree: how many owners depend on each owner (within the group).
    const inDegree = new Map<string, number>(ids.map(id => [id, 0]));
    let edges = 0;
    for (const id of ids) {
      const deps = ownerDeps(id);
      expect(deps.length).toBeLessThanOrEqual(1); // out-degree ≤ 1
      deps.forEach(dep => {
        expect(groupOf.get(dep)).toBe(key); // dependency stays in this group
        inDegree.set(dep, (inDegree.get(dep) ?? 0) + 1);
        edges += 1;
      });
    }
    // Single linear path: N owners → N-1 edges, exactly one head, in-degree ≤ 1.
    expect(edges).toBe(ids.length - 1);
    const heads = ids.filter(id => ownerDeps(id).length === 0);
    expect(heads).toHaveLength(1);
    ids.forEach(id => expect(inDegree.get(id)).toBeLessThanOrEqual(1));
  }

  // Regression: the data-admin root owner (created inside DataZoneDomainConstruct)
  // must be part of a multi-owner chain, not an isolated writer.
  const dataAdminRootOwnerId = [...ownerIds].find(
    id => id.includes('owneruserdataadmin') && !id.includes('domainunit'),
  );
  expect(dataAdminRootOwnerId).toBeDefined();
  const rootGroupKey = groupOf.get(dataAdminRootOwnerId!)!;
  const rootGroup = groups.get(rootGroupKey)!;
  if (rootGroup.length > 1) {
    const isConnected =
      ownerDeps(dataAdminRootOwnerId!).length > 0 ||
      rootGroup.some(id => ownerDeps(id).includes(dataAdminRootOwnerId!));
    expect(isConnected).toBe(true);
  }
}

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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

      // Verify owners are chained sequentially via DependsOn to avoid the
      // DataZone DynamoDB transaction race that produces ConditionalCheckFailed.
      // The chain is per target domain unit: owners on the same entity are
      // serialized, owners on different entities stay parallel.
      assertOwnersChainedPerEntity(template);
    });

    test('domain with domain units and owners', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test',
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
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'MANUAL',

            users: {
              user1: { iamRole: { arn: 'arn:test-partition:iam::123456789012:role/user1' } },
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                region: 'us-west-2',
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:us-west-2:123456789012:key/test',
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            users: {
              user1: { ssoId: 'sso-123' },
              user2: { iamRole: { arn: 'arn:test-partition:iam::123456789012:role/user2' } },
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
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        dataZoneDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test',
                cdkRoleArn: 'arn:test-partition:iam::123456789012:role/custom-cdk-role',
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
      // 2 from the domain unit policy + 3 from cfn-exec (1) and data-admin (2) root auths
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 6);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
      });
    });

    test('should handle owner account errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
      // 2 from the child domain unit policy + 3 from cfn-exec (1) and data-admin (2) root auths
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 6);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_ASSET_TYPE',
      });
    });

    test('should handle authorization policy creation errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
      // 2 from the domain unit policy + 3 from cfn-exec (1) and data-admin (2) root auths
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 6);
    });

    test('should create associated account CDK users and owners', () => {
      const crossAccountStack1 = new Stack(testApp, 'cross-account-stack-1', { env: { account: '123456789012' } });
      const crossAccountStack2 = new Stack(testApp, 'cross-account-stack-2', { env: { account: '123456789013' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
              },
              acc2: {
                account: '123456789013',
                createCdkUser: false,
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789013:key/test-key',
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

      // Verify RAM share Name uses RAM_RESOURCE_SHARE resource type
      const ramResourceName = testApp.naming.withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE).resourceName();
      const ramConfigResourceName = testApp.naming
        .withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE)
        .resourceName('domain-config-ssm-test-domain');
      // Domain RAM share Name is a Fn::Join because it embeds the domain.attrId token
      template.hasResourceProperties('AWS::RAM::ResourceShare', {
        Name: {
          'Fn::Join': ['', Match.arrayWith([`DataZone-${ramResourceName}-`])],
        },
      });
      // Config RAM share Name is a resolved literal
      template.hasResourceProperties('AWS::RAM::ResourceShare', {
        Name: ramConfigResourceName,
      });

      // Verify IAM managed policies use IAM_POLICY resource type in their names
      const kmsUsePolicyName = testApp.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('domain-kms-use-test-domain');
      const kmsAdminPolicyName = testApp.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('domain-kms-admin-test-domain');
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: kmsUsePolicyName,
      });
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: kmsAdminPolicyName,
      });

      // Verify custom resource role uses IAM_ROLE resource type
      const customResourceRoleName = testApp.naming
        .withResourceType(MdaaResourceType.IAM_ROLE)
        .resourceName('test-domain-custom-resource', 64);
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: customResourceRoleName,
      });
    });

    test('should create domain unit owners for associated accounts', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-unit', { env: { account: '123456789012' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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

    test('authorizations.projectCreators creates CREATE_PROJECT policy for V1', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with projectCreators',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            authorizations: {
              projectCreators: {
                users: ['test-user'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // V1 domains should get CREATE_PROJECT, not CREATE_PROJECT_FROM_PROJECT_PROFILE
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
      });
    });

    test('authorizations.eligibleProjectMembers creates ADD_TO_PROJECT_MEMBER_POOL policy', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with eligibleProjectMembers',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            authorizations: {
              eligibleProjectMembers: {
                users: ['test-user'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL',
      });
    });

    test('authorizations.eligibleProjectMembers.all creates allUsersGrantFilter policy', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with eligibleProjectMembers all',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            authorizations: {
              eligibleProjectMembers: {
                all: true,
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL',
        Principal: {
          User: {
            AllUsersGrantFilter: {},
          },
        },
      });
    });

    test('authorizations.domainUnitCreators creates CREATE_DOMAIN_UNIT policy', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with domainUnitCreators',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            authorizations: {
              domainUnitCreators: {
                users: ['test-user'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_DOMAIN_UNIT',
      });
    });

    test('authorizations.glossaryCreators creates CREATE_GLOSSARY policy', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with glossaryCreators',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            authorizations: {
              glossaryCreators: {
                users: ['test-user'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_GLOSSARY',
      });
    });

    test('authorizations.environmentCreators creates CREATE_ENVIRONMENT policy', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with environmentCreators',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            groups: { 'test-group': { ssoId: 'group-123' } },
            authorizations: {
              environmentCreators: {
                groups: ['test-group'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_ENVIRONMENT',
      });
    });

    test('authorizations with multiple fields creates all corresponding policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with multiple authorizations',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            groups: { 'test-group': { ssoId: 'group-123' } },
            authorizations: {
              projectCreators: { users: ['test-user'] },
              eligibleProjectMembers: { all: true },
              domainUnitCreators: { groups: ['test-group'] },
              glossaryCreators: { users: ['test-user'] },
              environmentCreators: { groups: ['test-group'] },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // 5 from authorizations + 3 from cfn-exec (1) and data-admin (2) root auths + 1 from custom-resource-role-auth
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 10);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_PROJECT' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_DOMAIN_UNIT' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_GLOSSARY' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_ENVIRONMENT' });
    });

    test('custom-resource role is granted datazone form type management actions', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain for form type authorization',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // The custom-resource role's managed policy must allow the DataZone form type
      // management actions used by the create_form_type custom resource. These actions
      // do not support resource-level permissions, so the statement is scoped to '*'.
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith(['datazone:CreateFormType', 'datazone:DeleteFormType', 'datazone:GetFormType']),
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('custom-resource role gets a CREATE_FORM_TYPE grant scoped to project owners', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain for form type authorization',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // DataZone gates CreateFormType on a CREATE_FORM_TYPE domain-unit grant whose
      // principal is a project grant filter (project OWNERs), not a specific user.
      // includeChildDomainUnits is true so projects in child domain units can create forms.
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_FORM_TYPE',
        EntityType: 'DOMAIN_UNIT',
        Principal: {
          Project: {
            ProjectDesignation: 'OWNER',
            ProjectGrantFilter: {
              DomainUnitFilter: Match.objectLike({ IncludeChildDomainUnits: true }),
            },
          },
        },
        Detail: {
          CreateFormType: { IncludeChildDomainUnits: true },
        },
      });
    });

    test('authorizations on domain unit creates policies on that unit', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with domain unit authorizations',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            domainUnits: {
              unit1: {
                description: 'Unit with authorizations',
                authorizations: {
                  projectCreators: { users: ['test-user'] },
                  eligibleProjectMembers: { all: true },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_PROJECT' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL' });
    });

    test('authorizations on nested domain unit creates policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with nested unit authorizations',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            domainUnits: {
              parent: {
                description: 'Parent unit',
                domainUnits: {
                  child: {
                    description: 'Child unit with authorizations',
                    authorizations: {
                      glossaryCreators: { users: ['test-user'] },
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

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_GLOSSARY' });
    });

    test('empty authorizations object does not create extra policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with empty authorizations',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            authorizations: {},
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // Only cfn-exec (1) + data-admin (2) + custom-resource-role-auth (1) = 4
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 5);
    });

    test('cdkRoleArn overrides the default cfn-exec role ARN in authorization policies', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with custom cdkRoleArn',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            cdkRoleArn: 'arn:test-partition:iam::123456789012:role/custom-cdk-role',
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
        Principal: {
          User: {
            UserIdentifier: 'arn:test-partition:iam::123456789012:role/custom-cdk-role',
          },
        },
      });
    });

    test('authorizations with userIdentifiers creates policies with direct user identifiers', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with userIdentifiers',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            authorizations: {
              projectCreators: {
                userIdentifiers: { 'direct-user': 'arn:test-partition:iam::123456789012:role/direct-role' },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
        Principal: {
          User: {
            UserIdentifier: 'arn:test-partition:iam::123456789012:role/direct-role',
          },
        },
      });
    });

    test('authorizations with groupsIdentifiers creates policies with direct group identifiers', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        dataZoneDomains: {
          'test-domain': {
            description: 'Domain with groupsIdentifiers',
            dataAdminRole: { name: 'admin' },
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            authorizations: {
              domainUnitCreators: {
                groupsIdentifiers: { 'direct-group': 'group-id-direct' },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_DOMAIN_UNIT',
        Principal: {
          Group: {
            GroupIdentifier: 'group-id-direct',
          },
        },
      });
    });
  });

  describe('SageMaker Domains', () => {
    test('Creates domain with basic configuration', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

      // Verify owners are chained per target domain unit via DependsOn
      // (SageMaker V2 path).
      assertOwnersChainedPerEntity(template);
    });

    test('domain with domain units and owners', () => {
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test',
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            users: {
              user1: { iamRole: { arn: 'arn:test-partition:iam::123456789012:role/user1' } },
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
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                region: 'us-west-2',
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:us-west-2:123456789012:key/test',
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
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            users: {
              user1: { ssoId: 'sso-123' },
              user2: { iamRole: { arn: 'arn:test-partition:iam::123456789012:role/user2' } },
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
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test',

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test',
                cdkRoleArn: 'arn:test-partition:iam::123456789012:role/custom-cdk-role',
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

            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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

              dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
              userAssignment: 'AUTOMATIC',
              tooling: {
                vpcId: 'test-vpc',
                subnetIds: ['subnet-id-1', 'subnet-id2'],
                provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with authorization policies',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
      // 2 from the domain unit policy + 2 from data-admin (2) root auths + 1 custom-resource-role-auth + 1 Tooling blueprint auth
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 7);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT',
      });
    });

    test('should handle owner account errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with invalid owner account',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with domain unit owner error',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                createCdkUser: true,
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with nested authorization policies',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
      // 2 from the child domain unit policy + 2 from data-admin (2) root auths + 1 custom-resource-role-auth + 1 Tooling blueprint auth
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 7);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_ASSET_TYPE',
      });
    });

    test('should handle authorization policy creation errors', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with invalid authorization policy',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with domain units',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with groups',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
      // 2 from the domain unit policy + 2 from data-admin (2) root auths + 1 custom-resource-role-auth + 1 Tooling blueprint auth
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 7);
    });

    test('should create associated account CDK users and owners', () => {
      const crossAccountStack1 = new Stack(testApp, 'cross-account-stack-1', { env: { account: '123456789012' } });
      const crossAccountStack2 = new Stack(testApp, 'cross-account-stack-2', { env: { account: '123456789013' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
              },
              acc2: {
                account: '123456789013',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                createCdkUser: false,
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789013:key/test-key',
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

      // Verify RAM share Name uses RAM_RESOURCE_SHARE resource type
      const ramResourceName = testApp.naming.withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE).resourceName();
      const ramConfigResourceName = testApp.naming
        .withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE)
        .resourceName('domain-config-ssm-test-domain');
      // Domain RAM share Name is a Fn::Join because it embeds the domain.attrId token
      template.hasResourceProperties('AWS::RAM::ResourceShare', {
        Name: {
          'Fn::Join': ['', Match.arrayWith([`DataZone-${ramResourceName}-`])],
        },
      });
      // Config RAM share Name is a resolved literal
      template.hasResourceProperties('AWS::RAM::ResourceShare', {
        Name: ramConfigResourceName,
      });

      // Verify IAM managed policies use IAM_POLICY resource type in their names
      const kmsUsePolicyName = testApp.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('domain-kms-use-test-domain');
      const kmsAdminPolicyName = testApp.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName('domain-kms-admin-test-domain');
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: kmsUsePolicyName,
      });
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: kmsAdminPolicyName,
      });

      // Verify custom resource role uses IAM_ROLE resource type
      const customResourceRoleName = testApp.naming
        .withResourceType(MdaaResourceType.IAM_ROLE)
        .resourceName('test-domain-custom-resource', 64);
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: customResourceRoleName,
      });
    });

    test('should create domain unit owners for associated accounts', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-unit', { env: { account: '123456789012' } });
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain with domain unit owners',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
            },

            associatedAccounts: {
              acc1: {
                account: '123456789012',
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1', 'subnet-id2'],
                  provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
                },
                createCdkUser: true,
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test-key',
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with auth policies',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sagemakerDomainExecutionRole: { name: 'existing-execution-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Domain with existing execution role',
            dataAdminRole: { name: 'admin' },

            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1', 'subnet-id2'],
              provisioningRole: { arn: 'arn:test-partition:iam::123456789012:role/test-provisioning-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
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

    test('authorizations.projectCreators creates CREATE_PROJECT_FROM_PROJECT_PROFILE policy for V2', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with projectCreators',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: { vpcId: 'test-vpc', subnetIds: ['subnet-1'] },
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            authorizations: {
              projectCreators: {
                users: ['test-user'],
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // V2 domains should get CREATE_PROJECT_FROM_PROJECT_PROFILE, not CREATE_PROJECT
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT_FROM_PROJECT_PROFILE',
      });
    });

    test('authorizations.eligibleProjectMembers.all creates allUsersGrantFilter policy for V2', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with eligibleProjectMembers all',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: { vpcId: 'test-vpc', subnetIds: ['subnet-1'] },
            authorizations: {
              eligibleProjectMembers: {
                all: true,
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL',
        Principal: {
          User: {
            AllUsersGrantFilter: {},
          },
        },
      });
    });

    test('authorizations with multiple fields creates all corresponding policies for V2', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with multiple authorizations',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: { vpcId: 'test-vpc', subnetIds: ['subnet-1'] },
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            groups: { 'test-group': { ssoId: 'group-123' } },
            authorizations: {
              projectCreators: { users: ['test-user'] },
              eligibleProjectMembers: { all: true },
              domainUnitCreators: { groups: ['test-group'] },
              glossaryCreators: { users: ['test-user'] },
              environmentCreators: { groups: ['test-group'] },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // 5 from authorizations + 2 from data-admin (2) + 2 Tooling/DataLake blueprint auths + 1 custom-resource-role-auth
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 11);
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT_FROM_PROJECT_PROFILE',
      });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_DOMAIN_UNIT' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_GLOSSARY' });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'CREATE_ENVIRONMENT' });
    });

    test('authorizations on domain unit creates policies for V2', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with domain unit authorizations',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: { vpcId: 'test-vpc', subnetIds: ['subnet-1'] },
            users: { 'test-user': { iamRole: { name: 'test-user-role' } } },
            domainUnits: {
              unit1: {
                description: 'Unit with authorizations',
                authorizations: {
                  projectCreators: { users: ['test-user'] },
                  eligibleProjectMembers: { all: true },
                },
              },
            },
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
        PolicyType: 'CREATE_PROJECT_FROM_PROJECT_PROFILE',
      });
      template.hasResourceProperties('AWS::DataZone::PolicyGrant', { PolicyType: 'ADD_TO_PROJECT_MEMBER_POOL' });
    });

    test('empty authorizations object does not create extra policies for V2', () => {
      const props: DataZoneL3ConstructProps = {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'V2 domain with empty authorizations',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: { vpcId: 'test-vpc', subnetIds: ['subnet-1'] },
            authorizations: {},
          },
        },
      };

      new DataZoneL3Construct(stack, 'test', props);
      const template = Template.fromStack(stack);

      // data-admin (2) + Tooling/DataLake blueprint auths (2) + custom-resource-role-auth (1) = 5
      template.resourceCountIs('AWS::DataZone::PolicyGrant', 6);
    });

    test('AOSS encryption policy is pre-created with broad collection/bedrock-ide-* pattern and CMK', () => {
      new DataZoneL3Construct(stack, 'test-aoss-policy', {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { name: 'admin' },
            userAssignment: 'MANUAL',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1'],
            },
          },
        },
      });
      const template = Template.fromStack(stack);

      // Encryption policy is created unconditionally on the primary account path
      // so DataZone-managed Bedrock IDE collections always get a working CMK policy.
      template.resourceCountIs('AWS::OpenSearchServerless::SecurityPolicy', 1);
      template.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
        Type: 'encryption',
        // Name is derived from the domain id: bedrock-ide-<Fn.select(1, Fn.split('dzd-', domainId))>
        Name: {
          'Fn::Join': [
            '',
            [
              'bedrock-ide-',
              {
                'Fn::Select': [1, { 'Fn::Split': ['dzd-', Match.anyValue()] }],
              },
            ],
          ],
        },
      });

      // Policy body is a Stack.toJsonString token — a Fn::Join over string parts
      // interleaved with the tooling KMS key ARN token. Assert its contents:
      //  * broad collection/bedrock-ide-* resource pattern
      //  * CMK-backed encryption (AWSOwnedKey:false)
      //  * KmsARN references the tooling KMS key, not an AWS-owned key.
      const templateJson = template.toJSON() as {
        Resources: Record<string, { Type: string; Properties: { Policy: unknown } }>;
      };
      const [policyLogicalId] = Object.entries(templateJson.Resources).find(
        ([, r]) => r.Type === 'AWS::OpenSearchServerless::SecurityPolicy',
      )!;
      const kmsKeyLogicalId = Object.keys(templateJson.Resources).find(
        id => templateJson.Resources[id].Type === 'AWS::KMS::Key' && id.toLowerCase().includes('toolingkms'),
      );
      expect(kmsKeyLogicalId).toBeDefined();
      // The Policy value is Stack.toJsonString() → Fn::Join over the string parts
      // of the serialized JSON with the KMS key ARN token interleaved. The literal
      // parts already contain the escaped JSON substrings, so match on them directly.
      const policyBodyStr = JSON.stringify(templateJson.Resources[policyLogicalId].Properties.Policy);
      expect(policyBodyStr).toContain('collection/bedrock-ide-*');
      expect(policyBodyStr).toContain('\\"AWSOwnedKey\\":false');
      expect(policyBodyStr).toContain('\\"KmsARN\\":');
      expect(policyBodyStr).toContain(kmsKeyLogicalId!);
    });

    test('AOSS encryption policy is also pre-created on the cross-account (associated account) path', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-aoss', { env: { account: '123456789012' } });
      new DataZoneL3Construct(stack, 'test-aoss-policy-cross-account', {
        roleHelper,
        naming: testApp.naming,
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::123456789012:role/test-role' },
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        sageMakerDomains: {
          'test-domain': {
            description: 'Test domain',
            dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
            userAssignment: 'AUTOMATIC',
            tooling: {
              vpcId: 'test-vpc',
              subnetIds: ['subnet-id-1'],
            },
            associatedAccounts: {
              acc1: {
                tooling: {
                  vpcId: 'test-vpc',
                  subnetIds: ['subnet-id-1'],
                },
                account: '123456789012',
                glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test',
              },
            },
          },
        },
      });

      // The associated-account (cross-account) stack must also pre-create the
      // CMK-backed encryption policy so Bedrock IDE collections provisioned in
      // associated accounts are not left on DataZone's broken auto-created policy.
      const crossAccountTemplate = Template.fromStack(crossAccountStack);
      crossAccountTemplate.resourceCountIs('AWS::OpenSearchServerless::SecurityPolicy', 1);
      crossAccountTemplate.hasResourceProperties('AWS::OpenSearchServerless::SecurityPolicy', {
        Type: 'encryption',
        Name: {
          'Fn::Join': [
            '',
            [
              'bedrock-ide-',
              {
                'Fn::Select': [1, { 'Fn::Split': ['dzd-', Match.anyValue()] }],
              },
            ],
          ],
        },
      });

      // Assert the cross-account policy body carries the broad resource pattern and
      // CMK-backed encryption, mirroring the primary-account policy.
      const crossAccountJson = crossAccountTemplate.toJSON() as {
        Resources: Record<string, { Type: string; Properties: { Policy: unknown } }>;
      };
      const [crossPolicyLogicalId] = Object.entries(crossAccountJson.Resources).find(
        ([, r]) => r.Type === 'AWS::OpenSearchServerless::SecurityPolicy',
      )!;
      const crossPolicyBodyStr = JSON.stringify(crossAccountJson.Resources[crossPolicyLogicalId].Properties.Policy);
      expect(crossPolicyBodyStr).toContain('collection/bedrock-ide-*');
      expect(crossPolicyBodyStr).toContain('\\"AWSOwnedKey\\":false');
      expect(crossPolicyBodyStr).toContain('\\"KmsARN\\":');
    });
  });

  describe('Cross-account domain config parameter reference', () => {
    /** The associated-account config used by both branches; only the stack env differs. */
    const domainsWithAssociatedAccount = {
      'test-domain': {
        description: 'Test',
        dataAdminRole: { arn: 'arn:test-partition:iam::123456789012:role/admin' },
        userAssignment: 'AUTOMATIC' as const,
        associatedAccounts: {
          acc1: {
            account: '123456789012',
            region: 'test-region',
            glueCatalogKmsKeyArn: 'arn:test-partition:kms:test-region:123456789012:key/test',
          },
        },
      },
    };

    /**
     * The `Default` of every SSM-backed parameter the cross-account DomainConfig creates. Scoped by
     * logical id so unrelated SSM parameters in the same stack are not asserted on.
     */
    function domainConfigParameterDefaults(template: Template): string[] {
      const json = template.toJSON() as {
        Parameters?: Record<string, { Type: string; Default: string }>;
      };
      return Object.entries(json.Parameters ?? {})
        .filter(([id, p]) => id.includes('domainconfigparser') && p.Type.startsWith('AWS::SSM::Parameter::Value'))
        .map(([, p]) => p.Default);
    }

    test('reads the domain-owning account by ARN when the deploying account resolves', () => {
      const crossAccountStack = new Stack(testApp, 'cross-account-stack', { env: { account: '123456789012' } });
      new DataZoneL3Construct(stack, 'test', {
        naming: testApp.naming,
        roleHelper,
        crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
        dataZoneDomains: domainsWithAssociatedAccount,
      });

      const defaults = domainConfigParameterDefaults(Template.fromStack(crossAccountStack));
      expect(defaults.length).toBeGreaterThan(0);
      // Every parameter is read from the domain-owning account by full ARN, which is what makes the
      // read cross-account.
      defaults.forEach(d =>
        expect(d).toMatch(/^arn:test-partition:ssm:test-region:test-account:parameter\/test-org\/.*\/config\//),
      );
    });

    test('fails at synth when the deploying account is unresolved', () => {
      // An env-agnostic stack: account, region and partition are all CloudFormation pseudo-parameters,
      // so no literal ARN can be formed. Reading the parameters by name instead would read them from
      // the associated account rather than the domain-owning one, so the construct refuses to guess.
      const agnosticStack = new Stack(testApp, 'env-agnostic-stack');
      const agnosticRoleHelper = new MdaaRoleHelper(agnosticStack, testApp.naming);
      const crossAccountStack = new Stack(testApp, 'cross-account-stack-agnostic');

      expect(
        () =>
          new DataZoneL3Construct(agnosticStack, 'test', {
            naming: testApp.naming,
            roleHelper: agnosticRoleHelper,
            crossAccountStacks: { '123456789012': { 'test-region': crossAccountStack } },
            dataZoneDomains: domainsWithAssociatedAccount,
          }),
      ).toThrow(/Domain 'test-domain': a cross-account DataZone domain requires an explicit 'account' and 'region'/);
    });
  });
});
