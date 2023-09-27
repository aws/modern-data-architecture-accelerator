import json

from cmd import cmd_handler


def handler(event, context):
    print(json.dumps(dict(event, ResponseURL='...')))

    resource_type = event['ResourceType']

    if resource_type == 'Custom::AWSCDK-EKS-KubernetesCmd':
        return cmd_handler(event, context)

    raise Exception("unknown resource type %s" % resource_type)
