# Usage

## Deployed Resources

Once deployed, you should see the following in your AWS account:

**Naming convention:** `<org>-<env>-<domain>-<module>-<resource>`

**SSM parameters:** `/<org>/<domain>/<module>/<resource-type>/<resource-name>/<attribute>`

| Resource | Deployed Name / SSM Path | Config Reference |
|----------|--------------------------|------------------|
| S3 Bucket | `<org>-dev-shared-datalake-staging`<br>`/<org>/shared/datalake/bucket/staging/name` | `buckets.staging` in [`datalake/datalake.yaml`](datalake/datalake.yaml) |
| S3 Bucket | `<org>-dev-shared-datalake-raw`<br>`/<org>/shared/datalake/bucket/raw/name` | `buckets.raw` in [`datalake/datalake.yaml`](datalake/datalake.yaml) |
| S3 Bucket | `<org>-dev-shared-datalake-curated`<br>`/<org>/shared/datalake/bucket/curated/name` | `buckets.curated` in [`datalake/datalake.yaml`](datalake/datalake.yaml) |
| Glue Database | `<org>-dev-dataops-hda-project`<br>`/<org>/dataops/hda-project/database/name` | `projectName` in [`dataops/project.yaml`](dataops/project.yaml) |
| Glue Job | `<org>-dev-dataops-glue-jobs`<br>`/<org>/dataops/glue-jobs/job/name` | configured in [`dataops/jobs.yaml`](dataops/jobs.yaml) |
| DynamoDB Table | `<org>-dev-dataops-dynamodb-tables`<br>`/<org>/dataops/dynamodb-tables/table/name` | configured in [`dataops/dynamodb.yaml`](dataops/dynamodb.yaml) |
| Lambda Function | `<org>-dev-dataops-hda-function`<br>`/<org>/dataops/hda-function/function/name` | configured in [`dataops/lambda.yaml`](dataops/lambda.yaml) |
| Step Functions State Machine | `<org>-dev-dataops-file-workflow`<br>`/<org>/dataops/file-workflow/state-machine/name` | configured in [`dataops/stepfunction.yaml`](dataops/stepfunction.yaml) |
| DMS Replication Task | `<org>-dev-dataops-dms-test-task`<br>`/<org>/dataops/dms/replication-task/name` | configured in [`dataops/dms.yaml`](dataops/dms.yaml) |
| IAM Role | `<org>-dev-shared-roles-data-admin`<br>`/<org>/shared/generated-role/data-admin/id` | `generateRoles.data-admin` in [`roles.yaml`](roles.yaml) |
| IAM Role | `<org>-dev-shared-roles-data-user`<br>`/<org>/shared/generated-role/data-user/id` | `generateRoles.data-user` in [`roles.yaml`](roles.yaml) |
| IAM Role | `<org>-dev-shared-roles-glue-etl`<br>`/<org>/shared/generated-role/glue-etl/id` | `generateRoles.glue-etl` in [`roles.yaml`](roles.yaml) |
| IAM Role | `<org>-dev-shared-roles-dms`<br>`/<org>/shared/generated-role/dms/id` | `generateRoles.dms` in [`roles.yaml`](roles.yaml) |

## Post-Deployment Steps

### 1. Verify DynamoDB Configuration Tables

The deployment hooks automatically populate DynamoDB configuration tables:
- `load_table_info.sh table_config.json <org>` runs as a **predeploy** hook on the `dms-shared` module
- `load_batch_config.sh <org>` runs as a **postdeploy** hook on the `file-workflow` module

These scripts are idempotent. You only need to re-run them manually if you update configuration after the initial deploy:

```bash
# Re-load table configuration after editing table_config.json
./dataops/scripts/load_table_info.sh table_config.json <org>

# Re-load batch processing configuration after editing batch config
./dataops/scripts/load_batch_config.sh <org>
```

### 2. Start the DMS Replication Task

1. Navigate to **AWS DMS Console** > **Database migration tasks**.
2. Select the task named `<org>-dev-dataops-dms-test-task` (or find via SSM: `/<org>/dataops/dms/replication-task/test-task/name`).
3. Verify the source endpoint shows status "Successful" (if not, check connectivity to your source database).
4. Click **Actions** > **Restart/Resume** to start replication.

### 3. Wait for Data Processing

The file processor and transformer Step Functions run on a schedule (configured via `file_processor_event_bridge_trigger_hour` in `mdaa.yaml` context).

To trigger manually for testing:
1. Navigate to **AWS Step Functions Console**.
2. Select the state machine named `<org>-dev-dataops-file-workflow`.
3. Click **Start execution**.

### 4. Verify Results

1. Check the curated bucket (`<org>-dev-shared-datalake-curated`) for transformed output files.
2. Navigate to **AWS Glue Console** > **Databases** > `<org>-dev-dataops-hda-project` and confirm tables are cataloged.
