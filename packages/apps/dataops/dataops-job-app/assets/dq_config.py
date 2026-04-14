import json
import logging
from typing import Dict, Tuple
from urllib.parse import urlparse

import boto3
from awsglue.context import GlueContext

logger = logging.getLogger(__name__)
glue_client = boto3.client("glue")
s3_resource = boto3.resource("s3")


def s3parse(s3_uri: str) -> Tuple[str, str]:
    """Parse S3 URI and return bucket_name and object_key."""
    parsed = urlparse(s3_uri)
    return parsed.netloc, parsed.path.lstrip("/")


def read_s3_object(bucket_name, key):
    s3_obj = s3_resource.Object(bucket_name, key)
    return s3_obj.get()["Body"].read().decode("utf-8")


def get_config(config_file: str = "config.json") -> Dict[str, Dict]:
    try:
        with open(config_file, "r") as file:
            config = json.load(file)
    except FileNotFoundError:
        raise ValueError(f"Config file '{config_file}' not found. Ensure it is bundled as additionalFiles.")
    except json.JSONDecodeError as e:
        raise ValueError(f"Config file '{config_file}' contains invalid JSON: {e}")

    if not isinstance(config, dict):
        raise ValueError(f"Config file '{config_file}' must contain a JSON object, got {type(config).__name__}")

    if "publishers" in config and not isinstance(config["publishers"], dict):
        raise ValueError(f"'publishers' in config must be a JSON object, got {type(config['publishers']).__name__}")

    return config


def get_rulesets(table_config: Dict[str, Dict]):
    for ruleset_name, ruleset in table_config["rulesets"].items():
        if ruleset["type"] == "dqdl":
            yield ruleset_name, ruleset["value"]
        elif ruleset["type"] == "s3":
            bucket, key = s3parse(ruleset["value"])
            yield ruleset_name, read_s3_object(bucket, key)
        elif ruleset["type"] == "glue_recommendations":
            glue_ruleset_name = ruleset["rulesetName"]
            response = glue_client.get_data_quality_ruleset(Name=glue_ruleset_name)
            yield ruleset_name, response["Ruleset"]


def get_source_data_frame(glue_context: GlueContext, table_config: Dict[str, Dict]):
    logger.info("Loading source data frame")
    try:
        transformation_ctx = "source_data_frame"
        source_cfg = table_config["source"]
        source_type = source_cfg["type"]
        logger.info(f"Source type: {source_type}")
        if "connection_options" in source_cfg:
            if secret_arn := source_cfg["connection_options"].get("secret_arn"):
                secrets_client = boto3.client("secretsmanager")
                secret = json.loads(
                    secrets_client.get_secret_value(SecretId=secret_arn)["SecretString"]
                )
                source_cfg["connection_options"]["user"] = secret["username"]
                source_cfg["connection_options"]["password"] = secret["password"]
            if source_type == "unsupported":
                source_type = source_cfg["unsupported_type"]
            opts = {"connection_options": source_cfg["connection_options"]}
            if "format" in source_cfg:
                opts["format"] = source_cfg["format"]
            if "format_options" in source_cfg:
                opts["format_options"] = source_cfg["format_options"]
            result = glue_context.create_dynamic_frame.from_options(
                connection_type=source_type,
                transformation_ctx=transformation_ctx,
                **opts,
            )
        else:
            result = glue_context.create_dynamic_frame.from_catalog(
                database=source_cfg["database"],
                table_name=source_cfg["table_name"],
                transformation_ctx=transformation_ctx,
            )
        logger.info("Source data frame loaded successfully")
        return result
    except Exception:
        logger.exception("Failed to load source data frame")
        raise
