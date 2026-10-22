# Usage

## Deployed Resources

Once deployed, you should see the following in your AWS account:

**Naming convention:** `<org>-<env>-<domain>-<module>-<resource>`

**SSM parameters:** `/<org>/<domain>/<module>/<resource-type>/<resource-name>/<attribute>`

| Resource | Deployed Name / SSM Path | Config Reference |
|----------|--------------------------|------------------|
| Audit S3 Bucket | `<org>-dev-shared-audit-audit`<br>`/<org>/shared/audit/bucket/name` | deployed by [`shared/audit.yaml`](shared/audit.yaml) |
| Audit KMS Key | `<org>-dev-shared-audit-audit`<br>`/<org>/shared/audit/kms/arn` | deployed by [`shared/audit.yaml`](shared/audit.yaml) |
| CloudTrail Trail | `<org>-dev-shared-audit-trail-s3-audit` | `trails.s3-audit` in [`shared/audit-trail.yaml`](shared/audit-trail.yaml) |
| SMUS Domain | `<org>-dev-sagemaker-domain-domain1`<br>`/<org>/sagemaker/domain/domain/domain1/name` | `domains.domain1` in [`sagemaker/domain.yaml`](sagemaker/domain.yaml) |
| SMUS Project Profile | `<org>-dev-sagemaker-projects`<br>`/<org>/sagemaker/projects/project/name` | configured in [`sagemaker/projects.yaml`](sagemaker/projects.yaml) |
| Research Data S3 Bucket | `<org>-dev-shared-datalake-research`<br>`/<org>/shared/datalake/bucket/research/name` | `buckets.research` in [`shared/datalake.yaml`](shared/datalake.yaml) |
| S3 Data Source Connection | `<org>-dev-sagemaker-projects-research-data` | `projects.team1.dataSources.research-data` in [`sagemaker/projects.yaml`](sagemaker/projects.yaml) |
| IAM Role | `<org>-dev-shared-roles-data-admin`<br>`/<org>/shared/generated-role/data-admin/id` | `generateRoles.data-admin` in [`shared/roles.yaml`](shared/roles.yaml) |
| Glue Catalog Encryption | Account-level setting | deployed by [`glue-catalog`](mdaa.yaml) module<br>*(not configurable)* |
| LakeFormation Data Lake Settings | Account-level setting | deployed by [`shared/lakeformation-settings.yaml`](shared/lakeformation-settings.yaml)<br>*(not configurable)* |

## Post-Deployment Steps

### 1. Access the SMUS Portal

1. Assume the `<org>-dev-shared-roles-data-admin` role in your deployment account.
2. Navigate to **SageMaker Unified Studio** in the AWS Console.
3. Select the deployed domain (`<org>-dev-sagemaker-domain-domain1`).
4. Click **Open portal**.

### 2. Verify SSO Access

1. SSO users in the `team1` and `team2` groups should be able to log into the portal.
2. If users cannot access the portal, verify their SSO group IDs match the values configured in `mdaa.yaml` context (`team1-group-sso-id`, `team2-group-sso-id`).

### 3. Create a Project

1. In the SMUS portal, navigate to **Projects**.
2. Select a project profile to create a new team workspace.
3. Team members in the assigned SSO group will have access to the project's notebooks, SQL queries, and data catalog.

### 4. Start Working

Available capabilities in the portal:
- **JupyterLab notebooks** — ML experimentation and data analysis
- **SQL queries** — Query data in Glue databases via Athena
- **Data catalog** — Discover and subscribe to data assets
- **MLflow** — Track experiments and model versions

### 5. Verify the S3 Data Source

1. In the SMUS portal, open the `team1` project and navigate to **Data** > **S3 buckets** (and **Connections**).
2. The `research-data` connection (pointing at the `research` bucket from [`shared/datalake.yaml`](shared/datalake.yaml)) should appear as an available S3 data source. Reading objects under it requires a post-deploy access grant; see Troubleshooting in the [README](README.md) if you see an access error.

## Scaling Up

For more complex organizations with teams operating across multiple accounts, see the [SMUS Data Mesh](../smus_data_mesh/) starter kit.
