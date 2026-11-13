"""
`contain` runbook step: stops the runtime sessions passed in `SessionIds`.

Runs after the containment policy is attached, so a failure here never undoes
containment. Every session is attempted; any that could not be stopped are
named in the failure message so the operator can follow up by ID.
"""

import boto3
from botocore.exceptions import BotoCoreError, ClientError


def handler(events: dict, _context: object) -> dict:
    session_ids = [s.strip() for s in events.get("SessionIds") or [] if isinstance(s, str) and s.strip()]
    if not session_ids:
        return {"Stopped": []}

    try:
        client = boto3.client("bedrock-agentcore")
    except BotoCoreError as err:
        # An SDK in the Automation runtime that predates AgentCore cannot build the client at all.
        raise RuntimeError(_not_stopped_message(0, {sid: type(err).__name__ for sid in session_ids})) from err
    if not hasattr(client, "stop_runtime_session"):
        # An SDK that knows the service but predates StopRuntimeSession.
        raise RuntimeError(_not_stopped_message(0, {sid: "StopRuntimeSession unsupported by SDK" for sid in session_ids}))

    stopped = []
    failures = {}
    for session_id in session_ids:
        try:
            client.stop_runtime_session(
                agentRuntimeArn=events["RuntimeArn"],
                runtimeSessionId=session_id,
                qualifier=events["Qualifier"],
            )
            stopped.append(session_id)
        except ClientError as err:
            failures[session_id] = err.response.get("Error", {}).get("Code", "Unknown")
        except BotoCoreError as err:
            failures[session_id] = type(err).__name__

    if failures:
        raise RuntimeError(_not_stopped_message(len(stopped), failures))
    return {"Stopped": stopped}


def _not_stopped_message(stopped_count: int, failures: dict) -> str:
    detail = ", ".join(f"{session_id} ({reason})" for session_id, reason in failures.items())
    return (
        f"The containment policy is attached. Stopped {stopped_count} of {stopped_count + len(failures)} "
        f"sessions; not stopped: {detail}. A ResourceNotFoundException can mean the session already ended "
        "or that it runs under a different Qualifier."
    )
