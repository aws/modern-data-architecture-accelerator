/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { GlossaryTermProps, MdaaDatazoneGlossary, MdaaDatazoneGlossaryProps } from '../lib';

describe('MdaaDatazoneGlossary', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  const baseProps = (terms: { [name: string]: GlossaryTermProps } = {}): MdaaDatazoneGlossaryProps => ({
    naming: testApp.naming,
    domainIdentifier: 'dzd_testdomain',
    owningProjectIdentifier: 'prjtest123',
    glossaryName: 'CustomerGlossary',
    terms,
    handlerRole: Role.fromRoleArn(testApp.testStack, 'cr-role', 'arn:aws:iam::123456789012:role/cr-role'),
  });

  it('creates the glossary via a custom resource with defaulted ENABLED status', () => {
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', baseProps());

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneGlossary', 1);
    template.resourceCountIs('Custom::DataZoneGlossaryTerm', 0);
    template.hasResourceProperties('Custom::DataZoneGlossary', {
      glossaryName: 'CustomerGlossary',
      status: 'ENABLED',
      domainId: 'dzd_testdomain',
      owningProjectId: 'prjtest123',
    });
  });

  it('defaults terms to empty when omitted entirely', () => {
    const propsWithoutTerms: MdaaDatazoneGlossaryProps = {
      naming: testApp.naming,
      domainIdentifier: 'dzd_testdomain',
      owningProjectIdentifier: 'prjtest123',
      glossaryName: 'CustomerGlossary',
      handlerRole: Role.fromRoleArn(testApp.testStack, 'cr-role', 'arn:aws:iam::123456789012:role/cr-role'),
    };
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', propsWithoutTerms);

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneGlossaryTerm', 0);
  });

  it('should honor an explicit DISABLED status', () => {
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', { ...baseProps(), status: 'DISABLED' });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneGlossary', { status: 'DISABLED' });
  });

  it('passes the description through to the custom resource when set', () => {
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', {
      ...baseProps(),
      description: 'Standard business terms',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneGlossary', { description: 'Standard business terms' });
  });

  it('omits the description property when not set', () => {
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', baseProps());

    const template = Template.fromStack(testApp.testStack);
    const glossaries = template.findResources('Custom::DataZoneGlossary');
    const props = Object.values(glossaries)[0].Properties;
    expect(props.description).toBeUndefined();
  });

  it('creates a custom resource per declared term, depending on the glossary', () => {
    new MdaaDatazoneGlossary(
      testApp.testStack,
      'test-glossary',
      baseProps({
        CustomerLifetimeValue: { description: 'CLV', status: 'ENABLED' },
        ChurnRisk: { readme: 'Likelihood a customer churns' },
      }),
    );

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneGlossaryTerm', 2);
    template.hasResourceProperties('Custom::DataZoneGlossaryTerm', {
      termName: 'CustomerLifetimeValue',
      shortDescription: 'CLV',
      status: 'ENABLED',
    });
    template.hasResourceProperties('Custom::DataZoneGlossaryTerm', {
      termName: 'ChurnRisk',
      longDescription: 'Likelihood a customer churns',
      status: 'ENABLED',
    });
  });

  it('wires each term as a CloudFormation DependsOn of the glossary', () => {
    new MdaaDatazoneGlossary(
      testApp.testStack,
      'test-glossary',
      baseProps({ CustomerLifetimeValue: { description: 'CLV' } }),
    );

    const template = Template.fromStack(testApp.testStack);
    const glossaryLogicalId = Object.keys(template.findResources('Custom::DataZoneGlossary'))[0];
    const terms = template.findResources('Custom::DataZoneGlossaryTerm');
    const termResource = Object.values(terms)[0];
    expect(termResource.DependsOn).toContain(glossaryLogicalId);
  });

  it('exposes the glossary and term custom resources for downstream dependency wiring', () => {
    const glossary = new MdaaDatazoneGlossary(
      testApp.testStack,
      'test-glossary',
      baseProps({ CustomerLifetimeValue: { description: 'CLV' } }),
    );

    expect(glossary.glossary).toBeDefined();
    expect(glossary.terms.CustomerLifetimeValue).toBeDefined();
  });

  it('should throw when the glossary name is empty', () => {
    expect(
      () => new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', { ...baseProps(), glossaryName: '' }),
    ).toThrow(/Glossary name must not be empty/);
  });

  it('should throw when a term name is empty', () => {
    expect(
      () => new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', baseProps({ '': { description: 'x' } })),
    ).toThrow(/has a term with an empty name/);
  });

  it('should throw when the glossary name contains a period', () => {
    expect(
      () => new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', { ...baseProps(), glossaryName: 'Sales.EU' }),
    ).toThrow(/Glossary name 'Sales.EU' must not contain '\.'/);
  });

  it('should throw when a term name contains a period', () => {
    expect(
      () =>
        new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', baseProps({ 'Churn.Risk': { description: 'x' } })),
    ).toThrow(/Term name 'Churn.Risk'.*must not contain '\.'/);
  });

  it('should throw when a term description exceeds 1024 characters', () => {
    expect(
      () =>
        new MdaaDatazoneGlossary(
          testApp.testStack,
          'test-glossary',
          baseProps({ CustomerLifetimeValue: { description: 'x'.repeat(1025) } }),
        ),
    ).toThrow(/description for term 'CustomerLifetimeValue'.*exceeds 1024 characters/);
  });

  it('should throw when a term readme exceeds 4096 characters', () => {
    expect(
      () =>
        new MdaaDatazoneGlossary(
          testApp.testStack,
          'test-glossary',
          baseProps({ CustomerLifetimeValue: { readme: 'x'.repeat(4097) } }),
        ),
    ).toThrow(/readme for term 'CustomerLifetimeValue'.*exceeds 4096 characters/);
  });

  it('should throw when relatesTo has more than 10 entries', () => {
    expect(
      () =>
        new MdaaDatazoneGlossary(
          testApp.testStack,
          'test-glossary',
          baseProps({
            CustomerLifetimeValue: { relatesTo: Array.from({ length: 11 }, (_, i) => `Term${i}`) },
          }),
        ),
    ).toThrow(/relatesTo for term 'CustomerLifetimeValue'.*declares 11 entries.*exceeds the maximum of 10/);
  });

  it('accepts exactly MAX_RELATES_TO entries', () => {
    const relatesTo = Array.from({ length: 10 }, (_, i) => `Term${i}`);
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', baseProps({ CustomerLifetimeValue: { relatesTo } }));

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneGlossaryTerm', {
      termName: 'CustomerLifetimeValue',
    });
  });

  it('should throw when relatesTo references the term itself (bare name)', () => {
    expect(
      () =>
        new MdaaDatazoneGlossary(
          testApp.testStack,
          'test-glossary',
          baseProps({ CustomerLifetimeValue: { relatesTo: ['CustomerLifetimeValue'] } }),
        ),
    ).toThrow(/relatesTo for term 'CustomerLifetimeValue'.*must not reference itself/);
  });

  it('should throw when relatesTo references the term itself (dotted glossary.term)', () => {
    expect(
      () =>
        new MdaaDatazoneGlossary(
          testApp.testStack,
          'test-glossary',
          baseProps({ CustomerLifetimeValue: { relatesTo: ['CustomerGlossary.CustomerLifetimeValue'] } }),
        ),
    ).toThrow(/relatesTo for term 'CustomerLifetimeValue'.*must not reference itself/);
  });

  it('grants the handler role CloudWatch Logs access scoped to both handlers log groups', () => {
    // handlerRole is reused verbatim (not built via MdaaLambdaRole), so MdaaCustomResource
    // does not grant it logs access on its own; this construct must do it directly.
    // Role.fromRoleArn with an account that differs from the test stack's own account
    // (used by baseProps above, account 123456789012 vs the stack's test-account) returns
    // an ImmutableRole, where addToPrincipalPolicy is a no-op; this test uses a same-account
    // role reference instead, to actually exercise the grant.
    const sameAccountRole = Role.fromRoleName(testApp.testStack, 'same-account-cr-role', 'cr-role');
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary', {
      ...baseProps({ CustomerLifetimeValue: { description: 'CLV' } }),
      handlerRole: sameAccountRole,
    });

    const template = Template.fromStack(testApp.testStack);
    // Exactly two resources: one per handler (glossary, glossary term), not just "at least one".
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: Match.arrayWith(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
            Resource: [
              Match.stringLikeRegexp('log-group:/aws/lambda/'),
              Match.stringLikeRegexp('log-group:/aws/lambda/'),
            ],
          }),
        ]),
      },
      Roles: Match.arrayWith(['cr-role']),
    });
  });

  it('grants handler role logs access only once per stack when multiple glossaries are created', () => {
    // Two separate imports of the same underlying role name, under distinct construct ids, so
    // each glossary gets a different IRole object. If they shared one IRole object (and thus
    // one imported-role construct), CDK's policy-statement minimization would collapse the two
    // identical statements on its own, and the dedup in grantHandlerLogs could be removed
    // without the test noticing.
    const roleA = Role.fromRoleName(testApp.testStack, 'cr-role-a', 'cr-role');
    const roleB = Role.fromRoleName(testApp.testStack, 'cr-role-b', 'cr-role');
    const shared = baseProps({ CustomerLifetimeValue: { description: 'CLV' } });
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary-1', { ...shared, handlerRole: roleA });
    new MdaaDatazoneGlossary(testApp.testStack, 'test-glossary-2', {
      ...shared,
      glossaryName: 'ProductGlossary',
      terms: { ChurnRisk: { description: 'Churn' } },
      handlerRole: roleB,
    });

    const template = Template.fromStack(testApp.testStack);
    // A grant per glossary would duplicate the same logs policy statement on the shared
    // 'cr-role' role; the once-per-stack dedup in grantHandlerLogs must produce exactly one
    // such policy, scoped to both glossaries' handler log groups in a single statement.
    const sharedRolePolicies = Object.values(template.findResources('AWS::IAM::Policy')).filter(policy =>
      (policy.Properties.Roles ?? []).includes('cr-role'),
    );
    expect(sharedRolePolicies).toHaveLength(1);
    expect(sharedRolePolicies[0].Properties.PolicyDocument.Statement).toHaveLength(1);
  });
});
