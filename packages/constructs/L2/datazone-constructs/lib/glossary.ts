/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { grantHandlerLogs } from './private/handler-logs';

// Shared by the custom resource props and the handler log-group names below.
const GLOSSARY_RESOURCE_TYPE = 'DataZoneGlossary';
const GLOSSARY_TERM_RESOURCE_TYPE = 'DataZoneGlossaryTerm';
// Id of the once-per-stack marker recording that the handlers' logs grant exists.
const HANDLER_LOGS_GRANT_ID = 'glossary-handler-logs-grant';

export interface GlossaryTermProps {
  /**
   * Short, business-facing definition of the term. Maps to the DataZone API's
   * `shortDescription` field.
   *
   * Validation: Optional; string; max 1024 chars
   *
   * @maxLength 1024
   */
  readonly description?: string;
  /**
   * Longer-form Markdown documentation for the term (calculation methodology, data
   * sources, usage guidelines, etc.), shown as the term's README in SageMaker Unified
   * Studio. Maps to the DataZone API's `longDescription` field.
   *
   * Validation: Optional; string; max 4096 chars
   *
   * @maxLength 4096
   */
  readonly readme?: string;
  /**
   * Other declared terms this term "is a type of" (DataZone's `termRelations.isA`).
   * Each entry is a bare `"<termName>"` for a term in this same glossary, or
   * `"<glossaryName>.<termName>"` for a term in another glossary declared by the same
   * project; a bare entry matching no declared term is passed through as a literal,
   * pre-existing term ID. SageMaker Unified Studio shows the inverse relationship
   * ("Has Types") on the related term automatically.
   *
   * This `MdaaDatazoneGlossary` construct only validates this field (count,
   * self-reference) - it never resolves a reference or creates the DataZone
   * relationship itself. Resolving names and creating the relationship (via a
   * follow-up `MdaaDatazoneGlossaryTermRelations`, since a related term may belong to
   * a different, independently-constructed glossary) is done by the L3 layer
   * (`SagemakerProjectL3Construct`); a plain `MdaaDatazoneGlossary` consumer that sets
   * `relatesTo` directly gets no relationship in DataZone unless it also builds that
   * wiring itself.
   *
   * Validation: Optional; array of string; max 10 entries; no self-reference; rejects
   * cycles across declared terms (enforced by the L3 layer)
   *
   * @maxItems 10
   */
  readonly relatesTo?: string[];
  /**
   * Term status. DISABLED terms are retained but not attachable to assets or fields.
   *
   * Validation: Optional; 'ENABLED' | 'DISABLED'
   * @default ENABLED
   */
  readonly status?: 'ENABLED' | 'DISABLED';
}

export interface MdaaDatazoneGlossaryProps extends MdaaConstructProps {
  /**
   * The DataZone (SMUS) domain ID in which the glossary is created.
   */
  readonly domainIdentifier: string;
  /**
   * The DataZone project ID that owns the glossary.
   */
  readonly owningProjectIdentifier: string;
  /**
   * The glossary name, used verbatim as the CreateGlossary `name`. Must be unique
   * within the domain (enforced by the DataZone API, not by MDAA at synth time).
   */
  readonly glossaryName: string;
  /**
   * Terms to create under this glossary. The map key is the term name.
   *
   * @default - no terms are created
   */
  readonly terms?: { [termName: string]: GlossaryTermProps };
  /**
   * Human-readable description of the glossary.
   *
   * @default - no description
   */
  readonly description?: string;
  /**
   * Glossary status. DISABLED glossaries are retained but not attachable.
   *
   * @default ENABLED
   */
  readonly status?: 'ENABLED' | 'DISABLED';
  /**
   * IAM role used to create the glossary and its terms via the DataZone API. DataZone
   * requires the `CreateGlossary` caller to be an owner/member of the owning project,
   * which the default CloudFormation execution role is not. This role must be a
   * `PROJECT_OWNER` of `owningProjectIdentifier`; the domain custom-resource role
   * (which MDAA already makes a project owner) satisfies this.
   */
  readonly handlerRole: IRole;
}

/**
 * A construct which creates a DataZone (SMUS) business glossary and its terms. Unlike
 * form types, glossaries are identified by a server-assigned ID rather than their name,
 * so the glossary's deploy-time ID is exposed for other constructs (e.g. a metadata
 * form field's `glossaryId`) to reference; each term's custom resource is exposed too,
 * so dependents can wait for it to exist.
 */
export class MdaaDatazoneGlossary extends Construct {
  // DataZone/SageMaker Unified Studio allows at most 10 relationships per relationship type.
  public static readonly MAX_RELATES_TO = 10;

