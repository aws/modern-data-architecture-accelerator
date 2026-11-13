"""
`contain` runbook step: reports whether the execution named any approvers.

aws:branch compares only strings, numbers and booleans, so it cannot test the
`Approvers` StringList for emptiness itself. This step turns it into a boolean
the branch can evaluate.
"""


def handler(events: dict, _context: object) -> dict:
    approvers = [a for a in events.get("Approvers") or [] if isinstance(a, str) and a.strip()]
    return {"HasApprovers": bool(approvers)}
