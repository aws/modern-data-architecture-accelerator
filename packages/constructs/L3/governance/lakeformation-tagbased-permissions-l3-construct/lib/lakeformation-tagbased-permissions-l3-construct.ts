/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnPrincipalPermissions } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-TYPE
 * Lake Formation tag expression type for tag-based permission filtering enabling attribute-based access control (ABAC) and fine-grained data governance. Maps LF-Tag keys to their allowed values for defining resource access patterns through tag-based permissions.
 *
 * Use cases: Tag-based filtering; ABAC implementation; Permission scoping; Resource selection; Fine-grained access control; Data governance
 *
 * AWS: AWS Lake Formation tag expression for tag-based permission filtering and ABAC
 *
 * Example: { environment: ['dev', 'test'], data_tier: ['bronze', 'silver'] }
 *
 * Validation: Keys must be valid LF-Tag keys; values must be string or string array of allowed tag values
 */
export type LFTagExpression = Record<string, string | string[]>;

/**
 * Q-ENHANCED-TYPE
 * Named principal ARNs mapping type for systematic IAM principal management and permission assignment. Maps descriptive principal names to their IAM ARNs for organized permission grant management and clear principal identification.
 *
 * Use cases: Principal management; Permission assignment; IAM organization; Grant management; Principal identification
 *
 * AWS: IAM principal ARN mapping for Lake Formation permission grants
 *
 * Example: { dataAnalyst: 'arn:aws:iam::123456789012:role/DataAnalyst', dataScientist: 'arn:aws:iam::123456789012:role/DataScientist' }
 *
 * Validation: Keys must be descriptive names; values must be valid IAM principal ARNs
 */
export type NamedPrincipalArns = Record<string, string>;

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation tag-based grant configuration interface for implementing fine-grained permissions through LF-Tag expressions. Defines grant properties including principals, permissions, resource types, and tag expressions for systematic tag-based access control and data governance.
 *
 * Use cases: Tag-based permissions; Fine-grained access control; ABAC implementation; Permission management; Data governance; Resource access control
 *
 * AWS: AWS Lake Formation tag-based permission grant configuration for ABAC and data governance
 *
 * Validation: principalArns must be non-empty; permissions must be valid LF permissions; lfTagExpression must be valid tag expression
 */
export interface TagBasedGrantConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required mapping of principal names to IAM ARNs for Lake Formation permission grant assignment enabling organized principal management. Defines the IAM principals that will receive tag-based permissions for data access and governance operations.
   *
   * Use cases: Principal assignment; Permission recipients; IAM integration; Access control; Principal management
   *
   * AWS: IAM principal ARNs for Lake Formation tag-based permission grants
   *
   * Validation: Must be non-empty NamedPrincipalArns; ARNs must be valid IAM principal ARNs; required for permission grants
   **/
  readonly principalArns: NamedPrincipalArns;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Lake Formation permissions to grant enabling data access and governance operations. Defines the specific LF permissions that principals will receive for resources matching the tag expression.
   *
   * Use cases: Permission definition; Access control; Data operations; Governance permissions; Resource access
   *
   * AWS: AWS Lake Formation permissions for data access and governance operations
   *
   * Examples: ['DESCRIBE', 'SELECT'], ['DESCRIBE', 'ALTER', 'CREATE_TABLE'], ['ALL']
   *
   * Validation: Must be non-empty array of valid Lake Formation permission strings; required for access control
   **/
  readonly permissions: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lake Formation permissions with grant option enabling permission delegation and administrative capabilities. Defines permissions that can be further granted by the recipient principals to other principals.
   *
   * Use cases: Permission delegation; Administrative access; Grant management; Permission propagation; Delegated administration
   *
   * AWS: AWS Lake Formation permissions with grant option for permission delegation
   *
   * Validation: Must be array of valid Lake Formation permission strings if specified; subset of permissions array
   **/
  readonly permissionsWithGrantOption?: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lake Formation resource type specification for permission scope enabling database-level or table-level access control. Defines whether the tag-based permissions apply to databases or tables for appropriate governance granularity.
   *
   * Use cases: Resource type selection; Permission scope; Database access; Table access; Granular control
   *
   * AWS: AWS Lake Formation resource type for permission scope and access control
   *
   * Validation: Must be 'DATABASE' or 'TABLE'; defaults to 'TABLE' for table-level permissions
   **/
  readonly resourceType?: 'DATABASE' | 'TABLE';

  /**
   * Q-ENHANCED-PROPERTY
   * Required LF-Tag expression defining resource selection criteria for tag-based permissions enabling attribute-based access control. Specifies which resources the permissions apply to based on their LF-Tag values for fine-grained data governance.
   *
   * Use cases: Resource filtering; ABAC implementation; Tag-based selection; Fine-grained access; Data governance; Resource matching
   *
   * AWS: AWS Lake Formation tag expression for resource selection and ABAC
   *
   * Validation: Must be non-empty LFTagExpression; tag keys must exist; tag values must be valid; required for tag-based permissions
   **/
  readonly lfTagExpression: LFTagExpression;
}

