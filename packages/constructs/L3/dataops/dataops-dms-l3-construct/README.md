# Database Migration Service (DMS)

AWS Database Migration Service provides functionality to migrate data from source data stores (such as RDBMS) to destination data stores (such as RDBMS, or S3).

***

## Deployed Resources and Compliance Details

![DMS](../../../constructs/L3/dataops/dataops-dms-l3-construct/docs/DMS.png)

**DMS Replication Instance** - Provisioned compute which will be used to perform replication tasks. MDAA ensures these are private and encrypted.

**DMS Endpoint** - Source and target data sources from/to which data will migrated. MDAA ensures that endpoint credentials are securely managed exclusively through AWS Secrets Manager, or via AWS Role credentials.

**DMS Replication Task** - Tasks move data between DMS Endpoints, and are executed using Replication Instance compute.
