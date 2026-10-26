/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration, Token } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { grantHandlerLogs } from './private/handler-logs';

const SMITHY_FIELD_TYPES: { [type: string]: string } = {
  String: 'smithy.api#String',
  Boolean: 'smithy.api#Boolean',
  Integer: 'smithy.api#Integer',
  Long: 'smithy.api#Long',
  Float: 'smithy.api#Float',
  Double: 'smithy.api#Double',
  Timestamp: 'smithy.api#Timestamp',
};

// Smithy shape/member identifier: letter or underscore first, then word characters.
const SMITHY_IDENTIFIER = /^[A-Za-z_]\w*$/;
// DataZone glossary IDs are alphanumeric with '-' / '_' (^[a-zA-Z0-9_-]{1,36}$).
const GLOSSARY_ID = /^[\w-]{1,36}$/;

// Shared by the custom resource props and the handler log-group name below.
const CUSTOM_RESOURCE_TYPE = 'DataZoneFormType';
// Id of the once-per-stack marker recording that the handler's logs grant exists.
const HANDLER_LOGS_GRANT_ID = 'form-type-handler-logs-grant';

export interface FormFieldProps {
  /**
   * Smithy prelude type for the field (e.g. String, Boolean, Integer).
   *
   * Validation: Required; one of String | Boolean | Integer | Long | Float | Double | Timestamp
   */
  readonly type: 'String' | 'Boolean' | 'Integer' | 'Long' | 'Float' | 'Double' | 'Timestamp';
  /**
   * Human-readable description of the field, annotated via the Smithy `@documentation`
   * trait. Lets stewards see what the field means when the form is attached to an asset.
   *
   * Validation: Optional; string
   * @default - no description
   */
  readonly description?: string;
  /**
   * When true, the field is annotated `@required` and must be populated when the
   * form is attached to an asset.
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly required?: boolean;
  /**
   * Search indexing modes for the field, annotated via `@amazon.datazone#searchable`.
   * LEXICAL enables stemmed/partial matches (disables semantic search); TECHNICAL
   * indexes for technical identifier search. Omit for no explicit indexing.
   *
   * Validation: Optional; array of 'LEXICAL' | 'TECHNICAL'
   */
  readonly searchable?: ('LEXICAL' | 'TECHNICAL')[];
  /**
   * Glossary ID this field is linked to, annotated via
   * `@amazon.datazone#glossaryterm("<id>")`. Makes the field filterable via the
   * Search/SearchListings APIs. May be a literal, pre-existing glossary ID, or a
   * deploy-time-resolved value from a declared `glossaries` reference; deploy-time
   * values are not synth-time validated since their resolved value isn't known
   * until deploy.
   *
   * Validation: Optional; valid DataZone glossary ID (unless resolved from a
   * deploy-time `glossaries` reference)
   */
  readonly glossaryId?: string;
}

export interface MdaaDatazoneFormTypeProps extends MdaaConstructProps {
  /**
   * The DataZone (SMUS) domain ID in which the form type is created. Passed as the
   * CreateFormType `domainIdentifier` and used to derive the Smithy model namespace
   * (the lambda replaces hyphens with underscores, which Smithy namespaces require).
   */
  readonly domainIdentifier: string;
  /**
   * The DataZone project ID that owns the form type. Form types are always owned
   * by a project even though they are usable across the domain.
   */
  readonly owningProjectIdentifier: string;
  /**
   * The form type name. Must be a valid Smithy structure name and is used verbatim
   * as both the CreateFormType `name` and the generated `structure <name>`. MDAA
   * naming prefixes are intentionally NOT applied — the service requires the name
   * to match the structure declared in the model.
   */
  readonly formName: string;
  /**
   * Field definitions for the form. Each entry becomes a member of the generated
   * Smithy structure. Declaration order is preserved.
   */
  readonly fields: { [fieldName: string]: FormFieldProps };
  /**
   * Human-readable description of the form type.
   *
   * @default - no description
   */
  readonly description?: string;
  /**
   * Form type status.
   *
   * @default ENABLED
   */
  readonly status?: 'ENABLED' | 'DISABLED';
  /**
   * IAM role used to create the form type via the DataZone API. DataZone requires
   * the `CreateFormType` caller to be an owner/member of the owning project, which
   * the default CloudFormation execution role is not. This role must be a
   * `PROJECT_OWNER` of `owningProjectIdentifier` — the domain custom-resource role
   * (which MDAA already makes a project owner) satisfies this.
   */
  readonly handlerRole: IRole;
}

