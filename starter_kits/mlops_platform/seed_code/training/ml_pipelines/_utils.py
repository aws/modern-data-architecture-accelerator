# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Provides utilities for SageMaker Pipeline CLI."""

import ast
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_ALLOWED_MODULE_PREFIX = "ml_pipelines."


def _validate_module_name(module_name: str) -> None:
    if not module_name.startswith(_ALLOWED_MODULE_PREFIX):
        raise ValueError(
            f"Module name must start with '{_ALLOWED_MODULE_PREFIX}'. "
            f"Received: '{module_name}'."
        )


def get_pipeline_driver(module_name: str, passed_args: Optional[str] = None) -> Any:
    """Gets the driver for generating your pipeline definition.

    Pipeline modules must define a get_pipeline() module-level method.

    Args:
        module_name: The module name of your pipeline.
        passed_args: Optional passed arguments that your pipeline may be templated by.

    Returns:
        The SageMaker Workflow pipeline.
    """
    # Security note: module_name comes from the -n CLI argument in run_pipeline.py,
    # which is invoked by CodeBuild in a controlled environment. The CodeBuild buildspec
    # hardcodes the module name (e.g. "ml_pipelines.training.pipeline"), so the value
    # is not user-controllable at runtime. The CodeBuild environment is ephemeral,
    # built from a locked requirements.txt, and runs in an isolated VPC with no
    # inbound access. Restrict module_name to the ml_pipelines namespace as a defense
    # in depth measure.
    _validate_module_name(module_name)
    _imports = __import__(module_name, fromlist=["get_pipeline"])
    kwargs = convert_struct(passed_args)
    return _imports.get_pipeline(**kwargs)


def convert_struct(str_struct: Optional[str] = None) -> Any:
    """convert the string argument to its proper type

    Args:
        str_struct (str, optional): string to be evaluated. Defaults to None.

    Returns:
        string struct as its actual evaluated type
    """
    if not str_struct:
        return {}
    try:
        return ast.literal_eval(str_struct)
    except (ValueError, SyntaxError) as e:
        raise ValueError(
            f"Failed to parse argument string: '{str_struct}'. "
            f"Expected a valid Python literal (dict, list, etc.). Error: {e}"
        ) from e


def get_pipeline_custom_tags(module_name: str, args: Optional[str], tags: Dict[str, Any]) -> Dict[str, Any]:
    """Gets the custom tags for pipeline.

    This is an optional extension point — pipeline modules may define a
    get_pipeline_custom_tags function to add extra tags. If the function
    is not defined (AttributeError) or the module cannot be loaded (ImportError),
    the base tags are returned unchanged. This is intentional so that pipelines
    without custom tags still work.

    Returns:
        Custom tags to be added to the pipeline, or the original tags if unavailable.
    """
    try:
        _validate_module_name(module_name)
    except ValueError:
        logger.warning("Module name '%s' outside allowed namespace, skipping custom tags.", module_name)
        return tags
    try:
        _imports = __import__(module_name, fromlist=["get_pipeline_custom_tags"])
        kwargs = convert_struct(args)
        return _imports.get_pipeline_custom_tags(tags, kwargs["region"], kwargs["sagemaker_project_arn"])
    except KeyError as e:
        raise ValueError(
            f"Missing required argument {e} in pipeline parameters. "
            f"Provide 'region' and 'sagemaker_project_arn' in the --kwargs argument."
        ) from e
    except (ImportError, AttributeError) as e:
        logger.info("No custom tags function in %s, using default tags: %s", module_name, e)
    except Exception as e:
        logger.warning("Unexpected error getting project tags from %s: %s", module_name, e)
    return tags
