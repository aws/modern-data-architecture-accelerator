/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnTag } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';
import { sanitizeId } from './utils';

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation tag configuration interface for tag-based access control enabling fine-grained data governance and resource classification. Defines LF-Tag properties including tag key, allowed values, and catalog scope for implementing attribute-based access control (ABAC) in Lake Formation data governance.
 *
 * Use cases: Tag-based access control; Data governance; Resource classification; Attribute-based permissions; Data catalog organization; Fine-grained access control
 *
 * AWS: AWS Lake Formation tag configuration for tag-based access control and data governance
 *
 * Validation: tagKey must be unique within catalog; tagValues must be non-empty array; catalogId must be valid AWS account ID if specified
 */
export interface LFTagConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required Lake Formation tag key name for resource classification and access control enabling tag-based data governance. Defines the tag key that will be used to classify data resources and control access through Lake Formation tag-based permissions.
   *
   * Use cases: Resource classification; Tag-based access control; Data governance; Permission management; Resource organization
   *
   * AWS: AWS Lake Formation tag key for tag-based access control and resource classification
   *
   * Validation: Must be unique tag key string within catalog; required for tag creation and access control
   **/
  readonly tagKey: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of allowed values for Lake Formation tag enabling controlled vocabulary and consistent resource classification. Defines the permitted values that can be assigned to this tag key for systematic data governance and access control.
   *
   * Use cases: Controlled vocabulary; Consistent classification; Value constraints; Data governance; Access control values
   *
   * AWS: AWS Lake Formation tag allowed values for controlled vocabulary and consistent classification
   *
   * Validation: Must be non-empty string array; required for tag value constraints and governance
   **/
  readonly tagValues: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional AWS account ID for Lake Formation tag catalog scope enabling cross-account tag management and governance. Specifies the catalog where the tag will be created, defaulting to current account for local tag management.
   *
   * Use cases: Cross-account governance; Catalog scope; Multi-account tags; Centralized governance; Account-specific tags
   *
   * AWS: AWS Lake Formation catalog ID for tag scope and cross-account governance
   *
   * Validation: Must be valid 12-digit AWS account ID if specified; defaults to current account
   **/
  readonly catalogId?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation Tags L3 Construct properties interface for creating LF-Tags at account level. Defines construct properties for tag creation only, without handling tag associations to resources. Use LakeFormationTagAssociationL3Construct for associating tags to databases and tables.
 *
 * Use cases: Tag creation; Tag vocabulary definition; Centralized tag management; Account-level tag governance
 *
 * AWS: AWS Lake Formation tags construct configuration for tag creation at account level
 *
 * Validation: lfTags must be non-empty array; tags are created at account level
 */
export interface LakeFormationTagsL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Lake Formation tag configurations for tag creation at account level. Defines the LF-Tags that will be created for implementing tag-based permissions and resource classification across the account.
   *
   * Use cases: Tag creation; Tag vocabulary; Access control definition; Data governance; Resource classification
   *
   * AWS: AWS Lake Formation tag configurations for account-level tag creation
   *
   * Validation: Must be non-empty array of LFTagConfig; required for tag creation
   **/
  readonly lfTags: LFTagConfig[];
}

/**
 * Q-ENHANCED-CLASS
 * Lake Formation Tags L3 Construct for creating LF-Tags at account level. Creates Lake Formation tags that define the tag vocabulary for tag-based access control (TBAC) without handling tag associations. Use LakeFormationTagAssociationL3Construct to associate these tags to databases and tables.
 *
 * Behavior:
 * - Creates LF-Tags at the account level for centralized tag management
 * - Does NOT create tag associations (use LakeFormationTagAssociationL3Construct for that)
 * - Creates CloudFormation outputs and SSM parameters for tag tracking
 * - Tags are reusable across multiple databases and tables
 *
 * Use cases: Tag vocabulary definition; Centralized tag management; Account-level tag governance; Tag creation
 *
 * AWS: AWS Lake Formation tags for account-level tag vocabulary and governance
 *
 * Validation: lfTags must be non-empty; tags are created at account level
 */
export class LakeFormationTagsL3Construct extends MdaaL3Construct {
  protected readonly props: LakeFormationTagsL3ConstructProps;
  private readonly createdTags: Map<string, CfnTag> = new Map();

  constructor(scope: Construct, id: string, props: LakeFormationTagsL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Validate configuration
    if (!props.lfTags || props.lfTags.length === 0) {
      throw new Error(
        `LakeFormationTagsL3Construct '${id}': lfTags must be specified and non-empty. Expected at least one LFTagConfig with tagKey and tagValues.`,
      );
    }

    // Create LF-Tags at account level
    this.createLFTags(props.lfTags);

    // Create outputs
    this.createOutputs();
  }

  /**
   * Create Lake Formation tags at the account level
   */
  private createLFTags(lfTags: LFTagConfig[]): void {
    for (const tagConfig of lfTags) {
      const tagKey = tagConfig.tagKey;
      const tagValues = this.normalizeTagValues(tagConfig.tagValues);
      const catalogId = tagConfig.catalogId || this.account;

      // Create LF-Tag
      const tag = new CfnTag(this, `LFTag-${sanitizeId(tagKey)}`, {
        catalogId: catalogId,
        tagKey: tagKey,
        tagValues: tagValues,
      });

      this.createdTags.set(tagKey, tag);
    }
  }

  /**
   * Normalize tag values to ensure they are in array format
   */
  private normalizeTagValues(values: string | string[]): string[] {
    return Array.isArray(values) ? values : [values];
  }

  /**
   * Create CloudFormation outputs
   */
  private createOutputs(): void {
    new MdaaParamAndOutput(this, {
      resourceType: 'lakeformation-tags',
      name: 'tags-created',
      value: this.createdTags.size.toString(),
      ...this.props,
    });
  }
}
