# S3 Bucket Policy Helper

This is a helper class that helps construct working S3 Bucket policy statements that can be added to a bucket construct.

## Class RestrictObjectPrefixToRoles

This helper class helps construct a working policy that allows a group of Roles to access to an object prefix in S3.

Depending on the values provided, it will produce two PolicyStatement types accessible by methods.

One for Read access to an object prefix that generally resolves to:

```yaml
- Action: s3:GetObject*
  Condition:
    StringLike:
      aws:userId:
        - AROA12345678:*
  Effect: Allow
  Principal: "*"
  Resource:
    Fn::Join:
      - ""
      - - Fn::GetAtt:
            - BuckettransformedCbdgadDatalakeTransformedPrototype20210115E093F710
            - Arn
        - /inventory/*
  Sid: inventory/Read
```

One for write access to an object prefix that generally resolves to:

```yaml
- Action:
    - s3:GetObject*
    - s3:PutObject*
    - s3:DeleteObject*
  Condition:
    StringLike:
      aws:userId:
        - AROA12345678:*
  Effect: Allow
  Principal: "*"
  Resource:
    Fn::Join:
      - ""
      - - Fn::GetAtt:
            - BuckettransformedCbdgadDatalakeTransformedPrototype20210115E093F710
            - Arn
        - /inventory/*
  Sid: inventory/ReadWrite
```

Conditionals against `aws:userId` are used to support federated roles.  The `@aws-caef/iam-role-helper` is used to resolve the requested ARNs to AROA IDs.

## RestrictObjectPrefixToRoles example

```typescript
import {CaefRoleResolver} from '@aws-caef/am-role-helper'
import {RestrictObjectPrefixToRoles} from '@aws-caef/3-bucketpolicy-helper'

const roleResolver = new CaefRoleResolver({
    roleArns: [
        'arn:{{partition}}:iam::{{account}}:role/application_abc/component_xyz/S3Access',
        'arn:{{partition}}:iam::{{account}}:role/service-role/QuickSightAction'
    ]
})

roleResolver.init().then(() => {
    const RestrictPrefix = new RestrictObjectPrefixToRoles({
        // bucket in this context is a constructed s3.Bucket class
        s3Bucket: bucket,
        s3Prefix: '/protected',
        readRoles: [
            'arn:{{partition}}:iam::{{account}}:role/application_abc/component_xyz/S3Access',
            'arn:{{partition}}:iam::{{account}}:role/service-role/QuickSightAction'
        ],
        readWriteRoles: [
            'arn:{{partition}}:iam::{{account}}:role/application_abc/component_xyz/S3Access'
        ],
        roleAroaResolver: roleResolver
    })
    
    bucket.addToResourcePolicy(RestrictPrefix.readStatement())
    bucket.addToResourcePolicy(RestrictPrefix.readWriteStatement())
})
```

## Class RestrictBucketToRoles

Helper class to construct a policy that will restrict a bucket to a set of roles.  This is realized through a Deny where source role is not on the list, and an Allow where source role is.

Depending on the values provided, it will produce two PolicyStatement types accessible by methods.

One for general bucket access that resolves to:

```yaml
          - Action:
              - s3:List*
              - s3:GetBucket*
            Condition:
              StringLike:
                aws:userId:
                  - AROA12345678:*
            Effect: Allow
            Principal: "*"
            Resource:
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - BuckettransformedCbdgadDatalakeTransformedPrototype20210115E093F710
                        - Arn
                    - /*
              - Fn::GetAtt:
                  - BuckettransformedCbdgadDatalakeTransformedPrototype20210115E093F710
                  - Arn
            Sid: BucketAllow
```

One that denies access to the bucket that resolves to:

NOTE: To permit things like inventory we exclude the s3 service from the Deny statements.  Also since we're using a NotPrincipal statement, we also include the root account to assure access to the bucket isn't lost if the Roles are deleted.

```yaml
          - Action:
              - s3:PutObject*
              - s3:GetObject*
              - s3:List*
              - s3:GetBucket*
            Condition:
              StringNotLike:
                aws:userId:
                  - AROA12345678:*
            Effect: Deny
            NotPrincipal:
              Service: s3.amazonaws.com
              AWS:
                Fn::Join:
                  - ""
                  - - "arn:"
                    - Ref: AWS::Partition
                    - ":iam::"
                    - Ref: AWS::AccountId
                    - :root
            Resource:
              - Fn::Join:
                  - ""
                  - - Fn::GetAtt:
                        - BuckettransformedCbdgadDatalakeTransformedPrototype20210115E093F710
                        - Arn
                    - /*
              - Fn::GetAtt:
                  - BuckettransformedCbdgadDatalakeTransformedPrototype20210115E093F710
                  - Arn
            Sid: BucketDeny
```

## RestrictBucketToRoles example

```typescript
import {CaefRoleResolver} from '@aws-caef/am-role-helper'
import {RestrictBucketToRoles} from '@aws-caef/3-bucketpolicy-helper'

const roleResolver = new CaefRoleResolver({
    roleArns: [
        'arn:{{partition}}:iam::{{account}}:role/application_abc/component_xyz/S3Access',
        'arn:{{partition}}:iam::{{account}}:role/service-role/QuickSightAction'
    ]
})

roleResolver.init().then(() => {
    const RestrictBucket = new RestrictBucketToRoles({
        // bucket in this context is a constructed s3.Bucket class
        s3Bucket: bucket,
        roles: [
            'arn:{{partition}}:iam::{{account}}:role/application_abc/component_xyz/S3Access',
            'arn:{{partition}}:iam::{{account}}:role/service-role/QuickSightAction'
        ],
        roleAroaResolver: roleResolver
    })
    
    bucket.addToResourcePolicy(RestrictBucket.allowStatement())
    bucket.addToResourcePolicy(RestrictBucket.denyStatement())
})
```
