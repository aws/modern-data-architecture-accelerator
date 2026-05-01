# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""A CLI to get pipeline definitions from pipeline modules."""

import argparse
import logging
import sys

from ml_pipelines._utils import get_pipeline_driver

logger = logging.getLogger(__name__)


def main() -> None:  # pragma: no cover
    """The main harness that gets the pipeline definition JSON.

    Logs the json or saves to file.
    """
    parser = argparse.ArgumentParser("Gets the pipeline definition for the pipeline script.")

    parser.add_argument(
        "-n",
        "--module-name",
        dest="module_name",
        type=str,
        required=True,
        help="The module name of the pipeline to import.",
    )
    parser.add_argument(
        "-f",
        "--file-name",
        dest="file_name",
        type=str,
        default=None,
        help="The file to output the pipeline definition json to.",
    )
    parser.add_argument(
        "-kwargs",
        "--kwargs",
        dest="kwargs",
        default=None,
        help="Dict string of keyword arguments for the pipeline generation (if supported)",
    )
    args = parser.parse_args()

    try:
        pipeline = get_pipeline_driver(args.module_name, args.kwargs)
        content = pipeline.definition()
        if args.file_name:
            with open(args.file_name, "w") as f:
                f.write(content)
        else:
            logger.info("Pipeline definition: %s", content)
    except Exception as e:  # pylint: disable=W0703
        logger.exception("Exception: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