/**
 * Q-ENHANCED-TYPE
 * Named collection of tag-based grants mapping type for organized permission management and systematic grant configuration. Maps descriptive grant names to their configurations for clear grant identification and organized permission administration.
 *
 * Use cases: Grant organization; Permission management; Grant identification; Systematic configuration; Administrative organization
 *
 * AWS: Named Lake Formation tag-based grant collection for organized permission management
 *
 * Example: { bronzeDataAccess: {...}, silverDataAccess: {...}, goldDataAccess: {...} }
 *
 * Validation: Keys must be descriptive grant names; values must be valid TagBasedGrantConfig
 */
export type NamedTagBasedGrants = Record<string, TagBasedGrantConfig>;

/**
 * Q-ENHANCED-INTERFACE
 * Lake Formation Tag-Based Permissions L3 Construct properties interface for implementing comprehensive tag-based access control and data governance. Defines construct properties including named grant collections for systematic ABAC implementation and fine-grained permission management.
 *
 * Use cases: Tag-based access control; ABAC implementation; Data governance; Permission management; Fine-grained access; Systematic permissions
 *
 * AWS: AWS Lake Formation tag-based permissions construct configuration for ABAC and data governance
 *
 * Validation: tagBasedGrants must be non-empty; each grant must have valid configuration; principals and tags must exist
 */
export interface LakeFormationTagBasedPermissionsL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required named collection of tag-based grants for Lake Formation permission implementation enabling organized ABAC and systematic data governance. Defines all tag-based permission grants that will be created for implementing fine-grained access control.
   *
   * Use cases: Grant definition; Permission configuration; ABAC implementation; Data governance; Access control; Systematic permissions
   *
   * AWS: AWS Lake Formation tag-based grant collection for ABAC and permission management
   *
   * Validation: Must be non-empty NamedTagBasedGrants; required for tag-based permission implementation
   **/
  readonly tagBasedGrants: NamedTagBasedGrants;
}

/**
 * Q-ENHANCED-CLASS
 * Lake Formation Tag-Based Permissions L3 Construct for implementing attribute-based access control (ABAC) through LF-Tag expressions enabling fine-grained data governance and systematic permission management. Creates Lake Formation principal permissions with tag-based resource policies for implementing scalable, tag-driven access control across data lake resources.
 *
 * Behavior:
 * - Creates CfnPrincipalPermissions with LF-Tag policy resources for tag-based access control
 * - Supports multiple principals per grant for efficient permission management
 * - Implements sequential dependency chaining to avoid Lake Formation API rate limits and ensure reliable deployment
 * - Supports both DATABASE and TABLE resource types for flexible governance granularity
 * - Creates CloudFormation outputs and SSM parameters for permission tracking and integration
 *
 * Use cases: Tag-based access control; ABAC implementation; Fine-grained permissions; Data governance; Scalable access management; Permission automation
 *
 * AWS: AWS Lake Formation tag-based principal permissions for ABAC and data governance
 *
 * Validation: tagBasedGrants must be non-empty; principals must have valid ARNs; tag expressions must reference existing tags
 */
