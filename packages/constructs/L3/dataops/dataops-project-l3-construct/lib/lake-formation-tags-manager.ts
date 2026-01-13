import {
  LakeFormationTagAssociationL3Construct,
  LakeFormationTagsL3Construct,
  LFTagConfig,
} from '@aws-mdaa/lakeformation-tags-l3-construct';
import { LakeFormationTagBasedPermissionsL3Construct } from '@aws-mdaa/lakeformation-tagbased-permissions-l3-construct';
import { Construct } from 'constructs';
import { CfnDatabase } from 'aws-cdk-lib/aws-glue';
import { LakeFormationAccessControlL3Construct } from '@aws-mdaa/lakeformation-access-control-l3-construct';
import { LFTagExpression } from './lake-formation-props';
import { DatabaseLakeFormationProps, DataOpsProjectL3ConstructProps } from './dataops-project-l3-construct';

type ProjectProps = {
  lakeFormationTagsConstruct?: LakeFormationTagsL3Construct;
  databaseName: string;
  dbResourceName: string;
  database: CfnDatabase;
  lakeFormationAccessControl: LakeFormationAccessControlL3Construct;
  otherProps: DataOpsProjectL3ConstructProps;
};

export function processLakeFormationTagsPermissions(
  scope: Construct,
  projectProps: ProjectProps,
  lakeFormationProps: DatabaseLakeFormationProps,
) {
  if (
    lakeFormationProps.databaseTagValues &&
    lakeFormationProps.databaseTagValues.length > 0 &&
    projectProps.lakeFormationTagsConstruct
  ) {
    // Validate that all tag keys and values are defined at project level
    const validationErrors = validateTagsAgainstProjectLevel(
      lakeFormationProps.databaseTagValues,
      `database '${projectProps.databaseName}' databaseTagValues`,
      projectProps.otherProps.lakeFormation?.lfTags || [],
    );
    if (validationErrors.length > 0) {
      throw new Error(
        `Invalid Lake Formation tags in database '${projectProps.databaseName}' databaseTagValues:\n` +
          validationErrors.map(err => `  - ${err}`).join('\n'),
      );
    }

    const tagAssociation = new LakeFormationTagAssociationL3Construct(
      scope,
      `lf-tag-assoc-${projectProps.databaseName}`,
      {
        databaseName: projectProps.dbResourceName,
        tagValues: lakeFormationProps.databaseTagValues,
        projectLevelTagsConstruct: projectProps.lakeFormationTagsConstruct,
        ...projectProps.otherProps,
      },
    );
    tagAssociation.node.addDependency(projectProps.database);
  }

  // Create Tag-Based Permissions if specified
  if (lakeFormationProps.tagBasedGrants && Object.keys(lakeFormationProps.tagBasedGrants).length > 0) {
    // Validate that all tag keys and values in tag expressions are defined at project level
    const allValidationErrors: string[] = [];
    for (const [grantName, grantConfig] of Object.entries(lakeFormationProps.tagBasedGrants)) {
      const validationErrors = validateTagExpressionAgainstProjectLevel(
        grantConfig.lfTagExpression,
        `database '${projectProps.databaseName}' tagBasedGrants '${grantName}'`,
        projectProps.otherProps.lakeFormation?.lfTags || [],
      );
      allValidationErrors.push(...validationErrors);
    }

    if (allValidationErrors.length > 0) {
      throw new Error(
        `Invalid Lake Formation tags in database '${projectProps.databaseName}' tagBasedGrants:\n` +
          allValidationErrors.map(err => `  - ${err}`).join('\n'),
      );
    }

    const tagBasedPermissions = new LakeFormationTagBasedPermissionsL3Construct(
      scope,
      `lf-tag-permissions-${projectProps.databaseName}`,
      {
        tagBasedGrants: lakeFormationProps.tagBasedGrants,
        ...projectProps.otherProps,
      },
    );

    // Tag-based permissions depend on tags being created first
    if (projectProps.lakeFormationTagsConstruct) {
      tagBasedPermissions.node.addDependency(projectProps.lakeFormationTagsConstruct);
    }

    // Tag-based permissions also depend on the database
    tagBasedPermissions.node.addDependency(projectProps.database);

    // Traditional grants should wait for tag-based permissions to avoid conflicts
    projectProps.lakeFormationAccessControl.node.addDependency(tagBasedPermissions);
  }
}

/**
 * Creates a map of project-level tags for efficient lookup.
 *
 * @param projectLfTags - Array of project-level LF tags
 * @returns Map of tag keys to their valid values
 */
