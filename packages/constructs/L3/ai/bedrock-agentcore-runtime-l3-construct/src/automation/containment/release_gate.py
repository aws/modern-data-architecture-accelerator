"""
`release` runbook step: refuses to release before the release gate has passed.

A session running at containment keeps receiving fresh role credentials until it
ends, and those credentials work again once the containment policy is detached.
Release is therefore safe only after every such session has ended (at most the
runtime's maxLifetime after containment) and the last credential issued to it has
expired (at most the role's MaxSessionDuration after that).

Sessions started or resumed after containment are not covered: invocations still
arrive while the role is contained, and a session they start can outlive a gate
measured from the containment time. The operator blocks new invocations and runs
`contain` again, which moves the tag forward, before relying on the gate.
"""

from datetime import datetime, timedelta, timezone

import boto3

# Must match record_containment.py, which writes the tag this step reads.
TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def handler(events: dict, _context: object) -> dict:
    if _is_true(events.get("Force")):
        return {"GateStatus": "forced"}

    role = boto3.client("iam").get_role(RoleName=events["RoleName"])["Role"]
    gate_opens_at = gate_opening_time(role, events["TagKey"], int(events["MaxLifetimeSeconds"]))
    if datetime.now(timezone.utc) < gate_opens_at:
        raise RuntimeError(
            f"The release gate has not passed. It opens at {gate_opens_at.strftime(TIMESTAMP_FORMAT)}. "
            "Run release again after that time, or pass Force=true only after stopping the live sessions "
            "by ID and revoking the role's active sessions."
        )
    return {"GateStatus": "passed", "GateOpenedAt": gate_opens_at.strftime(TIMESTAMP_FORMAT)}


def gate_opening_time(role: dict, tag_key: str, max_lifetime_seconds: int) -> datetime:
    """Returns the containment time from the role's tag plus maxLifetime plus MaxSessionDuration."""
    contained_at = next((t["Value"] for t in role.get("Tags", []) if t["Key"] == tag_key), None)
    if contained_at is None:
        raise RuntimeError(
            f"Role {role['RoleName']} has no {tag_key} tag, so the release gate cannot be computed. "
            "Pass Force=true only after stopping the live sessions by ID and revoking the role's active sessions."
        )
    try:
        start = datetime.strptime(contained_at, TIMESTAMP_FORMAT).replace(tzinfo=timezone.utc)
    except ValueError as err:
        raise RuntimeError(
            f"The {tag_key} tag value {contained_at!r} is not a {TIMESTAMP_FORMAT} UTC timestamp, "
            "so the release gate cannot be computed."
        ) from err
    return start + timedelta(seconds=max_lifetime_seconds + int(role["MaxSessionDuration"]))


def _is_true(value: object) -> bool:
    return value is True or str(value).lower() == "true"