  public readonly glossary: CustomResource;
  public readonly terms: { [termName: string]: CustomResource } = {};

  constructor(scope: Construct, id: string, props: MdaaDatazoneGlossaryProps) {
    super(scope, id);

    const terms = props.terms ?? {};
    MdaaDatazoneGlossary.validate(props.glossaryName, terms);

    const glossaryCrProps: MdaaCustomResourceProps = {
      resourceType: GLOSSARY_RESOURCE_TYPE,
      code: Code.fromAsset(`${__dirname}/../src/lambda/create_glossary`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'create_glossary.lambda_handler',
      handlerRole: props.handlerRole,
      handlerProps: {
        domainId: props.domainIdentifier,
        owningProjectId: props.owningProjectIdentifier,
        glossaryName: props.glossaryName,
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
    this.glossary = new MdaaCustomResource(this, 'glossary', glossaryCrProps);
    const glossaryId = this.glossary.getAttString('glossaryId');

    Object.entries(terms).forEach(([termName, termProps]) => {
      const termCrProps: MdaaCustomResourceProps = {
        resourceType: GLOSSARY_TERM_RESOURCE_TYPE,
        code: Code.fromAsset(`${__dirname}/../src/lambda/create_glossary_term`),
        runtime: Runtime.PYTHON_3_14,
        handler: 'create_glossary_term.lambda_handler',
        handlerRole: props.handlerRole,
        handlerProps: {
          domainId: props.domainIdentifier,
          glossaryId: glossaryId,
          termName: termName,
          status: termProps.status ?? 'ENABLED',
          ...(termProps.description ? { shortDescription: termProps.description } : {}),
          ...(termProps.readme ? { longDescription: termProps.readme } : {}),
        },
        naming: props.naming,
        pascalCaseProperties: false,
        handlerTimeout: Duration.seconds(300),
        environment: {
          LOG_LEVEL: 'INFO',
        },
      };
      const term = new MdaaCustomResource(this, `term-${termName}`, termCrProps);
      // DeleteGlossary requires zero attached terms, so terms must be deleted before their
      // glossary. CloudFormation deletes dependents before dependencies, so this dependency
      // also fixes delete ordering, not just create ordering.
      term.node.addDependency(this.glossary);
      this.terms[termName] = term;
    });

    grantHandlerLogs(
      this,
      props.handlerRole,
      props.naming,
      [GLOSSARY_RESOURCE_TYPE, GLOSSARY_TERM_RESOURCE_TYPE],
      HANDLER_LOGS_GRANT_ID,
    );
  }

  private static validate(glossaryName: string, terms: { [termName: string]: GlossaryTermProps }): void {
    if (glossaryName.length === 0) {
      throw new Error('Glossary name must not be empty');
    }
    // '.' is reserved as the glossary.term separator in a metadata form field's `glossaryId`
    // reference; a glossary or term name containing it could never be referenced that way.
    if (glossaryName.includes('.')) {
      throw new Error(`Glossary name '${glossaryName}' must not contain '.'`);
    }
    Object.entries(terms).forEach(([termName, termProps]) => {
      MdaaDatazoneGlossary.validateTerm(glossaryName, termName, termProps);
    });
  }

  private static validateTerm(glossaryName: string, termName: string, termProps: GlossaryTermProps): void {
    if (termName.length === 0) {
      throw new Error(`Glossary '${glossaryName}' has a term with an empty name`);
    }
    if (termName.includes('.')) {
      throw new Error(`Term name '${termName}' in glossary '${glossaryName}' must not contain '.'`);
    }
    if (termProps.description && termProps.description.length > 1024) {
      throw new Error(`description for term '${termName}' in glossary '${glossaryName}' exceeds 1024 characters`);
    }
    if (termProps.readme && termProps.readme.length > 4096) {
      throw new Error(`readme for term '${termName}' in glossary '${glossaryName}' exceeds 4096 characters`);
    }
    const relatesTo = termProps.relatesTo ?? [];
    if (relatesTo.length > MdaaDatazoneGlossary.MAX_RELATES_TO) {
      throw new Error(
        `relatesTo for term '${termName}' in glossary '${glossaryName}' declares ${relatesTo.length} entries, ` +
          `which exceeds the maximum of ${MdaaDatazoneGlossary.MAX_RELATES_TO}`,
      );
    }
    if (relatesTo.includes(termName) || relatesTo.includes(`${glossaryName}.${termName}`)) {
      throw new Error(`relatesTo for term '${termName}' in glossary '${glossaryName}' must not reference itself`);
    }
  }
}
