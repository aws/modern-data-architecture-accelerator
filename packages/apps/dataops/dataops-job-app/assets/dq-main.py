import json
import logging
import re
import sys

from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.transforms import SelectFromCollection
from awsglue.utils import getResolvedOptions
from awsgluedq.transforms import EvaluateDataQuality
from pyspark.context import SparkContext

from dq_config import get_rulesets, get_config, get_source_data_frame
from smus import post_dq_results

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


job_args = getResolvedOptions(sys.argv, ["JOB_NAME", "application_opts"])
spark_context = SparkContext()
glue_context = GlueContext(spark_context)
spark_session = glue_context.spark_session
glue_job = Job(glue_context)
glue_job.init(job_args["JOB_NAME"], job_args)

logger.info(f"Starting data quality job {job_args['JOB_NAME']}")
logger.info(f"Application opts: {job_args['application_opts']}")

opts = json.loads(job_args["application_opts"])

config = get_config()
table_config = opts["table"]

logger.info(f"Table config: {json.dumps(table_config, default=str)}")

# Load source data from Glue Data Catalog
source_data_frame = get_source_data_frame(glue_context, table_config)

# Glue API allows up to 255 characters for the evaluation context identifier
MAX_DQ_CONTEXT_LENGTH = 255

for ruleset_name, dqdl in get_rulesets(table_config):
    logger.info(f"Evaluating {ruleset_name=}")
    dq_context = re.sub(
        "[^a-zA-Z0-9_-]", "_", f"{table_config['name']}_{ruleset_name}"
    )[-MAX_DQ_CONTEXT_LENGTH:]
    logger.info(f"{dq_context=}")

    try:
        # Evaluate data quality on source data
        data_quality_results = EvaluateDataQuality().process_rows(
            frame=source_data_frame,
            ruleset=dqdl,
            publishing_options={
                "dataQualityEvaluationContext": dq_context,
                "enableDataQualityCloudWatchMetrics": True,
                "enableDataQualityResultsPublishing": True,
            },
            additional_options={
                "observations.scope": "NONE",
                "performanceTuning.caching": "CACHE_NOTHING",
            },
        )
        logger.info("Data quality evaluation completed")
    except Exception:
        logger.exception(f"Failed to evaluate data quality for {ruleset_name=}")
        raise

    try:
        # Extract rule outcomes from data quality results
        rule_outcomes = SelectFromCollection.apply(
            dfc=data_quality_results,
            key="ruleOutcomes",
            transformation_ctx="rule_outcomes_extraction",
        )
        logger.info("Rule outcomes extracted")
    except Exception:
        logger.exception(f"Failed to extract rule outcomes for {ruleset_name=}")
        raise

    if smus_config := config.get("publishers", {}).get("smus", {}):
        logger.info("Posting results to SMUS")
        # Post data quality results to SageMakerUnifiedStudio
        smus_result = post_dq_results(
            df=rule_outcomes,
            domain_id=smus_config["domainId"],
            asset_ids=table_config.get("smusAssetIds", []),
            asset_source_id=table_config.get("smusSourceAssetId", None),
            dq_ruleset_name=ruleset_name,
            role_to_assume=smus_config.get("role"),
        )
        logger.info("SMUS results posted successfully")
    else:
        logger.info("SMUS publishing not configured, skipping")

logger.info("Committing Glue job")
glue_job.commit()
logger.info("Data quality job completed successfully")
