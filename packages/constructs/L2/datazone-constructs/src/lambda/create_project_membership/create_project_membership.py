"""
Custom Resource to create DataZone Project Membership
Uses DataZone SDK to create project membership, compatible with IAM_IDC domains
"""
import json
import logging
import boto3
from typing import Any, Dict

logger = logging.getLogger()
logger.setLevel(logging.INFO)

datazone = boto3.client('datazone')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle CloudFormation custom resource events for DataZone project membership
    """
    logger.info(f"Event: {json.dumps(event)}")
    
    request_type = event['RequestType']
    props = event['ResourceProperties']
    
    domain_id = props['DomainId']
    project_id = props['ProjectId']
    user_identifier = props['UserIdentifier']
    designation = props.get('Designation', 'PROJECT_OWNER')
    
    physical_resource_id = f"{domain_id}:{project_id}:{user_identifier}"
    
    try:
        if request_type == 'Create':
            response = datazone.create_project_membership(
                domainIdentifier=domain_id,
                projectIdentifier=project_id,
                member={'userIdentifier': user_identifier},
                designation=designation
            )
            logger.info(f"Created project membership: {response}")
            
        elif request_type == 'Update':
            # Delete old membership and create new one
            old_props = event.get('OldResourceProperties', {})
            if old_props:
                old_user = old_props.get('UserIdentifier')
                if old_user and old_user != user_identifier:
                    try:
                        datazone.delete_project_membership(
                            domainIdentifier=domain_id,
                            projectIdentifier=project_id,
                            member={'userIdentifier': old_user}
                        )
                    except Exception as e:
                        logger.warning(f"Failed to delete old membership: {e}")
            
            response = datazone.create_project_membership(
                domainIdentifier=domain_id,
                projectIdentifier=project_id,
                member={'userIdentifier': user_identifier},
                designation=designation
            )
            logger.info(f"Updated project membership: {response}")
            
        elif request_type == 'Delete':
            try:
                datazone.delete_project_membership(
                    domainIdentifier=domain_id,
                    projectIdentifier=project_id,
                    member={'userIdentifier': user_identifier}
                )
                logger.info("Deleted project membership")
            except datazone.exceptions.ResourceNotFoundException:
                logger.info("Project membership already deleted")
            except Exception as e:
                logger.warning(f"Failed to delete membership: {e}")
                # Don't fail on delete
        
        return {
            'PhysicalResourceId': physical_resource_id,
            'Data': {
                'MembershipId': physical_resource_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise
