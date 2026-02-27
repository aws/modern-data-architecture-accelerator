/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { DataZoneL3Construct, DataZoneL3ConstructProps } from '../lib';
import { Stack } from 'aws-cdk-lib';

describe('MDAA Compliance Stack Tests', () => {
  describe('DataZone', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: DataZoneL3ConstructProps = {
      glueCatalogKmsKeyArn: 'test-key-arn',
      lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
      crossAccountStacks: {
        '12312421': { 'test-region': new Stack(testApp, 'testextrastack') },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      dataZoneDomains: {
        'test-domain': {
          description: 'Description of DZ Test Domain',
          singleSignOnType: 'DISABLED',
          userAssignment: 'MANUAL',
          dataAdminRole: {
            name: 'test',
          },
          users: {
            test1: {
              iamRole: {
                name: 'test1',
              },
            },
            test2: {
              ssoId: 'test-sso',
            },
          },
          groups: {
            testgroup1: {
              ssoId: 'test-group-sso',
            },
          },
          ownerUsers: ['test1'],
          ownerGroups: ['testgroup1'],
          domainUnits: {
            'test-domain-unit': {
              ownerUsers: ['test1'],
              ownerGroups: ['testgroup1'],
              domainUnits: {
                'test-domain-unit2': {
                  ownerUsers: ['test2'],
                },
              },
            },
          },
          associatedAccounts: {
            test1: {
              account: '12312421',
              glueCatalogKmsKeyArn: 'test-associated-key-arn',
              lakeformationManageAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
            },
          },
        },
      },
    };

    new DataZoneL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    test('Validate if Domain is created', () => {
      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Validate if KMS is created and used for the domain', () => {
      template.hasResourceProperties('AWS::DataZone::Domain', {
        KmsKeyIdentifier: {
          'Fn::GetAtt': ['teststacktestdomaincmkF602D0BB', 'Arn'],
        },
      });
    });
  });

  describe('SageMaker', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: DataZoneL3ConstructProps = {
      lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
      glueCatalogKmsKeyArn: 'test-key-arn',
      crossAccountStacks: {
        '12312421': { 'test-region': new Stack(testApp, 'testextrastack') },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      sageMakerDomains: {
        'test-domain': {
          description: 'Description of DZ Test Domain',
          userAssignment: 'MANUAL',
          tooling: {
            vpcId: 'vpc-test789',
            subnetIds: ['subnet-test5', 'subnet-test6'],
          },
          dataAdminRole: {
            name: 'test',
          },
          users: {
            test1: {
              iamRole: {
                name: 'test1',
              },
            },
            test2: {
              ssoId: 'test-sso',
            },
          },
          groups: {
            testgroup1: {
              ssoId: 'test-group-sso',
            },
          },
          ownerUsers: ['test1'],
          ownerAccounts: ['test-account1'],
          ownerGroups: ['testgroup1'],
          domainUnits: {
            'test-domain-unit': {
              ownerUsers: ['test1'],
              ownerGroups: ['testgroup1'],
              domainUnits: {
                'test-domain-unit2': {
                  ownerAccounts: ['test-account2'],
                  ownerUsers: ['test2'],
                },
              },
            },
          },
          associatedAccounts: {
            'test-account1': {
              account: '12312421',
              glueCatalogKmsKeyArn: 'test-associated-key-arn',
              createCdkUser: true,
              lakeformationManageAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
              tooling: {
                vpcId: 'vpc-test123',
                subnetIds: ['subnet-test1', 'subnet-test2'],
              },
            },
            'test-account2': {
              account: '1231241224',
              glueCatalogKmsKeyArn: 'test-associated-key-arn',
              createCdkUser: true,
              lakeformationManageAccessRoleArn: 'arn:test-partition:iam::test-account:role/test-role',
              tooling: {
                vpcId: 'vpc-test456',
                subnetIds: ['subnet-test3', 'subnet-test4'],
              },
            },
          },
        },
      },
    };

    new DataZoneL3Construct(stack, 'teststack', constructProps);
    testApp.checkCdkNagCompliance(testApp.testStack);

    const template = Template.fromStack(testApp.testStack);

    test('Validate if Domain is created', () => {
      template.resourceCountIs('AWS::DataZone::Domain', 1);
    });

    test('Validate if KMS is created and used for the domain', () => {
      template.hasResourceProperties('AWS::DataZone::Domain', {
        KmsKeyIdentifier: {
          'Fn::GetAtt': ['teststacktestdomaincmkF602D0BB', 'Arn'],
        },
      });
    });
  });

  describe('DataZone Error Cases', () => {
    test('Should throw error for invalid user configuration', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const invalidProps: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            users: {
              invalidUser: {}, // Neither iamRole nor ssoId
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'invalid-user-test', invalidProps);
      }).toThrow('One of user iamRole or ssoId must be specified');
    });

    test('Should throw error for unknown owner user', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const invalidProps: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            users: {
              validUser: { ssoId: 'test-sso' },
            },
            ownerUsers: ['unknownUser'], // User not in users list
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'unknown-owner-test', invalidProps);
      }).toThrow('Unknown owner user unknownUser on domain test-domain');
    });

    test('Should throw error for unknown owner account', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const invalidProps: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {
          '12312421': { 'test-region': new Stack(testApp, 'teststack1') },
        },
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            associatedAccounts: {
              testAccount: {
                account: '12312421',
                glueCatalogKmsKeyArn: 'test-key',
                lakeformationManageAccessRoleArn: 'test-role-arn',
              },
            },
            ownerAccounts: ['unknownAccount'], // Account not in associatedAccounts
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'unknown-owner-account-test', invalidProps);
      }).toThrow('Unknown owner account cdk user unknownAccount on domain test-domain');
    });

    test('Should handle associated account without cross account stack', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const propsWithMissingStack: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {}, // Empty cross account stacks
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            associatedAccounts: {
              'test-account2': {
                account: '1231241224', // Account not in crossAccountStacks
                glueCatalogKmsKeyArn: 'test-key',
                lakeformationManageAccessRoleArn: 'test-role-arn',
              },
            },
          },
        },
      };

      // This should not throw but will log warnings
      expect(() => {
        new DataZoneL3Construct(stack, 'missing-stack-test', propsWithMissingStack);
      }).not.toThrow();
    });

    test('Should handle domain units with authorization policies', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const propsWithAuth: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            users: {
              testUser: { ssoId: 'test-sso' },
            },
            domainUnits: {
              'test-unit': {
                authorizationPolicies: {
                  'create-project-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ userName: 'testUser' }],
                    includeChildDomainUnits: true,
                  },
                },
              },
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'auth-policies-test', propsWithAuth);
      }).not.toThrow();
    });

    test('Should create authorization construct', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const propsWithAuthConstruct: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
          },
        },
      };

      const construct = new DataZoneL3Construct(stack, 'auth-construct-test', propsWithAuthConstruct);
      expect(construct).toBeDefined();
    });

    test('Should throw error for unknown owner group', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const invalidProps: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            groups: {
              validGroup: { ssoId: 'test-group-sso' },
            },
            ownerGroups: ['unknownGroup'], // Group not in groups list
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'unknown-owner-group-test', invalidProps);
      }).toThrow('Unknown owner group unknownGroup on domain test-domain');
    });

    test('Should handle authorization policy creation errors', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const propsWithBadAuth: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            users: {
              testUser: { ssoId: 'test-sso' },
            },
            domainUnits: {
              'test-unit': {
                authorizationPolicies: {
                  'override-owners-policy': {
                    policyType: 'OVERRIDE_DOMAIN_UNIT_OWNERS',
                    principals: [{ userName: 'nonExistentUser' }], // User that doesn't exist
                    includeChildDomainUnits: true,
                  },
                },
              },
            },
          },
        },
      };

      // This should throw an error due to nonExistentUser
      expect(() => {
        new DataZoneL3Construct(stack, 'bad-auth-test', propsWithBadAuth);
      }).toThrow('Authorization policies creation failed for domain unit');
    });

    test('Should handle nested domain units with authorization policies', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;

      const propsWithNestedAuth: DataZoneL3ConstructProps = {
        glueCatalogKmsKeyArn: 'test-key-arn',
        lakeformationManageAccessRole: { arn: 'arn:test-partition:iam::test-account:role/test-role' },
        crossAccountStacks: {},
        roleHelper: new MdaaRoleHelper(stack, testApp.naming),
        naming: testApp.naming,
        dataZoneDomains: {
          'test-domain': {
            description: 'Test Domain',
            singleSignOnType: 'DISABLED',
            userAssignment: 'MANUAL',
            dataAdminRole: { name: 'test' },
            users: {
              testUser: { ssoId: 'test-sso' },
            },
            domainUnits: {
              'parent-unit': {
                authorizationPolicies: {
                  'create-project-policy': {
                    policyType: 'CREATE_PROJECT',
                    principals: [{ userName: 'testUser' }],
                    includeChildDomainUnits: true,
                  },
                },
                domainUnits: {
                  'child-unit': {
                    authorizationPolicies: {
                      'create-domain-unit-policy': {
                        policyType: 'CREATE_DOMAIN_UNIT',
                        principals: [{ userName: 'testUser' }],
                        includeChildDomainUnits: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect(() => {
        new DataZoneL3Construct(stack, 'nested-auth-test', propsWithNestedAuth);
      }).not.toThrow();
    });
  });
});
