# Lake Formation Tags L3 Construct

This package provides two constructs for managing AWS Lake Formation tags and their associations with data resources for tag-based access control (TBAC).

## Overview

Lake Formation tags (LF-Tags) are key-value pairs that you can attach to Data Catalog resources (databases, tables, columns). These tags enable attribute-based access control, allowing you to grant permissions based on tag expressions rather than individual resources.

This package separates tag creation from tag association into two distinct constructs:
- **LakeFormationTagsL3Construct**: Creates LF-Tags at the account level
- **LakeFormationTagAssociationL3Construct**: Associates existing tags with databases and tables

## Constructs

### LakeFormationTagsL3Construct

Creates LF-Tags at the account level. These tags define the vocabulary for tag-based access control and can be reused across multiple databases and tables.

#### Usage

```typescript
import { LakeFormationTagsL3Construct } from '@aws-mdaa/lakeformation-tags-l3-construct';

const tagsConstruct = new LakeFormationTagsL3Construct(this, 'ProjectLFTags', {
  lfTags: [
    {
      tagKey: 'environment',
      tagValues: ['dev', 'test', 'prod'],
    },
    {
      tagKey: 'data_tier',
      tagValues: ['bronze', 'silver', 'gold'],
    },
  ],
});
```

#### Properties

- `lfTags` (required): Array of `LFTagConfig` objects defining the tags to create

#### LFTagConfig

- `tagKey` (required): The key (name) of the Lake Formation tag
- `tagValues` (required): Array of allowed values for this tag
- `catalogId` (optional): The catalog ID where the tag will be created (defaults to current account)

### LakeFormationTagAssociationL3Construct

Associates existing LF-Tags with databases and tables. This construct assumes the tags have already been created.

#### Usage

```typescript
import { 
  LakeFormationTagsL3Construct,
  LakeFormationTagAssociationL3Construct 
} from '@aws-mdaa/lakeformation-tags-l3-construct';

// First, create the tags
const tagsConstruct = new LakeFormationTagsL3Construct(this, 'ProjectLFTags', {
  lfTags: [
    {
      tagKey: 'environment',
      tagValues: ['dev', 'test', 'prod'],
    },
    {
      tagKey: 'data_tier',
      tagValues: ['bronze', 'silver', 'gold'],
    },
  ],
});

// Then, associate tags with a database
new LakeFormationTagAssociationL3Construct(this, 'DatabaseTagAssociation', {
  databaseName: 'my-database',
  tagValues: [
    {
      tagKey: 'environment',
      tagValues: ['prod'],
    },
    {
      tagKey: 'data_tier',
      tagValues: ['gold'],
    },
  ],
  projectLevelTagsConstruct: tagsConstruct, // Ensures tags exist before association
});

// Optionally, associate tags with specific tables
new LakeFormationTagAssociationL3Construct(this, 'TableTagAssociation', {
  databaseName: 'my-database',
  tables: ['table1', 'table2'],
  tagValues: [
    {
      tagKey: 'environment',
      tagValues: ['prod'],
    },
  ],
  projectLevelTagsConstruct: tagsConstruct,
});
```

#### Properties

- `databaseName` (required): The Glue database name to associate tags with
- `tagValues` (required): Array of `LFTagConfig` objects specifying which tag values to associate
- `projectLevelTagsConstruct` (optional): Reference to the construct that created the tags (for dependency management)
- `tables` (optional): Array of specific table names to associate tags with

## Complete Example

```typescript
import { 
  LakeFormationTagsL3Construct,
  LakeFormationTagAssociationL3Construct 
} from '@aws-mdaa/lakeformation-tags-l3-construct';

// Step 1: Create account-level tags
const tagsConstruct = new LakeFormationTagsL3Construct(this, 'OrgLFTags', {
  lfTags: [
    {
      tagKey: 'environment',
      tagValues: ['dev', 'test', 'prod'],
    },
    {
      tagKey: 'data_tier',
      tagValues: ['bronze', 'silver', 'gold'],
    },
    {
      tagKey: 'pii',
      tagValues: ['true', 'false'],
    },
  ],
});

// Step 2: Associate tags with production database
new LakeFormationTagAssociationL3Construct(this, 'ProdDatabaseTags', {
  databaseName: 'production-db',
  tagValues: [
    { tagKey: 'environment', tagValues: ['prod'] },
    { tagKey: 'data_tier', tagValues: ['gold'] },
  ],
  projectLevelTagsConstruct: tagsConstruct,
});

// Step 3: Associate tags with specific sensitive tables
new LakeFormationTagAssociationL3Construct(this, 'SensitiveTableTags', {
  databaseName: 'production-db',
  tables: ['customers', 'transactions'],
  tagValues: [
    { tagKey: 'pii', tagValues: ['true'] },
  ],
  projectLevelTagsConstruct: tagsConstruct,
});
```

## Best Practices

1. **Separation of Concerns**: Create tags once at the account level, then associate them with multiple resources as needed
2. **Tag Naming**: Use consistent naming conventions for tag keys (e.g., snake_case)
3. **Tag Values**: Define all possible values upfront in the tag creation step to ensure consistent tagging
4. **Dependencies**: Always pass `projectLevelTagsConstruct` to ensure tags exist before associations are created
5. **Reusability**: Account-level tags can be reused across multiple databases and tables

## Related Constructs

- `LakeFormationTagBasedPermissionsL3Construct`: Grant permissions based on LF-Tag expressions
- `LakeFormationAccessControlL3Construct`: Traditional resource-based Lake Formation permissions
