# Lake Formation Tag-Based Permissions L3 Construct

This construct creates AWS Lake Formation permissions based on LF-Tag expressions, enabling attribute-based access control (ABAC) for data lake resources.

## Overview

Tag-based permissions allow you to grant Lake Formation permissions based on tag expressions rather than individual resources. This provides a scalable and flexible approach to access control, especially useful for large data lakes with many databases and tables.

## Features

- **Tag-Based Grants**: Create permissions using LF-Tag expressions
- **Multiple Principals**: Support for multiple IAM principals per grant
- **Resource Types**: Support for both DATABASE and TABLE resource types
- **Sequential Deployment**: Automatic dependency chaining to avoid Lake Formation API rate limits
- **Flexible Expressions**: Complex tag expressions with multiple tag keys and values

## Usage

```typescript
import { LakeFormationTagBasedPermissionsL3Construct } from '@aws-mdaa/lakeformation-tagbased-permissions-l3-construct';

new LakeFormationTagBasedPermissionsL3Construct(this, 'MyTagBasedPermissions', {
  tagBasedGrants: {
    dev_access: {
      principalArns: {
        'dev-role': 'arn:aws:iam::123456789012:role/dev-role',
        'dev-analyst': 'arn:aws:iam::123456789012:role/dev-analyst',
      },
      permissions: ['DESCRIBE', 'SELECT'],
      resourceType: 'TABLE',
      lfTagExpression: {
        environment: 'dev',  // Single string value
        data_tier: ['bronze', 'silver'],  // Array of values
      },
    },
    prod_read_access: {
      principalArns: {
        'prod-reader': 'arn:aws:iam::123456789012:role/prod-reader',
      },
      permissions: ['DESCRIBE', 'SELECT'],
      permissionsWithGrantOption: ['DESCRIBE'],  // Optional: allow delegation
      resourceType: 'TABLE',
      lfTagExpression: {
        environment: ['prod'],
        data_classification: ['public', 'internal'],
      },
    },
  },
});
```

## Configuration in YAML

```yaml
databases:
  my-database:
    lakeFormation:
      tagBasedGrants:
        dev_access:
          principalArns:
            dev-role: arn:aws:iam::123456789012:role/dev-role
          permissions: [DESCRIBE, SELECT]
          resourceType: TABLE
          lfTagExpression:
            environment: [dev]
            data_tier: [bronze, silver]
        
        prod_read_access:
          principalArns:
            prod-reader: arn:aws:iam::123456789012:role/prod-reader
          permissions: [DESCRIBE, SELECT]
          resourceType: TABLE
          lfTagExpression:
            environment: [prod]
            data_classification: [public, internal]
```

## Properties

### TagBasedGrantConfig

- `principalArns` (required): Map of principal names to IAM role/user ARNs
- `permissions` (required): Array of Lake Formation permissions (e.g., ['DESCRIBE', 'SELECT'])
- `lfTagExpression` (required): Tag expression defining which resources this grant applies to
- `resourceType` (optional): 'DATABASE' or 'TABLE' (default: 'TABLE')
- `permissionsWithGrantOption` (optional): Permissions that can be granted to others

### LFTagExpression

A map of tag keys to their values. Resources must match ALL tag conditions to receive the grant.

Tag values can be specified as either a single string or an array of strings:

```typescript
{
  environment: ['dev', 'test'],  // Array: Matches resources tagged with environment=dev OR environment=test
  data_tier: 'bronze',           // Single string: Matches resources tagged with data_tier=bronze
}
```

The construct automatically normalizes single string values to arrays internally.

## Common Permissions

### Table Permissions
- `DESCRIBE`: View table metadata
- `SELECT`: Read table data
- `INSERT`: Add data to table
- `DELETE`: Remove data from table
- `ALTER`: Modify table structure
- `DROP`: Delete table

### Database Permissions
- `DESCRIBE`: View database metadata
- `CREATE_TABLE`: Create tables in database
- `ALTER`: Modify database
- `DROP`: Delete database

## Best Practices

1. **Tag First**: Ensure LF-Tags are created before creating tag-based permissions
2. **Specific Expressions**: Use specific tag expressions to avoid overly broad permissions
3. **Multiple Principals**: Group principals with similar access needs in the same grant
4. **Resource Types**: Use TABLE resource type for data access, DATABASE for administrative operations
5. **Testing**: Test tag expressions thoroughly to ensure they match intended resources

## Implementation Details

### Sequential Deployment

This construct automatically chains permissions sequentially to avoid Lake Formation API rate limits. Each principal permission resource depends on the previous one, ensuring reliable deployment. For example, if you have 2 grants with 2 principals each, 4 separate `AWS::LakeFormation::PrincipalPermissions` resources are created with dependency chaining.

### Catalog ID

The construct automatically uses the AWS account ID where it's deployed as the Lake Formation catalog ID for all tag-based permissions.

### Outputs

The construct creates a CloudFormation output and SSM parameter tracking the total number of permissions created:
- Output name: `permissions-created`
- Value: Total count of principal permission resources created

## Validation

The construct performs the following validations at deployment time:

- `tagBasedGrants` must be non-empty
- Each grant must have a non-empty `lfTagExpression`
- Each grant must have at least one principal in `principalArns`
- All IAM principal ARNs must be valid

Validation errors will cause the CloudFormation deployment to fail with descriptive error messages.

## Related Constructs

- `LakeFormationTagsL3Construct`: Create and associate LF-Tags with resources
- `LakeFormationAccessControlL3Construct`: Traditional resource-based Lake Formation permissions
