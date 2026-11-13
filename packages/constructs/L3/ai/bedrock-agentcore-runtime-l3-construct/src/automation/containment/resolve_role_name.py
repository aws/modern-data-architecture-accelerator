"""
`contain` and `release` runbook step: resolves the execution role's name from its ARN.

The IAM calls the runbooks make take a role name, but a referenced role's ARN can be
a dynamic reference (`roleArn: ssm:/...`) that resolves only at deploy, so the name
cannot be derived at synth. A role name is the last segment of the ARN's path.
"""


def handler(events: dict, _context: object) -> dict:
    role_arn = str(events.get("RoleArn") or "")
    parts = role_arn.split(":", 5)
    resource = parts[5] if len(parts) == 6 and parts[2] == "iam" else ""
    if not resource.startswith("role/"):
        raise ValueError(f"{role_arn!r} is not an IAM role ARN, so the containment runbooks cannot act on it.")
    return {"RoleName": resource.rsplit("/", 1)[-1]}
