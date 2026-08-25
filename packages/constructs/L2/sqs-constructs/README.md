# Construct Overview

Opinionated L2 constructs for SQS.

## Security/Compliance

### SQS Queue

- Enforce queue name
  - FIFO queues have the `.fifo` suffix SQS requires appended after name truncation, so the suffix survives when the generated name would otherwise be truncated at the 80 character limit
- Enforce KMS CMK encryption at rest
- Enforce SSL connections to queue
