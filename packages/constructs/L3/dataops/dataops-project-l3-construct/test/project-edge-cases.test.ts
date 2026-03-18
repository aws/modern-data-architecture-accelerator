/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps } from '../lib';
import { DataOpsProjectUtils } from '../lib/dataops-project-utils';
// nosemgrep
import * as path from 'path';

describe('DataOps Project Edge Cases', () => {
  const testApp = new MdaaTestApp();

  const testGlueRoleRef: MdaaRoleRef = {
    id: 'test-glue-role-id',
  };

  test('should throw error when both datazone and sagemaker are defined', () => {
    const stack = new Stack(testApp, 'test-both-error-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      datazone: {
        project: {
          domainConfigSSMParam: '/test/datazone/config',
          domainUnit: '/test-unit',
        },
      },
      sagemaker: {
        domainConfigSSMParam: '/test/sagemaker/config',
        project: {
          profileName: 'test-profile',
        },
      },
    };

    expect(() => {
      new DataOpsProjectL3Construct(stack, 'test-construct', props);
    }).toThrow('Only one of datazone or sagemaker properties should be defined');
  });

  test('should throw error when connection references non-existent security group', () => {
    const stack = new Stack(testApp, 'test-connection-error-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      securityGroupConfigs: {
        'existing-sg': {
          vpcId: 'vpc-123',
        },
      },
      connections: {
        'test-connection': {
          connectionType: 'JDBC',
          physicalConnectionRequirements: {
            availabilityZone: 'us-east-1a',
            subnetId: 'subnet-123',
            projectSecurityGroupNames: ['non-existent-sg'],
          },
        },
      },
    };

    expect(() => {
      new DataOpsProjectL3Construct(stack, 'test-construct', props);
    }).toThrow('Non-existant project security group name specified');
  });

  test('should throw error when creating DataZone datasource without DataZone project', () => {
    const stack = new Stack(testApp, 'test-datasource-error-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      databases: {
        'test-db': {
          description: 'Test database',
          createDatazoneDatasource: true,
        },
      },
    };

    expect(() => {
      new DataOpsProjectL3Construct(stack, 'test-construct', props);
    }).toThrow('DataZone/SageMaker Project must be defined if creating a DataZone Data Source');
  });

  test('should create SageMaker resources when sagemaker prop is defined', () => {
    const stack = new Stack(testApp, 'test-sagemaker-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      sagemaker: {
        domainConfigSSMParam: '/test/sagemaker/config',
        project: {
          profileName: 'test-profile',
        },
      },
    };

    const construct = new DataOpsProjectL3Construct(stack, 'test-construct', props);
    expect(construct).toBeDefined();
  });

  test('should create SageMaker resources with createDataAdminOwners', () => {
    const stack = new Stack(testApp, 'test-sagemaker-owners-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const testAdminRoleRef: MdaaRoleRef = {
      id: 'test-admin-role-id',
    };

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [testAdminRoleRef],
      sagemaker: {
        domainConfigSSMParam: '/test/sagemaker/config',
        project: {
          profileName: 'test-profile',
        },
        createDataAdminOwners: true,
      },
    };

    const construct = new DataOpsProjectL3Construct(stack, 'test-construct', props);
    expect(construct).toBeDefined();
  });

  test('DataOpsProjectUtils.createProjectSSMParam should create SSM parameter', () => {
    const stack = new Stack(testApp, 'test-utils-stack');

    DataOpsProjectUtils.createProjectSSMParam(stack, testApp.naming, 'test-project', 'test-key', 'test-value');

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Type: 'String',
      Value: 'test-value',
    });
  });

  test('should handle connections with both securityGroupIdList and projectSecurityGroupNames', () => {
    const stack = new Stack(testApp, 'test-connection-mixed-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      securityGroupConfigs: {
        'project-sg': {
          vpcId: 'vpc-123',
        },
      },
      connections: {
        'test-connection': {
          connectionType: 'JDBC',
          physicalConnectionRequirements: {
            availabilityZone: 'us-east-1a',
            subnetId: 'subnet-123',
            securityGroupIdList: ['sg-external-123'],
            projectSecurityGroupNames: ['project-sg'],
          },
        },
      },
    };

    const construct = new DataOpsProjectL3Construct(stack, 'test-construct', props);
    expect(construct).toBeDefined();
  });

  test('should handle database with datazone datasource', () => {
    const stack = new Stack(testApp, 'test-datazone-user-role-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      testApp.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: testApp.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      datazone: {
        project: {
          domainConfigSSMParam: '/test/datazone/config',
          domainUnit: '/test-unit',
        },
      },
      databases: {
        'test-db': {
          description: 'Test database',
          createDatazoneDatasource: true,
        },
      },
    };

    const construct = new DataOpsProjectL3Construct(stack, 'test-construct', props);
    expect(construct).toBeDefined();
  });

  test('should tag Athena workgroup with DataZone tags when datazoneResources is defined', () => {
    const app = new MdaaTestApp();
    const stack = new Stack(app, 'test-athena-dz-tags-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      app.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: app.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
      datazone: {
        project: {
          domainConfigSSMParam: '/test/datazone/config',
          domainUnit: '/test-unit',
        },
      },
    };

    new DataOpsProjectL3Construct(stack, 'test-construct', props);
    const template = Template.fromStack(stack);

    // When datazoneResources is defined, the Athena workgroup should have DataZone tags
    const workgroups = template.findResources('AWS::Athena::WorkGroup');
    const workgroupKeys = Object.keys(workgroups);
    expect(workgroupKeys.length).toBeGreaterThan(0);

    const workgroup = workgroups[workgroupKeys[0]];
    const tags: { Key: string }[] = workgroup.Properties?.Tags ?? [];
    const dzTagKeys = tags.map(t => t.Key).filter(k => typeof k === 'string' && k.startsWith('AmazonDataZone'));
    expect(dzTagKeys).toEqual(
      expect.arrayContaining(['AmazonDataZoneEnvironment', 'AmazonDataZoneProject', 'AmazonDataZoneDomain']),
    );
  });

  test('should not tag Athena workgroup with DataZone tags when datazoneResources is undefined', () => {
    const app = new MdaaTestApp();
    const stack = new Stack(app, 'test-athena-no-dz-tags-stack');
    const roleHelper = new MdaaRoleHelper(
      stack,
      app.naming,
      path.dirname(require.resolve('@aws-mdaa/iam-role-helper/package.json')),
    );

    const props: DataOpsProjectL3ConstructProps = {
      naming: app.naming,
      roleHelper,
      projectExecutionRoleRefs: [testGlueRoleRef],
      dataEngineerRoleRefs: [],
      dataAdminRoleRefs: [],
    };

    new DataOpsProjectL3Construct(stack, 'test-construct', props);
    const template = Template.fromStack(stack);

    const workgroups = template.findResources('AWS::Athena::WorkGroup');
    for (const [, resource] of Object.entries(workgroups)) {
      const tags: { Key: string }[] = resource.Properties?.Tags ?? [];
      const dzTagKeys = tags.map(t => t.Key).filter(k => k.startsWith('AmazonDataZone'));
      expect(dzTagKeys).toHaveLength(0);
    }
  });
});
