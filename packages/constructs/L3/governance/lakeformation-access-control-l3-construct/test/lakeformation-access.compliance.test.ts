/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  LakeFormationAccessControlL3Construct,
  LakeFormationAccessControlL3ConstructProps,
  NamedGrantProps,
  NamedPrincipalProps,
  NamedResourceLinkProps,
} from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();

  const federatedPrincipalProps: NamedPrincipalProps = {
    federatedUserPrincipalProps: {
      federatedUser: 'testFederatedUser',
      federationProviderArn: 'testFederatedProviderArn',
    },

    federatedGroupPrincipalProps: {
      federatedUser: 'testFederatedUser',
      federationProviderArn: 'testFederatedProviderArn',
    },
  };

  const federatedGrant: NamedGrantProps = {
    federatedGrant: {
      database: 'test-database',
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      principals: federatedPrincipalProps,
    },
  };

  const readPrincipalProps: NamedPrincipalProps = {
    readPrincipalProps: {
      role: {
        arn: 'test-read-role-arn',
      },
    },
  };

  const readResourceGrant: NamedGrantProps = {
    readResourceGrant: {
      database: 'test-database',
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      principals: readPrincipalProps,
    },
  };

  const readPrincipalCrossAccountProps: NamedPrincipalProps = {
    readPrincipalCrossAccountProps: {
      role: {
        arn: 'arn:test-partition:iam::test-cross-account:role/cross-account-role-name',
      },
    },
  };

  const readResourceCrossAccountGrant: NamedGrantProps = {
    readResourceCrossAccountGrant: {
      database: 'test-database',
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      principals: readPrincipalCrossAccountProps,
    },
  };

  const readWritePrincipalProps: NamedPrincipalProps = {
    readWritePrincipalProps: {
      role: {
        arn: 'test-readWrite-role-arn',
      },
    },
  };

  const readWriteResourceGrant: NamedGrantProps = {
    readWriteResourceGrant: {
      database: 'test-database',
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
      principals: readWritePrincipalProps,
    },
  };

  const readWriteSuperPrincipalProps: NamedPrincipalProps = {
    readWriteSuperPrincipalProps: {
      role: {
        arn: 'test-readWriteSuper-role-arn',
      },
    },
  };

  const readWriteSuperResourceGrant: NamedGrantProps = {
    readWriteSuperResourceGrant: {
      database: 'test-database',
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_SUPER_PERMISSIONS,
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_SUPER_PERMISSIONS,
      principals: readWriteSuperPrincipalProps,
    },
  };

  const readTableResourceGrant: NamedGrantProps = {
    readTableResourceGrant: {
      database: 'test-database',
      databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
      tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
      tables: ['test-table'],
      principals: readPrincipalProps,
    },
  };

  const resourceLinkProps: NamedResourceLinkProps = {
    'test-local-resource-link': {
      targetDatabase: 'testing-database-target',
      grantPrincipals: readPrincipalProps,
    },
    'test-database': {
      targetDatabase: 'test-database',
      fromAccount: 'test-cross-account',
      grantPrincipals: readPrincipalCrossAccountProps,
    },
  };

  const crossAccountStack = new Stack(testApp, 'test-cross-account-stack');
  const constructProps: LakeFormationAccessControlL3ConstructProps = {
    naming: testApp.naming,

    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    crossAccountStacks: { 'test-cross-account': { 'test-region': crossAccountStack } },
    grants: {
      ...readResourceGrant,
      ...readWriteResourceGrant,
      ...readWriteSuperResourceGrant,
      ...readTableResourceGrant,
      ...federatedGrant,
      ...readResourceCrossAccountGrant,
    },
    resourceLinks: resourceLinkProps,
  };

  new LakeFormationAccessControlL3Construct(testApp.testStack, 'test-stack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  testApp.checkCdkNagCompliance(crossAccountStack);
  const template = Template.fromStack(testApp.testStack);
  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
  const crossAccountTemplate = Template.fromStack(crossAccountStack);
  // console.log( JSON.stringify( crossAccountTemplate.toJSON(), undefined, 2 ) )
  describe('Local Account', () => {
    test('GrantCount', () => {
      template.resourceCountIs('AWS::LakeFormation::PrincipalPermissions', 15);
    });

    test('Local Resource Link', () => {
      template.hasResourceProperties('AWS::Glue::Database', {
        CatalogId: 'test-account',
        DatabaseInput: {
          Name: 'test-local-resource-link',
          TargetDatabase: {
            CatalogId: 'test-account',
            DatabaseName: 'testing-database-target',
          },
        },
      });
    });

    test('Resource Link DESCRIBE', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-read-role-arn',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-local-resource-link',
          },
        },
      });
    });

    test('grantDATABASEreadResourceGrantreadPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-read-role-arn',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('grantALLTABLESreadResourceGrantreadPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-read-role-arn',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            TableWildcard: {},
          },
        },
      });
    });
    test('grantDATABASEreadWriteResourceGrantreadWritePrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE', 'CREATE_TABLE', 'ALTER'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-readWrite-role-arn',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('grantALLTABLESreadWriteResourceGrantreadWritePrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE', 'INSERT', 'DELETE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-readWrite-role-arn',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            TableWildcard: {},
          },
        },
      });
    });
    test('grantDATABASEreadWriteSuperResourceGrantreadWriteSuperPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE', 'CREATE_TABLE', 'ALTER', 'DROP'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-readWriteSuper-role-arn',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('grantALLTABLESreadWriteSuperResourceGrantreadWriteSuperPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE', 'INSERT', 'DELETE', 'ALTER', 'DROP'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-readWriteSuper-role-arn',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            TableWildcard: {},
          },
        },
      });
    });

    test('grantDATABASEreadTableResourceGrantreadPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-read-role-arn',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('granttesttablereadTableResourceGrantreadPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'test-read-role-arn',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            Name: 'test-table',
          },
        },
      });
    });
    test('grantDATABASEfederatedGrantfederatedUserPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'testFederatedProviderArn:user/testFederatedUser',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('grantDATABASEfederatedGrantfederatedGroupPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'testFederatedProviderArn:user/testFederatedUser',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('grantALLTABLESfederatedGrantfederatedUserPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'testFederatedProviderArn:user/testFederatedUser',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            TableWildcard: {},
          },
        },
      });
    });

    test('grantALLTABLESfederatedGrantfederatedGroupPrincipalProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'testFederatedProviderArn:user/testFederatedUser',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            TableWildcard: {},
          },
        },
      });
    });

    test('grantDATABASEreadResourceCrossAccountGrantreadPrincipalCrossAccountProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'arn:test-partition:iam::test-cross-account:role/cross-account-role-name',
        },
        Resource: {
          Database: {
            CatalogId: 'test-account',
            Name: 'test-database',
          },
        },
      });
    });

    test('grantALLTABLESreadResourceCrossAccountGrantreadPrincipalCrossAccountProps', () => {
      template.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['SELECT', 'DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'arn:test-partition:iam::test-cross-account:role/cross-account-role-name',
        },
        Resource: {
          Table: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
            TableWildcard: {},
          },
        },
      });
    });
  });
  describe('Cross Account', () => {
    test('GrantCount', () => {
      crossAccountTemplate.resourceCountIs('AWS::LakeFormation::PrincipalPermissions', 1);
    });
    test('DATABASEreadResourceCrossAccountGrantreadPrincipalCrossAccountPropscrossaccounttestcrossaccount', () => {
      crossAccountTemplate.hasResourceProperties('AWS::LakeFormation::PrincipalPermissions', {
        Permissions: ['DESCRIBE'],
        PermissionsWithGrantOption: [],
        Principal: {
          DataLakePrincipalIdentifier: 'arn:test-partition:iam::test-cross-account:role/cross-account-role-name',
        },
        Resource: {
          Database: {
            CatalogId: 'test-cross-account',
            Name: 'test-database',
          },
        },
      });
    });
    test('Cross Account Resource Link', () => {
      crossAccountTemplate.hasResourceProperties('AWS::Glue::Database', {
        CatalogId: 'test-cross-account',
        DatabaseInput: {
          Name: 'test-database',
          TargetDatabase: {
            CatalogId: 'test-account',
            DatabaseName: 'test-database',
          },
        },
      });
    });
  });
});
