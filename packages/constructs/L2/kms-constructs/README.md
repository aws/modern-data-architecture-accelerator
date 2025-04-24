# Construct Overview

Opinionated implementation of the Layer 2 CDK Construct for KMS Keys.

## Security/Compliance

### KMS Customer Managed Key
* Enforce CMK Name
* Enforce CMK rotation
* Enforce retention on stack deletion
* Assign key admin and key user permissions in Key Policy