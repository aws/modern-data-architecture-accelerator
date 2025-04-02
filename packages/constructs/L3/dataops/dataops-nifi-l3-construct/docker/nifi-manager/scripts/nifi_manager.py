import os
import json
import time
import socket
import manager.common
import toolkit.utils
import logging

hostname = socket.gethostname()
manager_config_filename = os.environ['MANAGER_CONFIG']
logger = logging.getLogger("Authorizations")
log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
logger.setLevel(getattr(logging, log_level, logging.INFO))
logger.setFormatter(logging.Formatter(
    "%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s"
    "| Function: %(funcName)s | "
    "%(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
))


def load_existing_identities(existing_policies):
    existing_identities_output = json.loads(
        toolkit.utils.nifi_toolkit("nifi", ["list-users"]))
    existing_identities = {}
    for user in existing_identities_output.get("users", []):
        user_component = user["component"]
        user_id = user_component["id"]
        existing_identities[user_component["identity"]] = user_id
        for access_policy in user_component.get("accessPolicies", []):
            access_policy_id = access_policy["component"]["id"]
            existing_policy = existing_policies.get(access_policy_id, None)
            if existing_policy is None:
                existing_policies[access_policy_id] = {
                    "resource": access_policy["component"]["resource"],
                    "action": access_policy["component"]["action"].upper(),
                    "users": [],
                    "groups": []
                }
            existing_policies[access_policy_id]['users'].append(user_id)
    return existing_identities


def load_existing_groups(existing_policies):
    existing_groups_output = json.loads(
        toolkit.utils.nifi_toolkit("nifi", ["list-user-groups"]))
    existing_groups = {}
    for group in existing_groups_output.get("userGroups", []):
        group_component = group["component"]
        group_id = group_component["id"]
        group_members = [user['component']['id']
                         for user in group["component"]["users"]]
        existing_groups[group_component["identity"]] = {
            "id": group_id,
            "members": group_members
        }
        for access_policy in group_component.get("accessPolicies", []):
            access_policy_id = access_policy["component"]["id"]
            existing_policy = existing_policies.get(access_policy_id, None)
            if existing_policy is None:

                existing_policies[access_policy_id] = {
                    "id": access_policy_id,
                    "resource": access_policy["component"]["resource"],
                    "action": access_policy["component"]["action"].upper(),
                    "users": [],
                    "groups": []
                }
            existing_policies[access_policy_id]['groups'].append(group_id)

    return existing_groups


def policy_replace_root_id(policy, root_id):
    policy['resource'] = policy['resource'].replace("ROOT_ID", root_id)
    return policy


def authorization_replace_root_id(authorization, root_id):
    authorization['policyResourcePattern'] = authorization['policyResourcePattern'].replace(
        "ROOT_ID", root_id)
    return authorization


def get_cluster_summary():
    logger.info(f"Getting cluster summary")
    return json.loads(toolkit.utils.nifi_toolkit("nifi", ["cluster-summary"]))['clusterSummary']


def get_cluster_nodes():
    logger.info(f"Getting cluster nodes")
    return json.loads(toolkit.utils.nifi_toolkit("nifi", ["get-nodes"]))['cluster']['nodes']


def get_root_id():
    logger.info(f"Getting root id")
    return toolkit.utils.nifi_toolkit("nifi", ["get-root-id"])


def replace_root_id(identities_authorizations_config):
    identities_authorizations_config['policies'] = [policy_replace_root_id(
        policy, root_id) for policy in identities_authorizations_config.get('policies', [])]
    identities_authorizations_config['authorizations'] = [authorization_replace_root_id(
        authorization, root_id) for authorization in identities_authorizations_config.get('authorizations', [])]
    return identities_authorizations_config


def get_this_cluster_node():
    for node in get_cluster_nodes():
        if node['address'].startswith(hostname):
            return node


def update_registry_client(manager_config):
    logger.info("Updating Registry Clients")
    registry_clients_config = manager_config.get('registry_clients', {})
    existing_clients_output = json.loads(
            toolkit.utils.nifi_toolkit("nifi", ["list-reg-clients"]))['registries']
    existing_clients = {existing_client['registry']['name']:existing_client for existing_client in existing_clients_output}
    for (registry_client_config_name,registry_client_config) in registry_clients_config.items():
        existing_client = existing_clients.get(registry_client_config_name,None) 
        if existing_client is None:
            logger.info(f"Registry client {registry_client_config_name} does not yet exist")
            # Create client
            toolkit.utils.nifi_toolkit("nifi", ["create-reg-client","--registryClientName",registry_client_config_name,"--registryClientUrl",registry_client_config['url']])
        else:
            logger.info(existing_client['registry']['uri'])
            logger.info(registry_client_config['url'])
            if existing_client['registry']['uri'] != registry_client_config['url']:
                logger.info(f"Registry client {registry_client_config_name} url doesn't match. Updating.")
                toolkit.utils.nifi_toolkit("nifi", ["update-reg-client","--registryClientId",existing_client['id'],"--registryClientUrl",registry_client_config['url']])


def update(manager_config):
    update_registry_client(manager_config)
    existing_policies = {}
    existing_identities = load_existing_identities(existing_policies)
    existing_groups = load_existing_groups(existing_policies)
    manager.common.update_identities_authorizations(
        "nifi", manager_config, existing_identities, existing_groups, list(existing_policies.values()))


def cluster_update(manager_config):
    cluster_summary = get_cluster_summary()
    connected = cluster_summary['connectedToCluster']
    if not connected:
        logger.info(
            "In clustered mode but not connected to cluster. Skipping updates.")
    else:
        this_node = get_this_cluster_node()
        if not this_node:
            logger.error("In clustered mode but cannot determine this node.")
        if "Cluster Coordinator" in this_node.get('roles', []):
            update(manager_config)
        else:
            logger.info("This node is not cluster coordinator. Skipping.")


root_id = get_root_id()
logger.info(f"Root ID: {root_id}")
cluster_summary = get_cluster_summary()
clustered = cluster_summary['clustered']
if not clustered:
    logger.info("Not in cluster mode.")

while True:
    starttime = time.time()

    manager_config = replace_root_id(
        manager.common.load_manager_config(manager_config_filename))
    if not clustered:
        update(manager_config)
    else:
        cluster_update(manager_config)


    elapsed = time.time() - starttime
    logger.info(f"Update loop took {elapsed} seconds")
    sleep_seconds = manager.common.min_update_time - elapsed
    if sleep_seconds > 0:
        logger.info(f"Sleeping {sleep_seconds} seconds")
        # nosemgrep
        time.sleep(sleep_seconds)
