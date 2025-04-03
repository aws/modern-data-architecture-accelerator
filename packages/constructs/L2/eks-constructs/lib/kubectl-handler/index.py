import json
import logging
from cmd import cmd_handler
import os

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("EKS constructs")




def handler(event, context):
    logger.debug(json.dumps(dict(event, ResponseURL='...')))

    resource_type = event['ResourceType']

    if resource_type == 'Custom::AWSCDK-EKS-KubernetesCmd':
        return cmd_handler(event, context)

    raise Exception("unknown resource type %s" % resource_type)
