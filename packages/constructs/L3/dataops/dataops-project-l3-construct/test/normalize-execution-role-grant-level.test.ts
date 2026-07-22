/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
import { DataOpsProjectL3Construct, DataOpsProjectL3ConstructProps, ExecutionRoleGrantLevel } from '../lib';
// nosemgrep
import * as path from 'path';

// normalizeExecutionRoleGrantLevel is a private, stateless method on the construct.
// It is accessed here via a narrowly-typed cast so the actual production logic is
// exercised (rather than replicated). The finite input domain is covered exhaustively.
type NormalizeAccessor = {
  normalizeExecutionRoleGrantLevel(
    flag: boolean | 'read' | 'write' | 'super' | undefined,
  ): ExecutionRoleGrantLevel | undefined;
};

describe('normalizeExecutionRoleGrantLevel', () => {
  const testApp = new MdaaTestApp();
  const testGlueRoleRef: MdaaRoleRef = {
    id: 'test-glue-role-id',
  };

  const stack = new Stack(testApp, 'test-normalize-stack');
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
  };
  const construct = new DataOpsProjectL3Construct(stack, 'test-construct', props);
  const normalize = (flag: boolean | 'read' | 'write' | 'super' | undefined) =>
    (construct as unknown as NormalizeAccessor).normalizeExecutionRoleGrantLevel(flag);

  it('maps boolean true to write (backward compatible)', () => {
    expect(normalize(true)).toEqual('write');
  });

  it('maps boolean false to undefined (no grant)', () => {
    expect(normalize(false)).toBeUndefined();
  });

  it('maps undefined to undefined (no grant)', () => {
    expect(normalize(undefined)).toBeUndefined();
  });

  it('passes through read unchanged', () => {
    expect(normalize('read')).toEqual('read');
  });

  it('passes through write unchanged', () => {
    expect(normalize('write')).toEqual('write');
  });

  it('passes through super unchanged', () => {
    expect(normalize('super')).toEqual('super');
  });
});
