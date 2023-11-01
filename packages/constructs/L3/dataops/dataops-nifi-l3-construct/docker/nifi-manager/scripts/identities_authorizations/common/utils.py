import logging
import os
import json
import time
import re
import pexpect

nifi_toolkit_cli = f"{os.environ['NIFI_TOOLKIT_HOME']}/bin/cli.sh"
min_update_time = os.environ.get('NIFI_UPDATE_MIN_TIME', 10)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Authorizations")
logger.setLevel(logging.INFO)

toolkit_child = None
toolkit_child_timestamp = time.time()

def get_toolkit_process():
    global toolkit_child,toolkit_child_timestamp
    if toolkit_child is not None and time.time() - toolkit_child_timestamp > 3600 and toolkit_child.isalive():
        logger.info(f"Restarting child after 1 hour")
        toolkit_child.kill(0)

    if toolkit_child is None or not toolkit_child.isalive():
        toolkit_child_timestamp = time.time()
        logger.info("Toolkit not running. Spawning child process.")
        os.environ['TERM'] = 'dumb'
        toolkit_child = pexpect.spawn(
            f"bash --noediting -c 'stty -icanon & {nifi_toolkit_cli}'", echo=False, dimensions=(1000, 10000))
        toolkit_child.expect('#>')
    return toolkit_child


def nifi_toolkit_pexpect(nifi_app, cmd):
    toolkit_process = get_toolkit_process()
    sendline = nifi_app + ' ' + ' '.join(cmd)
    toolkit_process.sendline(sendline)
    toolkit_process.expect('#>*')
    before = toolkit_process.before
    # print(f"RAW: \n------\n{before}\n------\n")
    # print(f"Raw Decoded: \n------\n{before.decode('ascii')}\n------\n")
    output = before.decode(
        'ascii').strip(sendline).strip()
    # print(f"Output: \n------\n{output}\n------\n")
    return output


def nifi_toolkit(nifi_app, args):
    while True:

        cmd = args + ["-ot", "json"]
        logger.info(f"Executing cmd: {' '.join(cmd)}")
        starttime = time.time()
        output = nifi_toolkit_pexpect(nifi_app, cmd)
        elapsed = time.time() - starttime
        logger.info(f"Command took {elapsed} seconds")

        if "ERROR:" in output:
            if 'connect timed out' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Timeout.")
            elif 'No route to host' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. No route to host.")
            elif 'Connection refused' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Connection refused.")
            elif 'The Flow Controller is initializing the Data Flow' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Initializing flow.")
            elif 'Cannot replicate request' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Cannot replicate request. Node disconnected.")
            elif 'no nodes are connected' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. No nodes are connected.")
            elif 'is currently connecting' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Node is currently connecting.")
            else:
                logger.error(f"Nifi Toolkit Exception: {output}")
                raise Exception(f"Nifi Toolkit Exception: {output}")
        else:
            return output
        logger.info("Retrying in 10 seconds.")
        time.sleep(10)


def load_identities_authorizations_config(identities_authorizations_config_filename):
    with open(identities_authorizations_config_filename) as identities_authorizations_config_file:
        identities_authorizations_config = json.load(
            identities_authorizations_config_file)
    return identities_authorizations_config


def create_identity(nifi_app, identity):
    try:
        return nifi_toolkit(nifi_app, ["create-user", "--userName", f"'{identity}'"])
    except Exception as e:
        if "User/user group already exists" in str(e):
            return
        raise e


def update_identities(nifi_app, identities_config, existing_identities):
    logger.info(
        f"Updating identities")

    new_identities = {
        identity:  create_identity(nifi_app, identity) for identity in identities_config if existing_identities.get(identity, None) is None
    }
    identities = {**existing_identities, **new_identities}
    return identities


def authorization_matches_policy(policy, authorization_config):
    if re.search(authorization_config['policyResourcePattern'], policy['resource']):
        if policy['action'] in authorization_config['actions']:
            return True
    return False


def update_policy_users(nifi_app, policy, users, authorization_config):
    new_policy_user_identifiers = []
    existing_policy_identifiers = policy.get(
        'identifiers', [])  # existing policy may not yet exist, so might not have identifiers
    for user_identity_config in authorization_config.get('users', []):
        user_identifier = users.get(
            user_identity_config, None)
        if not user_identifier:
            logger.warning(
                f"Authorization config {authorization_config['policyResourcePattern']}/{'|'.join(authorization_config['actions'])} references non-existent user identity {user_identity_config}")
        elif user_identifier not in existing_policy_identifiers:
            logger.info(
                f"Adding missing user identity {user_identity_config} to policy {policy['resource']}/{policy['action']}")
            new_policy_user_identifiers.append(user_identifier)
    if len(new_policy_user_identifiers) > 0:
        identifers = new_policy_user_identifiers + existing_policy_identifiers
        logger.info(
            f"Updating policy {policy['resource']}/{policy['action']} with user ids {','.join(identifers)}")
        nifi_toolkit(nifi_app, ["update-policy", "--accessPolicyResource",
                                f"'{policy['resource']}'", "--accessPolicyAction", policy['action'], '-uil', ','.join(identifers)])


