/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { GlueWorkflowL3Construct, GlueWorkflowL3ConstructProps, WorkflowProps } from '../lib';

describe('GlueWorkflowL3Construct Constructor Exception Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const validWorkflowDefinition: WorkflowProps = {
    rawWorkflowDef: {
      Workflow: {
        Name: 'test-workflow',
        Graph: {
          Nodes: []
        }
      }
    }
  };

  const baseProps: GlueWorkflowL3ConstructProps = {
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    workflowDefinitions: [validWorkflowDefinition],
    projectName: 'test-project',
    securityConfigurationName: 'testing-config',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  test('throws error when kmsArn is undefined', () => {
    const props = { ...baseProps, kmsArn: undefined };
    
    expect(() => {
      new GlueWorkflowL3Construct(stack, 'test-construct-1', props);
    }).toThrow('Project KMS key must be defined');
  });

  test('throws error when securityConfigurationName is undefined', () => {
    const props = { ...baseProps, securityConfigurationName: undefined };
    
    expect(() => {
      new GlueWorkflowL3Construct(stack, 'test-construct-2', props);
    }).toThrow('Project Security Configuration must be defined');
  });
});