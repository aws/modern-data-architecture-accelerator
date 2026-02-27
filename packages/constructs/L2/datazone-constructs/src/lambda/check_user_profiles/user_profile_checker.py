#!/usr/bin/env python3

import logging

logger = logging.getLogger()


def check_user_profile(domain_id, user_identifier, datazone_client):
    """
    Check if a user profile exists in the DataZone domain.
    Raises ValueError if the profile doesn't exist and domain is not in AUTOMATIC assignment mode.

    Args:
        domain_id: DataZone domain identifier
        user_identifier: User identifier (SSO ID or IAM ARN, already resolved by CloudFormation)
        datazone_client: boto3 DataZone client
    """
    logger.info(f"Checking domain user assignment mode: {domain_id}")
    domain_response = datazone_client.get_domain(identifier=domain_id)
    assignment_mode = domain_response.get('singleSignOn', {}).get('userAssignment', 'UNKNOWN')
    logger.info(f"Domain user assignment mode: {assignment_mode}")

    try:
        logger.info(f"Checking if user profile exists: {user_identifier}")
        user_response = datazone_client.get_user_profile(
            domainIdentifier=domain_id, userIdentifier=user_identifier
        )
        logger.info(f"User profile exists: {user_identifier}")
        return user_response['id']
    except datazone_client.exceptions.ResourceNotFoundException:
        if assignment_mode != 'AUTOMATIC':
            raise ValueError(
                f"User profile does not exist: {user_identifier} and domain is in {assignment_mode} user assignment mode."
            )
        else:
            logger.info(
                f"User profile does not exist: {user_identifier} but domain is in AUTOMATIC assignment mode."
            )
