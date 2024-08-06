# SFTP Users

The SFTP Users CDK application is used to deploy the resources required to provision SFTP user credentials for a deployed SFTP Transfer Family Server.

***

## Deployed Resources and Compliance Details

![SFTPUser](../../../constructs/L3/utility/sftp-users-l3-construct/docs/SFTPUser.png)

**SFTP User** - For each configured User, and SFTP Transfer Family User will be created with the specified SSH Public key credentials.

* Corresponding private key is expected to be managed externally to the config

**SFTP User IAM Role** - If an existing IAM role is not specified for a User in the config, a minimally-permissive IAM role will be automatically created and assigned to the user.

***

## Configuration

### MDAA Config

Add the following snippet to your mdaa.yaml under the `modules:` section of a domain/env in order to use this module:

```yaml
          sftp-users: # Module Name can be customized
            cdk_app: "@aws-caef/sftp-users" # Must match module NPM package name
            app_configs:
              - ./sftp-users.yaml # Filename/path can be customized
```

### Module Config (./sftp-users.yaml)

[Config Schema Docs](SCHEMA.md)

```yaml
serverId: ssm:/path/to/ssm/server/id

# User name to Public SSH RSA Keys.  These will be used to authenticate against the SFTP server and user
publicKeys:
  test-key1:
    publicKey: ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCr1nEXAMPLEPubKey==
  test-key2:
    publicKey: ssh-rsa AAAAB3NzaC1yc2EAAAABJQAAAQEAsyyGZsEXAMPLEPubKey==

# Our existing buckets and existing KMS keys.  If these are cross account, assure the KMS key, and S3 bucket are shared with the account this is deployed within.
buckets:
  home-bucket1:
    # Arn or SSM Parameter paths are accepted here
    bucketName: ssm:/path/to/ssm/param/bucket/name
    kmsKeyArn: ssm:/path/to/ssm/param/kms/arn

  home-bucket2:
    # Arn or SSM Parameter paths are accepted here
    bucketName: some-home-bucket-name
    kmsKeyArn: arn:{{partition}}:kms:{{region}}:{{account}}:key/1234abcd-12ab-34cd-56ef-1234567890ab

# Our User Mapping to Buckets and Object Prefixes.
users:
  test-user-1:
    bucket: home-bucket1
    homeDirectory: /incoming
    # Optional existing role ARN or SSM parameter for the role to access the bucket na KMS Key.
    # If this isn't specified, a minimally scoped role will be created
    accessRoleArn: ssm:/path/to/ssm/param/role/arn
    publicKeys:
      - test-key1

  test-user-2:
    bucket: home-bucket2
    homeDirectory: /incoming
    # Optional existing role ARN or SSM parameter for the role to access the bucket na KMS Key.
    publicKeys:
      - test-key2
```
