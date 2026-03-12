/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnTag } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';
import { sanitizeId } from './utils';

export interface LFTagConfig {
  /** Lake Formation tag key name */
  readonly tagKey: string;

  /** Allowed values for the tag */
  readonly tagValues: string[];

  /** AWS account ID for tag catalog scope */
  readonly catalogId?: string;
}

export interface LakeFormationTagsL3ConstructProps extends MdaaL3ConstructProps {
  /** Array of Lake Formation tag configurations */
  readonly lfTags: LFTagConfig[];
}

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
