from genai_core.types import Agent
from genai_core.clients import get_bedrock_client
from typing import List


def list_agents():
    client = get_bedrock_client('bedrock-agent')
    list_of_agents:  List[Agent] = []
    next_token = None
    while True:
        if next_token is None:
            agents = client.list_agents()
        else:
            agents = client.list_agents(nextToken=next_token)
        for agent in agents['agentSummaries']:
            if agent['agentStatus'] != 'PREPARED':
                continue
            agent_id = agent['agentId']
            agent_name = agent['agentName']
            aliases = client.list_agent_aliases(
                agentId=agent_id
            )
            # select the alias which has agentAliasName matching the agent_name
            alias = next((a for a in aliases['agentAliasSummaries'] if a['agentAliasName'] == agent_name), None)
            if alias:
                list_of_agents.append({
                    "name": agent_name,
                    "id": agent_id,
                    "alias_id": alias['agentAliasId']
                })


        if 'nextToken' in agents:
            next_token = agents['nextToken']
        else:
            break


    return list_of_agents

