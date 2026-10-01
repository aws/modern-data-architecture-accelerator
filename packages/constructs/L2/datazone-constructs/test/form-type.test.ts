/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Role } from 'aws-cdk-lib/aws-iam';
import { FormFieldProps, MdaaDatazoneFormType, MdaaDatazoneFormTypeProps } from '../lib';

describe('MdaaDatazoneFormType', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  const baseProps = (fields: { [name: string]: FormFieldProps }): MdaaDatazoneFormTypeProps => ({
    naming: testApp.naming,
    domainIdentifier: 'dzd_testdomain',
    owningProjectIdentifier: 'prjtest123',
    formName: 'CustomerForm',
    fields,
    handlerRole: Role.fromRoleArn(testApp.testStack, 'cr-role', 'arn:aws:iam::123456789012:role/cr-role'),
  });

  it('creates the form type via a custom resource with defaulted ENABLED status', () => {
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', baseProps({ name: { type: 'String' } }));

    const template = Template.fromStack(testApp.testStack);
    // The form type is created via the DataZone API by a project-owner role, not as a
    // native AWS::DataZone::FormType (which the CFN execution role cannot create).
    template.resourceCountIs('AWS::DataZone::FormType', 0);
    template.resourceCountIs('Custom::DataZoneFormType', 1);
    template.hasResourceProperties('Custom::DataZoneFormType', {
      formName: 'CustomerForm',
      status: 'ENABLED',
      domainId: 'dzd_testdomain',
      owningProjectId: 'prjtest123',
    });
  });

  it('should not apply MDAA naming prefix to the form name', () => {
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', baseProps({ name: { type: 'String' } }));

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneFormType', { formName: 'CustomerForm' });
  });

  it('should honor an explicit DISABLED status', () => {
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', {
      ...baseProps({ name: { type: 'String' } }),
      status: 'DISABLED',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneFormType', { status: 'DISABLED' });
  });

  it('passes the description through to the custom resource when set', () => {
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', {
      ...baseProps({ name: { type: 'String' } }),
      description: 'Customer governance metadata',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneFormType', { description: 'Customer governance metadata' });
  });

  it('omits the description property when not set', () => {
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', baseProps({ name: { type: 'String' } }));

    const template = Template.fromStack(testApp.testStack);
    const forms = template.findResources('Custom::DataZoneFormType');
    const props = Object.values(forms)[0].Properties;
    expect(props.description).toBeUndefined();
  });

  it('passes the assembled structure (no namespace) to the custom resource', () => {
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', baseProps({ name: { type: 'String', required: true } }));

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneFormType', {
      domainId: 'dzd_testdomain',
      modelStructure: MdaaDatazoneFormType.assembleStructure('CustomerForm', {
        name: { type: 'String', required: true },
      }),
    });
  });

  it('should throw when no fields are supplied', () => {
    expect(() => new MdaaDatazoneFormType(testApp.testStack, 'test-form', baseProps({}))).toThrow(
      /must define at least one field/,
    );
  });

  it('grants the handler role CloudWatch Logs access scoped to its own log group', () => {
    // handlerRole is reused verbatim (not built via MdaaLambdaRole), so MdaaCustomResource
    // does not grant it logs access on its own; this construct must do it directly.
    // Role.fromRoleArn with an account matching the test stack's own account (used by
    // baseProps above) returns an ImmutableRole, where addToPrincipalPolicy is a no-op —
    // so this test uses a same-account role reference to actually exercise the grant.
    const sameAccountRole = Role.fromRoleName(testApp.testStack, 'same-account-cr-role', 'cr-role');
    new MdaaDatazoneFormType(testApp.testStack, 'test-form', {
      ...baseProps({ name: { type: 'String' } }),
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

  it('should throw when the form name is not a valid Smithy identifier', () => {
    expect(
      () =>
        new MdaaDatazoneFormType(testApp.testStack, 'test-form', {
          ...baseProps({ name: { type: 'String' } }),
          formName: 'customer-form',
        }),
    ).toThrow(/Metadata form name 'customer-form' must be a valid Smithy identifier/);
  });

  it('should throw when a field name is not a valid Smithy identifier', () => {
    expect(
      () => new MdaaDatazoneFormType(testApp.testStack, 'test-form', baseProps({ '1name': { type: 'String' } })),
    ).toThrow(/Field '1name' in metadata form 'CustomerForm' must be a valid Smithy identifier/);
  });

  it('should throw when a glossaryId is not a valid ID', () => {
    expect(
      () =>
        new MdaaDatazoneFormType(
          testApp.testStack,
          'test-form',
          baseProps({ tier: { type: 'String', glossaryId: 'bad")id' } }),
        ),
    ).toThrow(/glossaryId 'bad"\)id' on field 'CustomerForm.tier' is not a valid ID/);
  });

  describe('assembleStructure', () => {
    it('sets the structure name to the form name (no namespace)', () => {
      const model = MdaaDatazoneFormType.assembleStructure('CustomerForm', {
        name: { type: 'String' },
      });
      expect(model).not.toContain('namespace');
      expect(model).toContain('structure CustomerForm {');
      expect(model).toContain('name: smithy.api#String');
    });

    it('emits the @required trait for required fields', () => {
      const model = MdaaDatazoneFormType.assembleStructure('F', {
        name: { type: 'String', required: true },
      });
      expect(model).toContain('@required');
    });

    it('emits the searchable trait with modes', () => {
      const model = MdaaDatazoneFormType.assembleStructure('F', {
        tier: { type: 'String', searchable: ['TECHNICAL', 'LEXICAL'] },
      });
      expect(model).toContain('@amazon.datazone#searchable(modes:["TECHNICAL", "LEXICAL"])');
    });

    it('emits the glossaryterm trait', () => {
      const model = MdaaDatazoneFormType.assembleStructure('F', {
        category: { type: 'String', glossaryId: 'gloss123' },
      });
      expect(model).toContain('@amazon.datazone#glossaryterm("gloss123")');
    });

    it('maps each field type to its smithy prelude shape', () => {
      const model = MdaaDatazoneFormType.assembleStructure('F', {
        s: { type: 'String' },
        b: { type: 'Boolean' },
        i: { type: 'Integer' },
        l: { type: 'Long' },
        f: { type: 'Float' },
        d: { type: 'Double' },
        t: { type: 'Timestamp' },
      });
      expect(model).toContain('s: smithy.api#String');
      expect(model).toContain('b: smithy.api#Boolean');
      expect(model).toContain('i: smithy.api#Integer');
      expect(model).toContain('l: smithy.api#Long');
      expect(model).toContain('f: smithy.api#Float');
      expect(model).toContain('d: smithy.api#Double');
      expect(model).toContain('t: smithy.api#Timestamp');
    });
  });
});
