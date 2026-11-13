"""
`contain` runbook step: tags the execution role with the containment time.

The `release` runbook's gate is measured from this tag, so the value must be
written in the format release_gate.py parses (TIMESTAMP_FORMAT, UTC). Running
`contain` again on a contained role moves the tag forward, which only lengthens
the gate.
"""

from datetime import datetime, timezone

import boto3

TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def handler(events: dict, _context: object) -> dict:
    contained_at = datetime.now(timezone.utc).strftime(TIMESTAMP_FORMAT)
    boto3.client("iam").tag_role(
        RoleName=events["RoleName"],
        Tags=[{"Key": events["TagKey"], "Value": contained_at}],
    )
    return {"ContainedAt": contained_at}
