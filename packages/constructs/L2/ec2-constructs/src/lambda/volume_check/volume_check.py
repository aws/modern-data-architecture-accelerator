# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import boto3
import time

logger = logging.getLogger(__name__)
ec2 = boto3.client('ec2')


def lambda_handler(event, context):
    logger.info("Starting")
    logger.info("Sleeping 30 seconds to allow for IAM permission propagation")
    # nosemgrep
    time.sleep(30)
    if event['RequestType'] == 'Create':
        return handle_create(event, context)


def handle_create(event, context):

    resource_config = event['ResourceProperties']

    instance_id = resource_config.get('instanceId', None)
    if(instance_id is None):
        raise Exception(
            f"Missing parameter 'instanceId' in request: {resource_config}")

    instance_kms_key_arn = resource_config.get('kmsKeyArn', None)
    if(instance_kms_key_arn is None):
        raise Exception(
            f"Missing parameter 'kmsKeyArn' in request: {resource_config}")

    logger.info(f"Checking Ec2 volumes for instance {instance_id}")

    instance_response = ec2.describe_instances(InstanceIds=[instance_id])


    volume_ids_devices = {}
    for reservation in instance_response['Reservations']:
        for instance in reservation['Instances']:
            for block_device in instance['BlockDeviceMappings']:
                device_name = block_device['DeviceName']
                volume_id = block_device['Ebs']['VolumeId']
                logger.info(
                    f"Found device {device_name} with volume Id {volume_id}")
                volume_ids_devices[volume_id] = device_name

    volume_ids = list(volume_ids_devices.keys())
    try:
        volume_response = ec2.describe_volumes(VolumeIds=volume_ids)
    except Exception as e:
        # nosemgrep
        logger.error(f"Unable to describe volumes {volume_ids}: {e}")
        raise e

    errors = []
    for volume in volume_response['Volumes']:
        volume_id = volume['VolumeId']
        device_name = volume_ids_devices[volume_id]
        logger.info(
            f"Checking volume {device_name}/{volume_id} for encryption")
        volume_encrypted = volume['Encrypted']
        volume_kms_key = volume.get('KmsKeyId', None)

        if(volume_encrypted is not True or volume_kms_key is None):
            errors.append(
                f"{device_name} ({volume_id}) is not encrypted with the expected Key {instance_kms_key_arn}")
        elif(volume_kms_key != instance_kms_key_arn):
            errors.append(
                f"{device_name} ({volume_id}) is encrypted with Key {volume_kms_key}, not the expected Key {instance_kms_key_arn}")

    if(len(errors) > 0):
        error_string = '\n'.join(errors)
        raise Exception(
            f"Errors validating instance {instance_id} volume encryption:\n { error_string }")

    responseData = {
        "Status": "200"
    }

    return responseData
