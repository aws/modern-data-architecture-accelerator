
import logging
import time
import common.utils
import os 
import json

identities_authorizations_config_filename = os.environ['IDENTITIES_AUTHORIZATIONS_CONF']
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Authorizations")
logger.setLevel(logging.INFO)

def load_existing_identities( existing_policies):
    existing_identities_output = json.loads(
        common.utils.nifi_toolkit("registry", ["list-users"]))
    existing_identities = {}
    for user in existing_identities_output:
        user_id = user["identifier"]
        existing_identities[user["identity"]] = user_id
        for access_policy in user.get("accessPolicies", []):
            access_policy_id = access_policy["identifier"]
            existing_policy = existing_policies.get(access_policy_id, None)
            if existing_policy is None:
                existing_policies[access_policy_id] = {
                    "resource": access_policy["resource"],
                    "action": access_policy["action"].upper(),
                    "users": [],
                    "groups": []
                }
            existing_policies[access_policy_id]['users'].append(user_id)
    return existing_identities

def load_existing_groups( existing_policies):
    existing_groups_output = json.loads(
        common.utils.nifi_toolkit("registry", ["list-user-groups"]))
    existing_groups = {}
    for group in existing_groups_output:
        
        group_id = group["identifier"]
        group_members = [user['identifier']
                         for user in group["users"]]
        existing_groups[group["identity"]] = {
            "id": group_id,
            "members": group_members
        }
        for access_policy in group.get("accessPolicies", []):
            access_policy_id = access_policy["identifier"]
            existing_policy = existing_policies.get(access_policy_id, None)
            if existing_policy is None:

                existing_policies[access_policy_id] = {
                    "id": access_policy_id,
                    "resource": access_policy["resource"],
                    "action": access_policy["action"].upper(),
                    "users": [],
                    "groups": []
                }
            existing_policies[access_policy_id]['groups'].append(group_id)

    return existing_groups

def update(identities_authorizations_config):
    existing_policies = {}
    existing_identities = load_existing_identities(existing_policies)
    existing_groups = load_existing_groups( existing_policies)
    common.utils.update("registry", identities_authorizations_config,existing_identities,existing_groups,list(existing_policies.values()))

while True:
    starttime = time.time()

    try:
        identities_authorizations_config = common.utils.load_identities_authorizations_config(identities_authorizations_config_filename)
        update( identities_authorizations_config)

    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        raise e
    elapsed = time.time() - starttime
    logger.info(f"Update loop took {elapsed} seconds")
    sleep_seconds = common.utils.min_update_time - elapsed
    if sleep_seconds > 0:
        logger.info(f"Sleeping {sleep_seconds} seconds")
        time.sleep(sleep_seconds)
