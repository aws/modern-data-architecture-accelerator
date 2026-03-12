/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnTagAssociation } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';
import { LFTagConfig } from './lakeformation-tags-l3-construct';
import { sanitizeId } from './utils';

export interface LakeFormationTagAssociationL3ConstructProps extends MdaaL3ConstructProps {
  /** Glue database name for tag association target */
  readonly databaseName: string;

  /** Tag configurations to associate with the database */
  readonly tagValues: LFTagConfig[];

  /** Reference to the construct that created project-level tags for dependency management */
  readonly projectLevelTagsConstruct?: Construct;

  /** Specific table names for targeted tag association */
  readonly tables?: string[];
}

export class LakeFormationTagAssociationL3Construct extends MdaaL3Construct {
  protected readonly props: LakeFormationTagAssociationL3ConstructProps;

  constructor(scope: Construct, id: string, props: LakeFormationTagAssociationL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Validate configuration
    if (!props.tagValues || props.tagValues.length === 0) {
      throw new Error(
        `LakeFormationTagAssociationL3Construct '${id}': tagValues must be specified and non-empty. Expected at least one LFTagConfig with tagKey and tagValues.`,
      );
    }

    if (!props.databaseName) {
      throw new Error(`LakeFormationTagAssociationL3Construct '${id}': databaseName must be specified.`);
    }

    // Create database tag association
    this.associateTagsToDatabase(props.databaseName, props.tagValues);

    // Create table tag associations if specified
    if (props.tables && props.tables.length > 0) {
      this.associateTagsToTables(props.databaseName, props.tables, props.tagValues);
    }
  }

  /**
   * Associate LF-Tags with a database
   */
  private associateTagsToDatabase(databaseName: string, tagValues: LFTagConfig[]): void {
    const tagAssociation = new CfnTagAssociation(this, `DatabaseTagAssociation`, {
      lfTags: this.buildTagPairs(tagValues),
      resource: {
        database: {
          catalogId: this.account,
          name: databaseName,
        },
      },
    });

    // Add dependency on project-level tags construct if provided
    if (this.props.projectLevelTagsConstruct) {
      tagAssociation.node.addDependency(this.props.projectLevelTagsConstruct);
    }
  }

  /**
   * Associate LF-Tags with specific tables in the database
   */
  private associateTagsToTables(databaseName: string, tables: string[], tagValues: LFTagConfig[]): void {
    for (const [index, tableName] of tables.entries()) {
      const tagAssociation = new CfnTagAssociation(this, `TableTagAssociation-${sanitizeId(tableName)}-${index}`, {
        lfTags: this.buildTagPairs(tagValues),
        resource: {
          table: {
            catalogId: this.account,
            databaseName: databaseName,
            name: tableName,
          },
        },
      });

      // Add dependency on project-level tags construct if provided
      if (this.props.projectLevelTagsConstruct) {
        tagAssociation.node.addDependency(this.props.projectLevelTagsConstruct);
      }
    }
  }

  /**
   * Build LFTagPairProperty list from tag configs
   */
  private buildTagPairs(tagValues: LFTagConfig[]): CfnTagAssociation.LFTagPairProperty[] {
    return tagValues.map(tagConfig => ({
      catalogId: tagConfig.catalogId || this.account,
      tagKey: tagConfig.tagKey,
      tagValues: this.normalizeTagValues(tagConfig.tagValues),
    }));
  }

  /**
   * Normalize tag values to ensure they are in array format
   */
  private normalizeTagValues(values: string | string[]): string[] {
    return Array.isArray(values) ? values : [values];
  }
}
