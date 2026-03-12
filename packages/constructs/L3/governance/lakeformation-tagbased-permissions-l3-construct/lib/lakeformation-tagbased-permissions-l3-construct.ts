/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnPrincipalPermissions } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';

export type LFTagExpression = Record<string, string | string[]>;

export type NamedPrincipalArns = Record<string, string>;

export interface TagBasedGrantConfig {
  /** Mapping of principal names to IAM ARNs */
  readonly principalArns: NamedPrincipalArns;

  /** Lake Formation permissions to grant */
  readonly permissions: string[];

  /** Permissions with grant option for delegation */
  readonly permissionsWithGrantOption?: string[];

  /** Resource type scope (DATABASE or TABLE) */
  readonly resourceType?: 'DATABASE' | 'TABLE';

  /** LF-Tag expression defining resource selection criteria */
  readonly lfTagExpression: LFTagExpression;
}

export type NamedTagBasedGrants = Record<string, TagBasedGrantConfig>;

export interface LakeFormationTagBasedPermissionsL3ConstructProps extends MdaaL3ConstructProps {
  /** Named collection of tag-based grants for permission implementation */
  readonly tagBasedGrants: NamedTagBasedGrants;
}

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
