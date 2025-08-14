# Basic Data Science/AI/ML Platform

This is a sample basic Data Science Platform architecture which can be implemented using MDAA. This platform is centered around the Data Science Team concept. Each team is provided with their own SageMaker Studio Domain, team-specific Athena Workgroup, and KMS-encrypted S3-based 'mini data lake'--which is used to store all team-specific data and files, as well as act as scratch-space for their data science activities.

![DataScience](docs/datascience.png)

***

## Deployment Instructions

The following instructions assume you have CDK bootstrapped your target account, and that the MDAA source repo is cloned locally.
More predeployment info and procedures are available in [PREDEPLOYMENT](../../PREDEPLOYMENT.md).

1. Deploy sample configurations into the specified directory structure (or obtain from the MDAA repo under `sample_configs/basic_datascience_platform`).

2. Edit the `mdaa.yaml` to specify an organization name. This must be a globally unique name, as it is used in the naming of all deployed resources, some of which are globally named (such as S3 buckets).

3. If required, edit the `mdaa.yaml` to specify `context:` values specific to your environment.

4. Ensure you are authenticated to your target AWS account.

5. Optionally, run `<path_to_mdaa_repo>/bin/mdaa ls` from the directory containing `mdaa.yaml` to understand what stacks will be deployed.

6. Optionally, run `<path_to_mdaa_repo>/bin/mdaa synth` from the directory containing `mdaa.yaml` and review the produced templates.

7. Run `<path_to_mdaa_repo>/bin/mdaa deploy` from the directory containing `mdaa.yaml` to deploy all modules.

Additional MDAA deployment commands/procedures can be reviewed in [DEPLOYMENT](../../DEPLOYMENT.md).

***

## Configurations

The sample configurations for this architecture are provided below. They are also available under sample_configs/datawarehouse whithin the MDAA repo.

### Config Directory Structure

```bash
basic_datascience_platform
│   mdaa.yaml
│   tags.yaml
│   roles.yaml
|
└───datalake
│    └───datalake.yaml
│    └───lakeformation-settings.yaml
│    └───athena.yaml
│
└───dataops
│    └───project.yaml
│    └───crawler.yaml
|
└───governance
│    └───audit.yaml
│    └───audit-trail.yaml
|
└───datascience
    └───datascience-team.yaml
```

***

### mdaa.yaml

This configuration specifies the global, domain, env, and module configurations required to configure and deploy this sample architecture.

*Note* - Before deployment, populate the mdaa.yaml with appropriate organization and context values for your environment

```yaml
# Contents available in mdaa.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/mdaa.yaml"
```

***

### tags.yaml

This configuration specifies the tags to be applied to all deployed resources.

```yaml
# Contents available in tags.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/tags.yaml"
```

***

### roles.yaml

This configuration will be used by the MDAA roles module to deploy data science and admin roles. These roles will be granted access to the Data Science team resources within the Data Science Team module config.

```yaml
# Contents available in roles.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/roles.yaml"
```

***

### datalake/datalake.yaml

This configuration will be used by the MDAA S3 Data Lake module to deploy KMS Keys, S3 Buckets, and S3 Bucket Policies required for the basic Data Lake.

```yaml
# Contents available in datalake/datalake.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/datalake/datalake.yaml"
```

***

### athena.yaml

This configuration will create a standalone Athena Workgroup which can be used to securely query the data lake via Glue resources. These Glue resources can be either manually created, created via MDAA DataOps Project module (Glue databases), or MDAA Crawler module (Glue tables).

```yaml
# Contents available in datalake/athena.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/datalake/athena.yaml"
```

***

### dataops/project.yaml

This configuration will create a DataOps Project which can be used to support a wide variety of data ops activities. Specifically, this configuration will create a number of Glue Catalog databases and apply fine-grained access control to these using basic.

```yaml
# Contents available in dataops/project.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/dataops/project.yaml"
```

***

### dataops/crawler.yaml

This configuration will create Glue crawlers using the DataOps Crawler module.

```yaml
# Contents available in dataops/crawler.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/dataops/crawler.yaml"
```

***

### datascience/datascience-team.yaml

This configuration will be used by the MDAA Data Science Team module to deploy the Data Science Team Platform, including SageMaker Studio Domain, Team KMS Key and Bucket, Athena Workgroup.

Ensure to modify the user profile config to specify an appropriate userid. This userid should match the session name of the user who will later assume the Data Scientist role.

```yaml
# Contents available in datascience/datascience-team.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/datascience/datascience-team.yaml"
```
***

### governance/audit.yaml

This configuration will be used by the MDAA audit module to deploy the resources required to define a secure S3-based bucket on AWS for use as a Cloudtrail or S3 Inventory target.



```yaml
# Contents available in governance/audit.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/governance/audit.yaml"
```

### governance/audit-trail.yaml

This configuration will be used by the MDAA Audit trail module to deploy the resources required to define a secure S3-based Audit Trail on AWS.

```yaml
# Contents available in goveranance/audit-trail.yaml
--8<-- "target/docs/sample_configs/basic_datascience_platform/governance/audit-trail.yaml"
```

***

## Usage Instructions

Once the MDAA deployment is complete, follow the following steps to interact with the data lake.

1. Check the `DATASETS.md` file in the same directory to create a sample_data folder

2. Assume the `shared-roles-data-admin` role created by the MDAA deployment. This role is configured with AssumeRole trust to the local account by default. Note that this role is the only role configured with write access to the data lake. All other roles (including existing administrator roles in the account) will be denied write access.

3. Upload the `./sample_data` folder and contents to `<transformed_bucket>/data/sample_data`

4. In the Glue Console, trigger/run the Glue Crawler. Once successful, view the Crawler's CloudWatch logs to observe that two tables were created.

5. Assume the `data-user` role created by the MDAA deployment. This role is configured with AssumeRole trust to the local account by default.

6. In the Athena Query Editor, select the MDAA-deployed Workgroup from the drop down list.

7. The two tables created by the crawler should be available for query under the MDAA-created Database.

8. Assume the `data-scientist` role created by the MDAA deployment. This role is configured with AssumeRole trust to the local account by default.

9. In the SageMaker AI, Go to Domain console, launch the user profile matching your role session name/userid.

10. SageMaker Studio should launch, and the Studio Notebooks/Kernels should be usable.
