# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import os

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Provisioning macro")

def lambda_handler(event, context):
    logger.info("**Starting")
    logger.debug(json.dumps(event, indent=2))
    provisioned_id = event['templateParameterValues']['PROVISIONEDID']
    template = event['fragment']
    template_string = json.dumps(template)
    template_string = template_string.replace(
        "__provisioned_id__", provisioned_id)
    template_string = template_string.replace(
        "__PROVISIONED_ID__", provisioned_id)
    request_id = event['requestId']
    return {
        "requestId": request_id,
        "status": "success",
        "fragment": json.loads(template_string)
    }