/**
 * A construct which creates a compliant DataZone (SMUS) metadata form type from a
 * declarative field specification. The Smithy model is assembled by MDAA so that
 * config authors do not need to write Smithy or embed the deploy-time domain ID.
 */
export class MdaaDatazoneFormType extends Construct {
  public readonly formType: MdaaCustomResource;

  constructor(scope: Construct, id: string, props: MdaaDatazoneFormTypeProps) {
    super(scope, id);

    MdaaDatazoneFormType.validate(props.formName, props.fields);

    const modelStructure = MdaaDatazoneFormType.assembleStructure(props.formName, props.fields);

    // Created via a custom resource under handlerRole (a project owner) because the CloudFormation
    // execution role can't call CreateFormType. The lambda prepends the Smithy namespace (the domain
    // ID, hyphens replaced by underscores), since it isn't known at synth time.
    const crProps: MdaaCustomResourceProps = {
      resourceType: CUSTOM_RESOURCE_TYPE,
      code: Code.fromAsset(`${__dirname}/../src/lambda/create_form_type`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'create_form_type.lambda_handler',
      handlerRole: props.handlerRole,
      handlerProps: {
        domainId: props.domainIdentifier,
        owningProjectId: props.owningProjectIdentifier,
        formName: props.formName,
        modelStructure: modelStructure,
        status: props.status ?? 'ENABLED',
        ...(props.description ? { description: props.description } : {}),
      },
      naming: props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(300),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    this.formType = new MdaaCustomResource(this, 'form-type', crProps);
    grantHandlerLogs(this, props.handlerRole, props.naming, [CUSTOM_RESOURCE_TYPE], HANDLER_LOGS_GRANT_ID);
  }

  /**
   * Validates the form at synth time. Form and field names are interpolated into the
   * Smithy model as identifiers, and glossary IDs as string literals, so invalid values
   * would otherwise only surface as a CreateFormType failure at deploy time.
   */
  private static validate(formName: string, fields: { [fieldName: string]: FormFieldProps }): void {
    if (!SMITHY_IDENTIFIER.test(formName)) {
      throw new Error(`Metadata form name '${formName}' must be a valid Smithy identifier (${SMITHY_IDENTIFIER})`);
    }
    if (Object.keys(fields).length === 0) {
      throw new Error(`Metadata form '${formName}' must define at least one field`);
    }
    Object.entries(fields).forEach(([fieldName, fieldProps]) => {
      if (!SMITHY_IDENTIFIER.test(fieldName)) {
        throw new Error(
          `Field '${fieldName}' in metadata form '${formName}' must be a valid Smithy identifier (${SMITHY_IDENTIFIER})`,
        );
      }
      if (
        fieldProps.glossaryId !== undefined &&
        !Token.isUnresolved(fieldProps.glossaryId) &&
        !GLOSSARY_ID.test(fieldProps.glossaryId)
      ) {
        throw new Error(`glossaryId '${fieldProps.glossaryId}' on field '${formName}.${fieldName}' is not a valid ID`);
      }
    });
  }

  /**
   * Assembles the Smithy `structure` block for the form type (without a namespace).
   * The namespace is prepended at deploy time by the create_form_type lambda, which
   * derives it from the resolved domain ID (Smithy disallows hyphens in namespaces,
   * so the lambda replaces them with underscores).
   */
  public static assembleStructure(formName: string, fields: { [fieldName: string]: FormFieldProps }): string {
    const members = Object.entries(fields).map(([fieldName, fieldProps]) => {
      const traits: string[] = [];
      if (fieldProps.description) {
        traits.push(`    @documentation(${JSON.stringify(fieldProps.description)})`);
      }
      if (fieldProps.required) {
        traits.push('    @required');
      }
      if (fieldProps.searchable && fieldProps.searchable.length > 0) {
        const modes = fieldProps.searchable.map(mode => `"${mode}"`).join(', ');
        traits.push(`    @amazon.datazone#searchable(modes:[${modes}])`);
      }
      if (fieldProps.glossaryId) {
        traits.push(`    @amazon.datazone#glossaryterm("${fieldProps.glossaryId}")`);
      }
      const smithyType = SMITHY_FIELD_TYPES[fieldProps.type];
      return [...traits, `    ${fieldName}: ${smithyType}`].join('\n');
    });

    return `structure ${formName} {\n${members.join('\n')}\n}`;
  }
}
