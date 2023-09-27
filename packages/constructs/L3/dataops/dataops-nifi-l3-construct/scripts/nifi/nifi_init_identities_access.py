import uuid
import xml.etree.ElementTree
import os
import xml.dom.minidom
import re
import json


def generate_stable_identifier(seed):
    class NULL_NAMESPACE:
        bytes = b''
    identifier = str(uuid.uuid3(NULL_NAMESPACE, seed))
    return identifier


def add_missing_node_identifier(users_element, missing_node_identity):
    print(f"Adding missing node identifier: {missing_node_identity}")
    identifier = generate_stable_identifier(missing_node_identity)
    new_node_user_element = xml.etree.ElementTree.SubElement(
        users_element, 'user')
    new_node_user_element.attrib['identity'] = missing_node_identity
    new_node_user_element.attrib['identifier'] = identifier
    return identifier


def add_missing_node_identifiers(nodes, users_element):
    node_users = {}
    for node in nodes.items():
        identifier = node[1].get('identifier', None)
        if identifier is None:
            identifier = add_missing_node_identifier(users_element, node[0])
        node_users[node[0]] = node[1]
        node_users[node[0]]['identifier'] = identifier
    return node_users


def load_existing_node_identifiers(nodes, users_element):
    loaded_nodes = nodes
    for user in users_element:
        identity = user.attrib.get('identity', None)
        if (identity is None):
            print(
                f"Error parsing identity from user attributes: {user.attrib}")
        else:
            if (loaded_nodes.get(identity, None) is not None):
                identifier = user.attrib.get('identifier', None)
                if (identifier is None):
                    print(
                        f"Error parsing identifier from user attributes: {user.attrib}")
                else:
                    generated_identifier = generate_stable_identifier(identity)
                    if (generated_identifier != identifier):
                        print(
                            f"Warning: Loaded identifier ({identifier}) does not match generated identifier ({generated_identifier})")
                    loaded_nodes[identity]['identifier'] = identifier
    print(
        f"Loaded nodes identities: {json.dumps(loaded_nodes,indent=2)}")
    return loaded_nodes


def add_node_identifiers(nodes, users_file):
    if not os.path.exists(users_file):
        print(f"Users file {users_file} not found. Skipping.")
        return
    users_tree = xml.etree.ElementTree.parse(users_file)
    users_element = users_tree.getroot().find('users')
    loaded_nodes = load_existing_node_identifiers(nodes, users_element)
    node_identitifiers = add_missing_node_identifiers(
        loaded_nodes, users_element)
    # print(xml.etree.ElementTree.tostring(users_tree.getroot(),
    #       encoding='unicode', xml_declaration=True))
    users_tree.write(f"{users_file}",
                     encoding='unicode', xml_declaration=True)
    return node_identitifiers


def add_node_to_policy_if_required(policy_name, policy_element, node_name, node_obj):
    found_node = False
    for user in policy_element:
        if user.attrib.get('identifier', None) == node_obj['identifier']:
            found_node = True
    if not found_node:
        print(
            f"Adding missing node identifier ({ node_name}) to {policy_name} policy")
        new_node_user_element = xml.etree.ElementTree.SubElement(
            policy_element, 'user')
        new_node_user_element.attrib['identifier'] = node_obj['identifier']


def policy_matches(policy_name, policies):
    for node_policy in policies:
        if re.search(node_policy, policy_name):
            return True
    return False


def add_node_policy_accesses(nodes, policies, authorizations_file):
    if not os.path.exists(authorizations_file):
        print(
            f"Authorizations file {authorizations_file} not found. Skipping.")
        return
    authorizations_tree = xml.etree.ElementTree.parse(authorizations_file)
    policies_element = authorizations_tree.getroot().find('policies')
    for policy_element in policies_element:
        policy_name = policy_element.attrib.get('resource', None)
        if policy_matches(policy_name, policies):
            for node_name, node_obj in nodes.items():
                add_node_to_policy_if_required(policy_name,
                                               policy_element, node_name, node_obj)
    # print(xml.etree.ElementTree.tostring(authorizations_tree.getroot(),
    #       encoding='unicode', xml_declaration=True))
    authorizations_tree.write(f"{authorizations_file}",
                              encoding='unicode', xml_declaration=True)


node_names = os.environ['NIFI_NODE_LIST'].split(",")
node_policies = os.environ['NIFI_NODE_POLICIES'].split(",")
external_node_names = os.environ['EXTERNAL_NODE_LIST'].split(",")
external_node_policies = os.environ['EXTERNAL_NODE_POLICIES'].split(",")
nifi_data_dir = os.environ['NIFI_DATA_DIR']

print(f"Read Node List from Env: {node_names}")
print(f"Read External Node List from Env: {external_node_names}")

nifi_nodes = {
    node_name: {}
    for node_name in node_names
}

external_nodes = {
    external_node_name: {}
    for external_node_name in external_node_names
}

node_identifiers = add_node_identifiers(
    nifi_nodes, f'{nifi_data_dir}/users.xml')
external_node_identifiers = add_node_identifiers(
    external_nodes, f'{nifi_data_dir}/users.xml')
add_node_policy_accesses(node_identifiers, node_policies,
                         f'{nifi_data_dir}/authorizations.xml')
add_node_policy_accesses(
    external_node_identifiers, external_node_policies, f'{nifi_data_dir}/authorizations.xml')