function buildProjectTagsMap(projectLfTags: LFTagConfig[]): Map<string, Set<string>> {
  const projectTagsMap = new Map<string, Set<string>>();
  for (const projectTag of projectLfTags) {
    projectTagsMap.set(projectTag.tagKey, new Set(projectTag.tagValues));
  }
  return projectTagsMap;
}

/**
 * Validates tag keys and values against project-level tags.
 *
 * @param tagKey - The tag key to validate
 * @param tagValues - Array of tag values to validate
 * @param context - Context string for error messages
 * @param projectTagsMap - Map of project-level tags
 * @returns Array of validation error messages
 */
function validateTagKeyAndValues(
  tagKey: string,
  tagValues: string[],
  context: string,
  projectTagsMap: Map<string, Set<string>>,
): string[] {
  const errors: string[] = [];
  const projectTagValues = projectTagsMap.get(tagKey);

  // Check if tag key exists at project level
  if (!projectTagValues) {
    errors.push(`Tag key '${tagKey}' in ${context} is not defined in project-level lfTags`);
    return errors;
  }

  // Check if all tag values are valid
  const invalidValues = tagValues.filter(value => !projectTagValues.has(value));
  if (invalidValues.length > 0) {
    errors.push(
      `Tag key '${tagKey}' in ${context} has invalid values: ${invalidValues.join(', ')}. ` +
        `Valid values are: ${Array.from(projectTagValues).join(', ')}`,
    );
  }

  return errors;
}

/**
 * Create project-level Lake Formation tags before any databases are created.
 * This ensures tags exist at the account level and can be referenced by databases.
 * Returns the construct so databases can add dependencies on it.
 */
export function createLakeFormationTags(
  scope: Construct,
  projectProps: DataOpsProjectL3ConstructProps,
): LakeFormationTagsL3Construct | undefined {
  const lfTags = projectProps.lakeFormation?.lfTags;
  // Only create if project-level tags are defined
  if (!lfTags || lfTags.length === 0) {
    return undefined;
  }

  // Create a single construct for all project-level tags
  // Tags are created at account level and can be reused across all databases
  return new LakeFormationTagsL3Construct(scope, 'project-lf-tags', {
    lfTags: lfTags,
    ...projectProps,
  });
}

/**
 * Validates that all tag keys and values used in database associations or grants
 * are defined in the project-level LF tags configuration.
 *
 * @param tagsToValidate - Array of LFTagConfig to validate
 * @param context - Context string for error messages (e.g., "database 'my-db' databaseTagValues")
 * @param projectLfTags
 * @returns Array of validation error messages for undefined tags
 */
export function validateTagsAgainstProjectLevel(
  tagsToValidate: LFTagConfig[],
  context: string,
  projectLfTags: LFTagConfig[],
): string[] {
  // If no project-level tags are defined, all tags are invalid
  if (projectLfTags.length === 0) {
    const undefinedKeys = tagsToValidate.map(tag => tag.tagKey);
    if (undefinedKeys.length > 0) {
      return [`No project-level LF tags defined, but ${context} references tag keys: ${undefinedKeys.join(', ')}`];
    }
    return [];
  }

  const projectTagsMap = buildProjectTagsMap(projectLfTags);
  const errors: string[] = [];

  // Validate each tag
  for (const tagToValidate of tagsToValidate) {
    errors.push(...validateTagKeyAndValues(tagToValidate.tagKey, tagToValidate.tagValues, context, projectTagsMap));
  }

  return errors;
}

/**
 * Validates that all tag keys used in tag-based grant expressions
 * are defined in the project-level LF tags configuration.
 *
 * @param lfTagExpression - LF tag expression to validate
 * @param context - Context string for error messages (e.g., "database 'my-db' tagBasedGrants 'grant-name'")
 * @param projectLfTags
 * @returns Array of validation error messages for undefined tags
 */
export function validateTagExpressionAgainstProjectLevel(
  lfTagExpression: LFTagExpression,
  context: string,
  projectLfTags: LFTagConfig[],
): string[] {
  // If no project-level tags are defined, all tags are invalid
  if (projectLfTags.length === 0) {
    const undefinedKeys = Object.keys(lfTagExpression);
    if (undefinedKeys.length > 0) {
      return [`No project-level LF tags defined, but ${context} references tag keys: ${undefinedKeys.join(', ')}`];
    }
    return [];
  }

  const projectTagsMap = buildProjectTagsMap(projectLfTags);
  const errors: string[] = [];

  // Validate each tag key and its values in the expression
  for (const [tagKey, tagValues] of Object.entries(lfTagExpression)) {
    // Normalize tag values to array
    const valuesArray = Array.isArray(tagValues) ? tagValues : [tagValues];
    errors.push(...validateTagKeyAndValues(tagKey, valuesArray, context, projectTagsMap));
  }

  return errors;
}
