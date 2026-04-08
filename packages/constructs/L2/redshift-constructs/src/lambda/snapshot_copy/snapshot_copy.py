"""
Custom Resource handler for enabling/disabling Redshift cross-region snapshot copy.
"""

import json
import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

redshift = boto3.client('redshift')


def lambda_handler(event, context):
    logger.info(json.dumps(event))
    request_type = event['RequestType']
    props = event['ResourceProperties']

    cluster_id = props['ClusterIdentifier']
    destination_region = props.get('DestinationRegion')

    try:
        if request_type in ('Create', 'Update'):
            params = {
                'ClusterIdentifier': cluster_id,
                'DestinationRegion': destination_region,
            }

            # Disable first on Update to allow changing destination region
            if request_type == 'Update':
                try:
                    redshift.disable_snapshot_copy(ClusterIdentifier=cluster_id)
                    logger.info(f'Disabled snapshot copy on {cluster_id}')
                except redshift.exceptions.SnapshotCopyAlreadyDisabledFault:
                    logger.info(f'Snapshot copy already disabled on {cluster_id}')

            redshift.enable_snapshot_copy(**params)
            logger.info(f'Enabled snapshot copy on {cluster_id} to {destination_region}')

        elif request_type == 'Delete':
            try:
                redshift.disable_snapshot_copy(ClusterIdentifier=cluster_id)
                logger.info(f'Disabled snapshot copy on {cluster_id}')
            except redshift.exceptions.SnapshotCopyAlreadyDisabledFault:
                logger.info(f'Snapshot copy already disabled on {cluster_id}')
            except redshift.exceptions.ClusterNotFoundFault:
                logger.info(f'Cluster {cluster_id} not found, skipping disable')

    except Exception as e:
        logger.error(f'Error: {e}')
        raise

    return {'PhysicalResourceId': f'{cluster_id}-snapshot-copy'}
