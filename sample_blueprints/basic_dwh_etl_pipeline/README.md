# Basic Datawarehouse ETL Pipeline

This blueprint illustrates how to create a data curation pipeline for a Data Lakehouse - to curate raw data into dimensions and facts in the datalake and load them into Redshift DataWarehouse Tables.

This blueprint may be suitable when:
files are being regularly uploaded to the data lake, and need to be periodically (or nightly) curated and loaded into DataWarehouse tables.

While the blueprint doesn't immediately handle partitioning, or additional transformation, the Glue ETL Job can be easily extended to provide these capabilities.

![Glue CSV Parqet Transformer](docs/basic_dwh_etl_pipeline.png)

***

## Usage Instructions

The following instructions assume you have already deployed your Data Lake (possibly using MDAA). If already using MDAA, you can merge these sample blueprint configs into your existing `mdaa.yaml`.

1. Deploy sample configurations into the specified directory structure (or obtain from the MDAA repo under `sample_blueprints/basic_dwh_etl_pipeline`).

2. Edit the `mdaa.yaml` to specify an organization name to replace `<unique-org-name>`. This must be a globally unqique name, as it is used in the naming of all deployed resources, some of which are globally named (such as S3 buckets).

3. Review and Edit the `*.yaml` files to specify values for atttributes marked in angle brackets `<>` e.g. `<your-glue-catalog-database-name-for-raw-datasets>`.

4. Edit `basic_dwh_etl_pipeline/basic_etl_pipeline/src/glue/curate-dataset-*.py` to add your processing logic.

5. Ensure you are authenticated to your target AWS account.

6. Optionally, run `<path_to_mdaa_repo>/bin/mdaa -l ls` from the directory containing `mdaa.yaml` to understand what stacks will be deployed.

7. Optionally, run `<path_to_mdaa_repo>/bin/mdaa -l synth` from the directory containing `mdaa.yaml` and review the produced templates.

8. Run `<path_to_mdaa_repo>/bin/mdaa -l deploy` from the directory containing `mdaa.yaml` to deploy all modules.

9. Before loading csv files, you will need to provide the generated `glue-etl` role with access to your datalake bucket(s).

Additional MDAA deployment commands/procedures can be reviewed in [DEPLOYMENT](../../DEPLOYMENT.md).

***

## Configurations

The sample configurations for this blueprint are provided below. They are also available under sample_blueprints/basic_dwh_etl_pipeline whithin the MDAA repo.

### Config Directory Structure

```bash
basic_dwh_etl_pipeline
│   mdaa.yaml
│   tags.yaml
│
└───gbasic_etl_pipeline
    └───roles.yaml
    └───project.yaml
    └───crawlers.yaml
    └───jobs.yaml
    └───workflow.yaml    
```

***

### mdaa.yaml

This configuration specifies the global, domain, env, and module configurations required to configure and deploy this sample architecture.

*Note* - Before deployment, populate the mdaa.yaml with appropriate organization and context values for your environment

```yaml
# Contents available in mdaa.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/mdaa.yaml"
```

***

### tags.yaml

This configuration specifies the tags to be applied to all deployed resources.

```yaml
# Contents available in tags.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/tags.yaml"
```

***

### basic_etl_pipeline/roles.yaml

This configuration will be used by the MDAA Roles module to deploy IAM roles and Managed Policies required for this sample architecture.

```yaml
# Contents available in roles.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/basic_etl_pipeline/roles.yaml"
```

***

### basic_etl_pipeline/project.yaml

This configuration will create a DataOps Project which can be used to support a wide variety of data ops activities. Specifically, this configuration will create a number of Glue Catalog databases and apply fine-grained access control to these using basic.

```yaml
# Contents available in dataops/project.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/basic_etl_pipeline/project.yaml"
```

***

### basic_etl_pipeline/crawler.yaml

This configuration will create the Glue crawler using the DataOps Glue Crawler module.

```yaml
# Contents available in dataops/crawler.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/basic_etl_pipeline/crawler.yaml"
```

***

### basic_etl_pipeline/jobs.yaml

This configuration will create the transformation Glue ETL Jobs using the DataOps Glue Job module.

```yaml
# Contents available in dataops/jobs.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/basic_etl_pipeline/jobs.yaml"
```

***

### basic_etl_pipeline/workflow.yaml

This configuration will create the Glue Workflow, to orchestrate the crawler and jobs, using the DataOps Glue Workflow module.

```yaml
# Contents available in dataops/workflow.yaml
--8<-- "target/docs/sample_blueprints/basic_dwh_etl_pipeline/basic_etl_pipeline/workflow.yaml"
```
