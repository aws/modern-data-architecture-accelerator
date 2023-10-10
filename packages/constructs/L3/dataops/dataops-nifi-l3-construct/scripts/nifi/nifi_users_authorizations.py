import uuid
import xml.etree.ElementTree
import os
import xml.dom.minidom
import re
import json
import time


def generate_stable_identifier(seed):
    class NULL_NAMESPACE:
        bytes = b''
    identifier = str(uuid.uuid3(NULL_NAMESPACE, seed))
    return identifier


def add_missing_user_identifier(users_element, missing_user_identity):
    print(f"Adding missing user identifier: {missing_user_identity}")
    identifier = generate_stable_identifier(missing_user_identity)
    new_user_user_element = xml.etree.ElementTree.SubElement(
        users_element, 'user')
    new_user_user_element.attrib['identity'] = missing_user_identity
    new_user_user_element.attrib['identifier'] = identifier
    return identifier


def add_missing_user_identifiers(users, users_element):
    user_users = {}
    for user in users.items():
        identifier = user[1].get('identifier', None)
        if identifier is None:
            identifier = add_missing_user_identifier(users_element, user[0])
        user_users[user[0]] = user[1]
        user_users[user[0]]['identifier'] = identifier
    return user_users


def load_existing_user_identifiers(users, users_element):
    loaded_users = users
    for user in users_element:
        identity = user.attrib.get('identity', None)
        if (identity is None):
            print(
                f"Error parsing identity from user attributes: {user.attrib}")
        else:
            if (loaded_users.get(identity, None) is not None):
                identifier = user.attrib.get('identifier', None)
                if (identifier is None):
                    print(
                        f"Error parsing identifier from user attributes: {user.attrib}")
                else:
                    generated_identifier = generate_stable_identifier(identity)
                    if (generated_identifier != identifier):
                        print(
                            f"Warning: Loaded identifier ({identifier}) does not match generated identifier ({generated_identifier})")
                    loaded_users[identity]['identifier'] = identifier
    print(
        f"Loaded users identities: {json.dumps(loaded_users,indent=2)}")
    return loaded_users


def add_user_identifiers(users, users_file):
    if not os.path.exists(users_file):
        print(f"Users file {users_file} not found. Skipping.")
        return
    users_tree = xml.etree.ElementTree.parse(users_file)
    users_element = users_tree.getroot().find('users')
    loaded_users = load_existing_user_identifiers(users, users_element)
    user_identitifiers = add_missing_user_identifiers(
        loaded_users, users_element)
    # print(xml.etree.ElementTree.tostring(users_tree.getroot(),
    #       encoding='unicode', xml_declaration=True))
    users_tree.write(f"{users_file}",
                     encoding='unicode', xml_declaration=True)
    return user_identitifiers


def add_user_to_policy_if_required(policy_name, policy_element, user_name, user_obj):
    found_user = False
    for user in policy_element:
        if user.attrib.get('identifier', None) == user_obj['identifier']:
            found_user = True
    if not found_user:
        print(
            f"Adding missing user identifier ({ user_name}) to {policy_name} policy")
        new_user_user_element = xml.etree.ElementTree.SubElement(
            policy_element, 'user')
        new_user_user_element.attrib['identifier'] = user_obj['identifier']


def policy_matches(policy_name, policies):
    for policy in policies:
        if re.search(policy, policy_name):
            return True
    return False


def add_policy_accesses(users, policies, authorizations_file):
    if not os.path.exists(authorizations_file):
        print(
            f"Authorizations file {authorizations_file} not found. Skipping.")
        return
    authorizations_tree = xml.etree.ElementTree.parse(authorizations_file)
    policies_element = authorizations_tree.getroot().find('policies')
    for policy_element in policies_element:
        policy_name = policy_element.attrib.get('resource', None)
        if policy_matches(policy_name, policies):
            for user_name, user_obj in users.items():
                add_user_to_policy_if_required(policy_name,
                                               policy_element, user_name, user_obj)
    # print(xml.etree.ElementTree.tostring(authorizations_tree.getroot(),
    #       encoding='unicode', xml_declaration=True))
    authorizations_tree.write(f"{authorizations_file}",
                              encoding='unicode', xml_declaration=True)


nifi_data_dir = os.environ['NIFI_DATA_DIR']

admin_names_env = os.environ.get('ADMIN_IDENTITIES', None)
if admin_names_env:
    admin_names = admin_names_env.split(",")
else:
    admin_names = []

admin_policies = os.environ['ADMIN_POLICIES'].split(",")

user_names_env = os.environ.get('USER_IDENTITIES', None)
if user_names_env:
    user_names = user_names_env.split(",")
else:
    user_names = []

users_policies = os.environ['USER_POLICIES'].split(",")

node_names_env = os.environ.get('NIFI_NODES', None)
if node_names_env:
    node_names = node_names_env.split(",")
else:
    node_names = []

node_policies = os.environ['NIFI_NODE_POLICIES'].split(",")

external_node_names_env = os.environ.get('EXTERNAL_NODES', None)
if external_node_names_env:
    external_node_names = external_node_names_env.split(",")
else:
    external_node_names = []

external_node_policies = os.environ['EXTERNAL_NODE_POLICIES'].split(",")

print(f"Read Admin List from Env: {admin_names}")
print(f"Read User List from Env: {user_names}")
print(f"Read Node List from Env: {node_names}")
print(f"Read External Node List from Env: {external_node_names}")

admins = {
    user_name: {}
    for user_name in admin_names
}

users = {
    user_name: {}
    for user_name in user_names
}

nifi_nodes = {
    user_name: {}
    for user_name in node_names
}

external_nodes = {
    user_name: {}
    for user_name in external_node_names
}

admin_identifiers = add_user_identifiers(
    admins, f'{nifi_data_dir}/users.xml')

user_identifiers = add_user_identifiers(
    users, f'{nifi_data_dir}/users.xml')

node_identifiers = add_user_identifiers(
    nifi_nodes, f'{nifi_data_dir}/users.xml')

external_node_identifiers = add_user_identifiers(
    external_nodes, f'{nifi_data_dir}/users.xml')


print("Updating authorizations")
add_policy_accesses(admin_identifiers, admin_policies,
                    f'{nifi_data_dir}/authorizations.xml')
add_policy_accesses(user_identifiers, users_policies,
                    f'{nifi_data_dir}/authorizations.xml')
add_policy_accesses(node_identifiers, node_policies,
                    f'{nifi_data_dir}/authorizations.xml')
add_policy_accesses(
    external_node_identifiers, external_node_policies, f'{nifi_data_dir}/authorizations.xml')
