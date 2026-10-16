/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaDatazoneProjectRoleTagger } from '../lib';

const ROLE_ARNS = [
  'arn:test-partition:iam::test-account:role/etl-role',
  'arn:test-partition:iam::test-account:role/team/engineer-role',
];
const ACCOUNT_ROLES = 'arn:test-partition:iam::test-account:role/*';
const ONLY_PROJECT_TAG_KEY = { 'ForAllValues:StringEquals': { 'aws:TagKeys': ['AmazonDataZoneProject'] } };

interface Statement {
  readonly Action: string;
  readonly Resource: unknown;
  readonly Condition?: { readonly StringEquals: Record<string, string> };
}

describe('MdaaDatazoneProjectRoleTagger', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  const createTagger = (roleArns: string[] = ROLE_ARNS, id = 'test-tagger', projectId = 'prjtest123') =>
    new MdaaDatazoneProjectRoleTagger(testApp.testStack, id, {
      naming: testApp.naming,
      projectId,
      roleArns,
    });

  /** Logical ID of the tagger's own handler policy. */
  const handlerPolicyId = (taggerId = 'test-tagger'): string => {
    const prefix = `${taggerId.replace(/-/g, '')}handlerpolicy`;
    const ids = Object.keys(Template.fromStack(testApp.testStack).findResources('AWS::IAM::Policy')).filter(id =>
      id.startsWith(prefix),
    );
    expect(ids).toHaveLength(1);
    return ids[0];
  };

  const handlerStatements = (taggerId = 'test-tagger'): Statement[] =>
    Template.fromStack(testApp.testStack).findResources('AWS::IAM::Policy')[handlerPolicyId(taggerId)].Properties
      .PolicyDocument.Statement;

  const statements = (action: string, taggerId = 'test-tagger') =>
    handlerStatements(taggerId).filter(x => x.Action === action);

  it('passes the project ID and role ARNs to one custom resource', () => {
    createTagger();

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneProjectRoleTagger', 1);
    template.hasResourceProperties('Custom::DataZoneProjectRoleTagger', {
      projectId: 'prjtest123',
      roleArns: ROLE_ARNS,
    });
  });

  it('limits TagRole to the listed roles, the tag key, and this project ID', () => {
    createTagger();

    expect(statements('iam:TagRole')).toEqual([
      {
        Effect: 'Allow',
        Action: 'iam:TagRole',
        Resource: ROLE_ARNS,
        Condition: {
          ...ONLY_PROJECT_TAG_KEY,
          StringEquals: { 'aws:RequestTag/AmazonDataZoneProject': 'prjtest123' },
        },
      },
    ]);
  });

  it('limits UntagRole to roles holding this project ID and to the tag key', () => {
    createTagger();

    expect(statements('iam:UntagRole')).toEqual([
      {
        Effect: 'Allow',
        Action: 'iam:UntagRole',
        Resource: ACCOUNT_ROLES,
        Condition: {
          ...ONLY_PROJECT_TAG_KEY,
          StringEquals: { 'aws:ResourceTag/AmazonDataZoneProject': 'prjtest123' },
        },
      },
    ]);
  });

  it('grants only read access to role tags across the account', () => {
    createTagger();

    expect(statements('iam:ListRoleTags')).toEqual([
      { Effect: 'Allow', Action: 'iam:ListRoleTags', Resource: ACCOUNT_ROLES },
    ]);
    expect(handlerStatements().map(x => x.Action)).toEqual(['iam:ListRoleTags', 'iam:TagRole', 'iam:UntagRole']);
  });

  it('attaches the handler policy to the handler role and makes the custom resource depend on it', () => {
    createTagger();

    const template = Template.fromStack(testApp.testStack);
    const policyId = handlerPolicyId();
    const handlerRoleIds = Object.keys(template.findResources('AWS::IAM::Role')).filter(id =>
      id.startsWith('customDataZoneProjectRoleTaggerhandlerrole'),
    );
    expect(handlerRoleIds).toHaveLength(1);
    expect(template.findResources('AWS::IAM::Policy')[policyId].Properties.Roles).toEqual([{ Ref: handlerRoleIds[0] }]);
    const taggers = Object.values(template.findResources('Custom::DataZoneProjectRoleTagger'));
    expect(taggers[0].DependsOn).toContain(policyId);
  });

  it('gives each tagger in a stack its own handler policy for its own roles and project', () => {
    const otherRole = 'arn:test-partition:iam::test-account:role/other-role';
    createTagger();
    createTagger([otherRole], 'other-tagger', 'prjother456');

    const tagRoleBinding = (taggerId: string) =>
      statements('iam:TagRole', taggerId).map(x => [x.Resource, x.Condition?.StringEquals]);
    const untagRoleProject = (taggerId: string) =>
      statements('iam:UntagRole', taggerId).map(x => x.Condition?.StringEquals);

    expect(tagRoleBinding('test-tagger')).toEqual([
      [ROLE_ARNS, { 'aws:RequestTag/AmazonDataZoneProject': 'prjtest123' }],
    ]);
    expect(tagRoleBinding('other-tagger')).toEqual([
      [otherRole, { 'aws:RequestTag/AmazonDataZoneProject': 'prjother456' }],
    ]);
    expect(untagRoleProject('test-tagger')).toEqual([{ 'aws:ResourceTag/AmazonDataZoneProject': 'prjtest123' }]);
    expect(untagRoleProject('other-tagger')).toEqual([{ 'aws:ResourceTag/AmazonDataZoneProject': 'prjother456' }]);
  });

  it('rejects an empty role list', () => {
    expect(() => createTagger([])).toThrow('MdaaDatazoneProjectRoleTagger requires at least one role ARN');
  });
});