export class LakeFormationTagBasedPermissionsL3Construct extends MdaaL3Construct {
  protected readonly props: LakeFormationTagBasedPermissionsL3ConstructProps;
  private previousPermission?: CfnPrincipalPermissions;
  private permissionCount = 0;

  constructor(scope: Construct, id: string, props: LakeFormationTagBasedPermissionsL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Validate configuration
    if (!props.tagBasedGrants || Object.keys(props.tagBasedGrants).length === 0) {
      throw new Error('tagBasedGrants must be specified and non-empty.');
    }

    // Create tag-based permissions
    this.createTagBasedPermissions(props.tagBasedGrants);

    // Create outputs
    this.createOutputs();
  }

  /**
   * Create tag-based permissions for all grants
   */
  private createTagBasedPermissions(grants: NamedTagBasedGrants): void {
    for (const [grantName, grantConfig] of Object.entries(grants)) {
      this.createSingleGrant(grantName, grantConfig);
    }
  }

  /**
   * Create permissions for a single grant configuration
   * Creates one permission resource per principal, chaining dependencies
   */
  private createSingleGrant(grantName: string, grantConfig: TagBasedGrantConfig): void {
    // Validate grant configuration
    if (!grantConfig.lfTagExpression || Object.keys(grantConfig.lfTagExpression).length === 0) {
      throw new Error(`LFTagExpression is required for grant ${grantName}.`);
    }

    if (!grantConfig.principalArns || Object.keys(grantConfig.principalArns).length === 0) {
      throw new Error(`principalArns must be specified and non-empty for grant ${grantName}.`);
    }

    const resourceType = grantConfig.resourceType || 'TABLE';

    // Create a permission resource for each principal
    // Each permission depends on the previous one to ensure sequential deployment
    for (const [principalName, principalArn] of Object.entries(grantConfig.principalArns)) {
      const permissionId = `LFTagPermission-${this.sanitizeId(grantName)}-${this.sanitizeId(principalName)}-${this.permissionCount}`;

      const permission = new CfnPrincipalPermissions(this, permissionId, {
        principal: {
          dataLakePrincipalIdentifier: principalArn,
        },
        resource: {
          lfTagPolicy: {
            catalogId: this.account,
            resourceType: resourceType,
            expression: this.buildLFTagExpression(grantConfig.lfTagExpression),
          },
        },
        permissions: grantConfig.permissions,
        permissionsWithGrantOption: grantConfig.permissionsWithGrantOption || [],
      });

      // Chain dependencies: each permission depends on the previous one
      // This ensures sequential deployment and avoids Lake Formation API rate limits
      if (this.previousPermission) {
        permission.node.addDependency(this.previousPermission);
      }

      this.previousPermission = permission;
      this.permissionCount++;
    }
  }

  /**
   * Build LF-Tag expression list from the tag expression object
   */
  private buildLFTagExpression(lfTagExpression: LFTagExpression): CfnPrincipalPermissions.LFTagProperty[] {
    return Object.entries(lfTagExpression).map(([tagKey, tagValues]) => ({
      tagKey: tagKey,
      tagValues: this.normalizeTagValues(tagValues),
    }));
  }

  /**
   * Normalize tag values to ensure they are in array format
   */
  private normalizeTagValues(values: string | string[]): string[] {
    return Array.isArray(values) ? values : [values];
  }

  /**
   * Sanitize string for use in CDK construct IDs
   */
  private sanitizeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Create CloudFormation outputs
   */
  private createOutputs(): void {
    new MdaaParamAndOutput(this, {
      resourceType: 'lakeformation-permissions',
      name: 'permissions-created',
      value: this.permissionCount.toString(),
      ...this.props,
    });
  }
}
