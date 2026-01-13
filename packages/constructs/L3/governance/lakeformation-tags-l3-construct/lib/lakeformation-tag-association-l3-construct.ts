/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnTagAssociation } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';
import { LFTagConfig } from './lakeformation-tags-l3-construct';
import { sanitizeId } from './utils';

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation Tag Association L3 Construct properties interface for associating existing LF-Tags to data resources. Defines properties for creating tag associations to databases and tables without creating the tags themselves, enabling separation of tag creation from tag application.
 *
 * Use cases: Tag association; Database classification; Table tagging; Resource classification; Decoupled tag management
 *
 * AWS: AWS Lake Formation tag association configuration for applying existing tags to resources
 *
 * Validation: databaseName must be valid database; tagValues must reference existing tags; projectLevelTagsConstruct provides dependency management
 */
export interface LakeFormationTagAssociationL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required Glue database name for Lake Formation tag association target. Specifies the database where tags will be associated for implementing tag-based access control and data governance.
   *
   * Use cases: Database classification; Tag association target; Resource identification; Data governance scope
   *
   * AWS: AWS Glue database name for Lake Formation tag association
   *
   * Validation: Must be valid Glue database name; database must exist before association
   **/
  readonly databaseName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of tag configurations specifying which tag values to associate with the database. Defines the specific tag key-value pairs that should be assigned to this database for classification and access control.
   *
   * Use cases: Database classification; Specific value assignment; Resource tagging; Access control configuration
   *
   * AWS: AWS Lake Formation tag values for database resource classification
   *
   * Validation: Tag keys must exist in the account; tag values must be valid values from tag definitions
   **/
  readonly tagValues: LFTagConfig[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional reference to the construct that created the project-level tags for dependency management. When provided, ensures tag associations are created after tags exist, preventing deployment ordering issues.
   *
   * Use cases: Dependency management; Deployment ordering; Tag existence guarantee; Resource dependencies
   *
   * AWS: CDK construct dependency for Lake Formation tag creation ordering
   *
   * Validation: Must be valid Construct reference; ensures tags exist before associations
   **/
  readonly projectLevelTagsConstruct?: Construct;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of specific table names for Lake Formation tag association enabling targeted table classification. When specified, creates tag associations for these specific tables within the database.
   *
   * Use cases: Table-level tagging; Granular classification; Selective table access; Fine-grained governance
   *
   * AWS: AWS Lake Formation table names for targeted tag association
   *
   * Validation: Tables must exist in database; only used when table-level tagging is needed
   **/
  readonly tables?: string[];
}

/**
 * Q-ENHANCED-CLASS
 * Lake Formation Tag Association L3 Construct for associating existing LF-Tags to databases and tables. Creates CfnTagAssociation resources to apply tag values to data resources without creating the tags themselves, enabling clean separation between tag creation and tag application.
 *
 * Behavior:
 * - Does NOT create LF-Tags (assumes they already exist)
 * - Creates CfnTagAssociation resources for database and/or tables
 * - Automatically manages dependencies on project-level tag construct if provided
 * - Supports both database-level and table-level tag associations
 * - No CloudFormation outputs (associations are internal resources)
 *
 * Use cases: Database classification; Table tagging; Tag application; Resource classification; Decoupled tag management
 *
 * AWS: AWS Lake Formation tag associations for applying existing tags to data resources
 *
 * Validation: tagValues must be non-empty; databaseName must be valid; tags must exist before association
 */
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
