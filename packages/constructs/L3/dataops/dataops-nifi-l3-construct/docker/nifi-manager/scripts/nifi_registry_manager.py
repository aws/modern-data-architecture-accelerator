
import logging
import time
import toolkit.utils
import os 
import json
import manager.common

manager_config_filename = os.environ['MANAGER_CONFIG']
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Authorizations")
logger.setLevel(logging.INFO)

def load_existing_identities( existing_policies):
    existing_identities_output = json.loads(
        toolkit.utils.nifi_toolkit("registry", ["list-users"]))
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
        toolkit.utils.nifi_toolkit("registry", ["list-user-groups"]))
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

def find_policies_for_bucket(bucket_id,existing_policies):
    policies = {}
    for (existing_policy_id,existing_policy) in existing_policies.items():
        if(existing_policy['resource'] == f'/buckets/{bucket_id}'):
            policies[existing_policy['action']] = {
                "identifier": existing_policy_id,
                "identities": existing_policy['users'],
                "groups": existing_policy['groups']
            }
    return policies

def load_existing_buckets(existing_policies):
    existing_buckets_output = json.loads(
        toolkit.utils.nifi_toolkit("registry", ["list-buckets"]))
    buckets =  {}
    for existing_bucket in existing_buckets_output:
        bucket_id = existing_bucket['identifier']
        bucket_policies = find_policies_for_bucket(bucket_id,existing_policies)
        buckets[existing_bucket['name']] = {
            "identifier": bucket_id,
            "policies": bucket_policies
        }
    return buckets

def create_bucket(bucket_name):
    return toolkit.utils.nifi_toolkit("registry", ["create-bucket","--bucketName",bucket_name])

def update_buckets(manager_config,existing_policies):
    logger.info("Updating buckets")
    buckets_config = manager_config.get("buckets",{})
    existing_buckets = load_existing_buckets(existing_policies)
    manager_config['policies'] = manager_config.get('policies',[])
    manager_config['authorizations'] = manager_config.get('authorizations',[])
    for (bucket_name,bucket_config) in buckets_config.items():
        existing_bucket = existing_buckets.get(bucket_name,None)
        if existing_bucket is None:
            logger.info(f"Bucket {bucket_name} does not already exist. Creating.")
            # Create Bucket
            bucket_id = create_bucket(bucket_name)
        else:
            bucket_id = existing_bucket['identifier']
        #Update policy and authorization configs
        manager_config['policies'].extend([
            {
                'resource': f"/buckets/{bucket_id}",
                'action': 'READ'
            },
            {
                'resource': f"/buckets/{bucket_id}",
                'action': 'WRITE'
            }
        ])
        if bucket_config.get('READ',None) is not None:
            manager_config['authorizations'].append(
                {
                    'policyResourcePattern': f"/buckets/{bucket_id}",
                    'actions': ['READ'],
                    'identities': bucket_config['READ'].get('identities',[]),
                    'groups': bucket_config['READ'].get('groups',[]),
                }
            )
        if bucket_config.get('WRITE',None) is not None:
            manager_config['authorizations'].append(
                {
                    'policyResourcePattern': f"/buckets/{bucket_id}",
                    'actions': ['WRITE'],
                    'identities': bucket_config['WRITE'].get('identities',[]),
                    'groups': bucket_config['WRITE'].get('groups',[]),
                }
            )


def update(manager_config):
    existing_policies = {}
    existing_identities = load_existing_identities(existing_policies)
    existing_groups = load_existing_groups( existing_policies)
    update_buckets(manager_config,existing_policies)
    manager.common.update_identities_authorizations("registry", manager_config,existing_identities,existing_groups,list(existing_policies.values()))



while True:
    starttime = time.time()

    try:
        manager_config = manager.common.load_manager_config(manager_config_filename)

        update( manager_config)

    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")

    elapsed = time.time() - starttime
    logger.info(f"Update loop took {elapsed} seconds")
    sleep_seconds = manager.common.min_update_time - elapsed
    if sleep_seconds > 0:
        logger.info(f"Sleeping {sleep_seconds} seconds")
        # nosemgrep
        time.sleep(sleep_seconds)
