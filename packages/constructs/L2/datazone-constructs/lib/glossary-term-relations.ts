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
import { MdaaDatazoneGlossary } from './glossary';

const TERM_RELATIONS_RESOURCE_TYPE = 'DataZoneGlossaryTermRelations';
const HANDLER_LOGS_GRANT_ID = 'glossary-term-relations-handler-logs-grant';

export interface MdaaDatazoneGlossaryTermRelationsProps extends MdaaConstructProps {
  /**
   * The DataZone (SMUS) domain ID the term belongs to.
   */
  readonly domainIdentifier: string;
  /**
   * The deploy-time ID of the term whose relationships are being set.
   */
  readonly termId: string;
  /**
   * The deploy-time IDs of the terms this term "is a type of". DataZone's
   * `termRelations.isA` requires 1 to `MdaaDatazoneGlossary.MAX_RELATES_TO` entries;
   * this construct validates that range itself.
   */
  readonly relatedTermIds: string[];
  /**
   * IAM role used to call UpdateGlossaryTerm. Must be a `PROJECT_OWNER` of the owning
   * term's project, same requirement as `MdaaDatazoneGlossaryProps.handlerRole`.
   */
  readonly handlerRole: IRole;
}

/**
 * A construct which sets a single DataZone (SMUS) business glossary term's `isA` term
 * relationships via a follow-up `UpdateGlossaryTerm` call. Kept separate from the term's own
 * create_glossary_term custom resource because a related term may belong to a different,
 * independently-constructed glossary within the same project, so relationships can only be
 * resolved once every glossary/term in the project exists. The caller must wire this
 * construct's CloudFormation dependency on the owning term's and every related term's custom
 * resource, so relationships are only set once all referenced terms exist, and (on delete)
 * cleared before any of them can be deleted.
 */
export class MdaaDatazoneGlossaryTermRelations extends Construct {
  public readonly resource: CustomResource;

  constructor(scope: Construct, id: string, props: MdaaDatazoneGlossaryTermRelationsProps) {
    super(scope, id);

    MdaaDatazoneGlossaryTermRelations.validate(props.termId, props.relatedTermIds);

    const crProps: MdaaCustomResourceProps = {
      resourceType: TERM_RELATIONS_RESOURCE_TYPE,
      code: Code.fromAsset(`${__dirname}/../src/lambda/update_glossary_term_relations`),
      runtime: Runtime.PYTHON_3_14,
      handler: 'update_glossary_term_relations.lambda_handler',
      handlerRole: props.handlerRole,
      handlerProps: {
        domainId: props.domainIdentifier,
        termId: props.termId,
        relatedTermIds: props.relatedTermIds,
      },
      naming: props.naming,
      pascalCaseProperties: false,
      handlerTimeout: Duration.seconds(300),
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };
    this.resource = new MdaaCustomResource(this, 'term-relations', crProps);

    grantHandlerLogs(this, props.handlerRole, props.naming, [TERM_RELATIONS_RESOURCE_TYPE], HANDLER_LOGS_GRANT_ID);
  }

  private static validate(termId: string, relatedTermIds: string[]): void {
    if (relatedTermIds.length === 0 || relatedTermIds.length > MdaaDatazoneGlossary.MAX_RELATES_TO) {
      throw new Error(
        `relatedTermIds for term '${termId}' declares ${relatedTermIds.length} entries; DataZone's ` +
          `termRelations.isA requires between 1 and ${MdaaDatazoneGlossary.MAX_RELATES_TO}`,
      );
    }
  }
}
