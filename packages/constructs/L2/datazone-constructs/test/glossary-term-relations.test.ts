/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { MdaaDatazoneGlossaryTermRelations, MdaaDatazoneGlossaryTermRelationsProps } from '../lib';

describe('MdaaDatazoneGlossaryTermRelations', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  const baseProps = (relatedTermIds: string[] = ['trm-related']): MdaaDatazoneGlossaryTermRelationsProps => ({
    naming: testApp.naming,
    domainIdentifier: 'dzd_testdomain',
    termId: 'trm-source',
    relatedTermIds,
    handlerRole: Role.fromRoleArn(testApp.testStack, 'cr-role', 'arn:aws:iam::123456789012:role/cr-role'),
  });

  it('creates a single custom resource with the resolved term and related term IDs', () => {
    new MdaaDatazoneGlossaryTermRelations(testApp.testStack, 'test-relations', baseProps(['trm-a', 'trm-b']));

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneGlossaryTermRelations', 1);
    template.hasResourceProperties('Custom::DataZoneGlossaryTermRelations', {
      domainId: 'dzd_testdomain',
      termId: 'trm-source',
      relatedTermIds: ['trm-a', 'trm-b'],
    });
  });

  it('exposes the underlying custom resource for downstream dependency wiring', () => {
    const relations = new MdaaDatazoneGlossaryTermRelations(testApp.testStack, 'test-relations', baseProps());

    expect(relations.resource).toBeDefined();
  });

  it('grants the handler role CloudWatch Logs access scoped to its own handler log group', () => {
    // Same-account role, so addToPrincipalPolicy actually synthesizes the inline logs policy
    // (see glossary.test.ts for why a cross-account Role.fromRoleArn would be a no-op here).
    const sameAccountRole = Role.fromRoleName(testApp.testStack, 'same-account-cr-role', 'cr-role');
    new MdaaDatazoneGlossaryTermRelations(testApp.testStack, 'test-relations', {
      ...baseProps(),
      handlerRole: sameAccountRole,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
            Resource: Match.stringLikeRegexp('log-group:/aws/lambda/'),
          }),
        ]),
      },
      Roles: Match.arrayWith(['cr-role']),
    });
  });
});
