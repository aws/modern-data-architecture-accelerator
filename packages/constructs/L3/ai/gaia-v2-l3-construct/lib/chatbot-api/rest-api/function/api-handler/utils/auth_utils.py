import os
from typing import Optional, List, Union

from aws_lambda_powertools.event_handler.api_gateway import Router

# Admin group name from environment variable
ADMIN_GROUP = os.environ.get("ADMIN_GROUP")


def is_admin(router: Router) -> bool:
    """
    Check if the current user has admin privileges.
    
    Args:
        router: The Lambda Powertools router object containing the current event
        
    Returns:
        True if the user is an admin, False otherwise
    """
    # If ADMIN_GROUP is not configured, admin access is impossible
    if not ADMIN_GROUP:
        return False
        
    groups: Union[str, List[str], None] = (
        router.current_event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
        .get("cognito:groups")
    )
    
    if isinstance(groups, str):
        return ADMIN_GROUP in groups.split(",")
    elif isinstance(groups, list):
        return ADMIN_GROUP in groups
    
    return False


def get_user_id(router: Router) -> Optional[str]:
    """
    Get the current authenticated user's ID.
    
    Args:
        router: The Lambda Powertools router object containing the current event
        
    Returns:
        The user ID (Cognito 'sub' claim) or None if not authenticated
    """
    user_id: Optional[str] = (
        router.current_event.get("requestContext", {})
        .get("authorizer", {})
        .get("claims", {})
        .get("sub")
    )

    return user_id
