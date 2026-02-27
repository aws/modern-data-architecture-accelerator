/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable jest/expect-expect */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { SagemakerStudioDomainL3Construct, SagemakerStudioDomainL3ConstructProps } from '../lib';
import { LifecycleScriptProps } from '@aws-mdaa/sm-shared';

describe('Studio Domain Coverage Tests', () => {
  test('lifecycle config dependencies - jupyter and kernel', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const lifecycleConfig: LifecycleScriptProps = {
      assets: {
        testing: {
          sourcePath: './test/test_assets/',
        },
      },
      cmds: ['testing'],
    };

    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id',
        subnetIds: ['test-sub-id'],
        lifecycleConfigs: {
          jupyter: lifecycleConfig,
          kernel: lifecycleConfig,
        },
        dataAdminRoles: [{ name: 'test-admin-role' }],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new SagemakerStudioDomainL3Construct(stack, 'test-jupyter-kernel', constructProps);
    // Lines 551-552: jupyterLabLifecycleConfig && kernelLifecycleConfig dependency
  });

  test('lifecycle config dependencies - jupyterlab and jupyter', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const lifecycleConfig: LifecycleScriptProps = {
      assets: {
        testing: {
          sourcePath: './test/test_assets/',
        },
      },
      cmds: ['testing'],
    };

    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id-2',
        subnetIds: ['test-sub-id-2'],
        lifecycleConfigs: {
          jupyter: lifecycleConfig,
          jupyterLab: lifecycleConfig,
        },
        dataAdminRoles: [{ name: 'test-admin-role' }],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new SagemakerStudioDomainL3Construct(stack, 'test-jupyterlab-jupyter', constructProps);
    // Lines 554-555: jupyterLifecycleConfig && jupyterLabLifecycleConfig dependency
  });

  test('custom user settings merge', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id-3',
        subnetIds: ['test-sub-id-3'],
        defaultUserSettings: {
          jupyterServerAppSettings: {
            defaultResourceSpec: {
              instanceType: 'ml.t3.medium',
            },
          },
        },
        dataAdminRoles: [{ name: 'test-admin-role' }],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new SagemakerStudioDomainL3Construct(stack, 'test-merge-settings', constructProps);
    // Lines 594-595: lodash merge with customizer function
  });

  test('domain dependencies with lifecycle configs', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const lifecycleConfig: LifecycleScriptProps = {
      assets: {
        testing: {
          sourcePath: './test/test_assets/',
        },
      },
      cmds: ['testing'],
    };

    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id-4',
        subnetIds: ['test-sub-id-4'],
        lifecycleConfigs: {
          jupyter: lifecycleConfig,
          jupyterLab: lifecycleConfig,
          kernel: lifecycleConfig,
        },
        dataAdminRoles: [{ name: 'test-admin-role' }],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new SagemakerStudioDomainL3Construct(stack, 'test-domain-deps', constructProps);
    // Line 618: domain dependencies with all lifecycle configs
  });

  test('IAM auth mode user profile without userRole', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id-5',
        subnetIds: ['test-sub-id-5'],
        userProfiles: {
          'test-user': {},
        },
        // Provide existing bucket to avoid creation
        domainBucket: {
          domainBucketName: 'existing-test-bucket',
          assetDeploymentRole: { name: 'test-asset-role' },
        },
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    expect(() => {
      new SagemakerStudioDomainL3Construct(stack, 'test-iam-no-role', constructProps);
    }).toThrow("'userRole' must be defined on user profile when domain is in IAM authMode");
    // Lines 793-794: IAM auth mode validation error
  });

  test('IAM auth mode user profile with userRole', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id-6',
        subnetIds: ['test-sub-id-6'],
        userProfiles: {
          'test-user': {
            userRole: { name: 'test-user-role' },
          },
        },
        dataAdminRoles: [{ name: 'test-admin-role' }],
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    new SagemakerStudioDomainL3Construct(stack, 'test-iam-with-role', constructProps);
    // Lines 796-801: IAM auth mode with userRole tag creation
  });

  test('notebook sharing bucket without dataAdminRoles', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SagemakerStudioDomainL3ConstructProps = {
      domain: {
        authMode: 'IAM',
        vpcId: 'test-vpc-id-7',
        subnetIds: ['test-sub-id-7'],
        // No dataAdminRoles provided, but bucket creation will be triggered
      },
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    };

    // This should trigger the bucket creation path which checks for dataAdminRoles
    expect(() => {
      new SagemakerStudioDomainL3Construct(stack, 'test-bucket-no-admin', constructProps);
    }).toThrow('dataAdminRoles must be defined if creating a Notebook Sharing Bucket');
    // Lines 829-830: notebook sharing bucket validation error
  });
});