def update_policy_groups(nifi_app, policy, groups, authorization_config):
    new_policy_group_identifiers = []
    existing_policy_identifiers = policy.get(
        'groups', [])  # existing policy may not yet exist, so might not have groups
    for group_identity_config in authorization_config.get('groups', []):
        group_identifier = groups.get(
            group_identity_config, None)
        if not group_identifier:
            logger.warning(
                f"Authorization config references non-existent group {group_identity_config}")
        elif group_identifier not in existing_policy_identifiers:
            logger.info(
                f"Adding missing group {group_identity_config} to policy {policy['resource']}/{policy['action']}")
            new_policy_group_identifiers.append(group_identifier)
    if len(new_policy_group_identifiers) > 0:
        identifers = new_policy_group_identifiers + \
            existing_policy_identifiers  # FIX adds users back as groups
        logger.info(
            f"Updating policy {policy['resource']}/{policy['action']} with group ids {','.join(identifers)}")
        nifi_toolkit(nifi_app, ["update-policy", "--accessPolicyResource",
                                f"'{policy['resource']}'", "--accessPolicyAction", policy['action'], '-gil', ','.join(identifers)])


def update_policies(policies_config, policies):
    logger.info(f"Updating policies")
    for policy_config in policies_config:
        policy_exists = False
        for policy in policies:
            if policy_config['resource'] == policy['resource'] and policy_config['action'] == policy['action']:
                policy_exists = True
        if not policy_exists:
            logger.info(
                f"Creating missing policy {policy_config['resource']}/{policy_config['action']}")
            policies.append(policy_config)
    return policies


def update_authorizations(nifi_app, authorizations_config, policies, users, groups):
    logger.info(f"Updating Authorizations")
    for authorization_config in authorizations_config:
        matched = False
        for policy in policies:
            if authorization_matches_policy(policy, authorization_config):
                matched = True
                update_policy_users(nifi_app,
                                    policy, users, authorization_config)
                update_policy_groups(nifi_app,
                                     policy, groups, authorization_config)
        if not matched:
            logger.warning(
                f"Authorization {authorization_config['policyResourcePattern']} with actions {'|'.join(authorization_config['actions'])} matches no policies")


def create_group(nifi_app, group_name, configured_group_members, user_identities):
    group_user_ids = []
    for configured_group_member in configured_group_members:
        user_id = user_identities.get(configured_group_member, None)
        if user_id is None:
            logger.warning(
                f"Group {group_name} references non-exstent user identity {configured_group_member}. Skipping.")
        else:
            group_user_ids.append(user_id)
    if len(group_user_ids) > 0:
        group_id = nifi_toolkit(nifi_app, ["create-user-group", "--userGroupName",
                                           f"'{group_name}'", "-uil", ','.join(group_user_ids)])
        print(f"Created Group: {group_id}")
        return group_id
    else:
        logger.warn(f"Not creating empty group {group_name}")


def update_group(nifi_app, group_name, group_id, configured_group_members, existing_group_members, user_identities):
    update_group_user_ids = []
    for configured_group_member in configured_group_members:
        user_id = user_identities.get(configured_group_member, None)
        if user_id is None:
            logger.warning(
                f"Group {group_name} references non-exstent user identity {configured_group_member}. Skipping.")
        else:
            if user_id not in existing_group_members:
                logger.info(
                    f"Adding {configured_group_member} to {group_name}")
                update_group_user_ids.append(user_id)
    if len(update_group_user_ids) > 0:
        nifi_toolkit(nifi_app, ["update-user-group", "--userGroupId",
                                group_id, "-uil", ','.join(update_group_user_ids + existing_group_members)])


def update_groups(nifi_app, groups_config, user_identities, existing_groups):
    logger.info("Updating groups")

    groups = {}
    for (group_name, configured_group_members) in groups_config.items():
        existing_group = existing_groups.get(group_name, None)
        if existing_group is None:
            logger.info(f"Group {group_name} does not exist. Creating.")
            group_id = create_group(nifi_app, group_name,
                                    configured_group_members,  user_identities)
            groups[group_name] = group_id
        else:
            # update group membership
            update_group(nifi_app, group_name,existing_group['id'],
                         configured_group_members, existing_group['members'], user_identities)
            groups[group_name] = existing_group['id']

    return groups


def update(nifi_app, identities_authorizations_config, existing_identities, existing_groups, existing_policies):
    logger.info("Updating...")
    identities_config = identities_authorizations_config.get('identities', [])
    groups_config = identities_authorizations_config.get('groups', [])
    policies_config = identities_authorizations_config.get(
        'policies', [])
    authorizations_config = identities_authorizations_config.get(
        'authorizations', [])

    user_identities = update_identities(nifi_app,
                                        identities_config, existing_identities)
    groups = update_groups(nifi_app,
                           groups_config, user_identities, existing_groups)

    policies = update_policies(
        policies_config,  existing_policies)

    update_authorizations(nifi_app, authorizations_config,
                          policies, user_identities, groups)
