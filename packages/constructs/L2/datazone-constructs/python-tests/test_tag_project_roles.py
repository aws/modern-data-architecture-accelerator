"""
Unit tests for tag_project_roles Lambda function.
"""
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import tag_project_roles
from botocore.exceptions import ClientError

KEY = tag_project_roles.PROJECT_TAG_KEY
PROJECT = "prj_this"
OTHER_PROJECT = "prj_other"
PREVIOUS_PROJECT = "prj_previous"


def arn(role_name):
    return f"arn:aws:iam::123456789012:role/{role_name}"


class FakeIam:
    """In-memory IAM holding each role's AmazonDataZoneProject value (None when untagged)."""

    def __init__(self, project_tags):
        self.project_tags = dict(project_tags)
        self.fail_tag_for = set()
        self.fail_untag_for = set()
        # Error codes each operation raises before succeeding, as while a policy change propagates.
        self.transient_errors = {}
        self.truncated = False
        self.tagged = []
        self.untagged = []
        self.exceptions = SimpleNamespace(
            NoSuchEntityException=type("NoSuchEntityException", (Exception,), {})
        )

    def _require(self, role_name, operation):
        if self.transient_errors.get(operation):
            code = self.transient_errors[operation].pop(0)
            raise ClientError({"Error": {"Code": code, "Message": "transient"}}, operation)
        if role_name not in self.project_tags:
            raise self.exceptions.NoSuchEntityException(role_name)

    def list_role_tags(self, RoleName, MaxItems):
        self._require(RoleName, "ListRoleTags")
        value = self.project_tags[RoleName]
        tags = [{"Key": "team", "Value": "data"}]
        return {
            "Tags": tags if value is None else [*tags, {"Key": KEY, "Value": value}],
            "IsTruncated": self.truncated,
        }

    def tag_role(self, RoleName, Tags):
        self._require(RoleName, "TagRole")
        if RoleName in self.fail_tag_for:
            raise RuntimeError(f"AccessDenied on {RoleName}")
        assert Tags == [{"Key": KEY, "Value": Tags[0]["Value"]}]
        self.project_tags[RoleName] = Tags[0]["Value"]
        self.tagged.append(RoleName)

    def untag_role(self, RoleName, TagKeys):
        self._require(RoleName, "UntagRole")
        if RoleName in self.fail_untag_for:
            raise ClientError({"Error": {"Code": "ServiceFailure", "Message": "untag failed"}}, "UntagRole")
        assert TagKeys == [KEY]
        self.project_tags[RoleName] = None
        self.untagged.append(RoleName)


@pytest.fixture
def fake_iam():
    def make(project_tags):
        iam = FakeIam(project_tags)
        patcher = patch.object(tag_project_roles, "iam_client", iam)
        patcher.start()
        created.append(patcher)
        return iam

    created = []
    yield make
    for patcher in created:
        patcher.stop()


@pytest.fixture(autouse=True)
def sleeps():
    with patch.object(tag_project_roles.time, "sleep") as sleep:
        yield sleep


def event(request_type, role_names, project_id=PROJECT, **extra):
    return {
        "RequestType": request_type,
        "ResourceProperties": {"projectId": project_id, "roleArns": [arn(name) for name in role_names]},
        **extra,
    }


def update_event(role_names, old_role_names, old_project_id=PROJECT, project_id=PROJECT, physical_project_id=None):
    """An Update; a rollback Update swaps the properties, so its physical ID is from the newer project."""
    return event(
        "Update",
        role_names,
        project_id,
        PhysicalResourceId=f"{physical_project_id or old_project_id}-role-tags",
        OldResourceProperties={"projectId": old_project_id, "roleArns": [arn(name) for name in old_role_names]},
    )


class TestRoleNames:
    def test_strips_paths_and_deduplicates_in_order(self):
        arns = [arn("team/etl"), arn("admin"), arn("etl")]
        assert tag_project_roles.role_names_from_arns(arns) == ["etl", "admin"]


class TestCreate:
    def test_tags_untagged_roles_and_skips_roles_already_tagged_for_this_project(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None, "admin": PROJECT})

        response = tag_project_roles.lambda_handler(event("Create", ["etl", "admin"]), lambda_context)

        assert response == {"PhysicalResourceId": f"{PROJECT}-role-tags"}
        assert iam.tagged == ["etl"]
        assert iam.project_tags == {"etl": PROJECT, "admin": PROJECT}

    def test_fails_naming_the_role_and_other_project_without_tagging_anything(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None, "admin": OTHER_PROJECT})

        with pytest.raises(ValueError, match=f"role 'admin' is tagged for project '{OTHER_PROJECT}'"):
            tag_project_roles.lambda_handler(event("Create", ["etl", "admin"]), lambda_context)

        assert iam.tagged == []

    def test_removes_this_requests_tags_when_a_later_role_fails(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None, "admin": None})
        iam.fail_tag_for.add("admin")

        with pytest.raises(RuntimeError, match="AccessDenied on admin"):
            tag_project_roles.lambda_handler(event("Create", ["etl", "admin"]), lambda_context)

        assert iam.untagged == ["etl"]
        assert iam.project_tags == {"etl": None, "admin": None}

    def test_reports_the_tagging_failure_when_removing_this_requests_tags_also_fails(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None, "admin": None})
        iam.fail_tag_for.add("admin")
        iam.fail_untag_for.add("etl")

        with pytest.raises(RuntimeError, match="AccessDenied on admin"):
            tag_project_roles.lambda_handler(event("Create", ["etl", "admin"]), lambda_context)

        assert iam.project_tags == {"etl": PROJECT, "admin": None}

    def test_fails_on_a_role_that_does_not_exist(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None})

        with pytest.raises(iam.exceptions.NoSuchEntityException):
            tag_project_roles.lambda_handler(event("Create", ["etl", "missing"]), lambda_context)

        assert iam.project_tags == {"etl": None}

    def test_rejects_a_service_managed_project_role_without_tagging_anything(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None, "datazone_usr_role_prj_this_env1": PROJECT})

        with pytest.raises(ValueError, match="Cannot authorize roles datazone_usr_role_prj_this_env1"):
            tag_project_roles.lambda_handler(
                event("Create", ["etl", "datazone_usr_role_prj_this_env1"]), lambda_context
            )

        assert iam.tagged == []


class TestUpdate:
    def test_tags_added_roles_and_untags_removed_roles_held_by_this_project(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT, "admin": PROJECT, "engineer": None})

        response = tag_project_roles.lambda_handler(update_event(["etl", "engineer"], ["etl", "admin"]), lambda_context)

        assert response == {"PhysicalResourceId": f"{PROJECT}-role-tags"}
        assert iam.project_tags == {"etl": PROJECT, "admin": None, "engineer": PROJECT}

    def test_leaves_a_removed_role_retagged_for_another_project(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT, "admin": OTHER_PROJECT})

        tag_project_roles.lambda_handler(update_event(["etl"], ["etl", "admin"]), lambda_context)

        assert iam.untagged == []
        assert iam.project_tags["admin"] == OTHER_PROJECT

    def test_retags_roles_carrying_the_previous_project_id(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PREVIOUS_PROJECT})

        response = tag_project_roles.lambda_handler(
            update_event(["etl"], ["etl"], old_project_id=PREVIOUS_PROJECT), lambda_context
        )

        assert response == {"PhysicalResourceId": f"{PREVIOUS_PROJECT}-role-tags"}
        assert iam.project_tags == {"etl": PROJECT}

    def test_warns_about_a_removed_role_still_holding_the_replaced_projects_id(self, fake_iam, lambda_context, caplog):
        iam = fake_iam({"etl": PREVIOUS_PROJECT, "admin": PREVIOUS_PROJECT})

        tag_project_roles.lambda_handler(
            update_event(["etl"], ["etl", "admin"], old_project_id=PREVIOUS_PROJECT), lambda_context
        )

        assert iam.untagged == []
        assert iam.project_tags == {"etl": PROJECT, "admin": PREVIOUS_PROJECT}
        assert f"Role admin still holds {KEY}={PREVIOUS_PROJECT} from the project this one replaced" in caplog.text

    def test_fails_on_a_role_tagged_for_a_third_project(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT, "admin": OTHER_PROJECT})

        with pytest.raises(ValueError, match=f"role 'admin' is tagged for project '{OTHER_PROJECT}'"):
            tag_project_roles.lambda_handler(update_event(["etl", "admin"], ["etl"]), lambda_context)

        assert iam.tagged == []

    def test_skips_a_listed_role_deleted_outside_the_stack(self, fake_iam, lambda_context, caplog):
        iam = fake_iam({"etl": PROJECT, "engineer": None})

        tag_project_roles.lambda_handler(
            update_event(["etl", "deleted-role", "engineer"], ["etl", "deleted-role"]), lambda_context
        )

        assert iam.project_tags == {"etl": PROJECT, "engineer": PROJECT}
        assert "Role deleted-role does not exist, so it is not tagged" in caplog.text

    def test_rejects_adding_a_service_managed_project_role(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT, "datazone_usr_role_prj_this_env1": PROJECT})

        with pytest.raises(ValueError, match="Cannot authorize roles datazone_usr_role_prj_this_env1"):
            tag_project_roles.lambda_handler(
                update_event(["etl", "datazone_usr_role_prj_this_env1"], ["etl"]), lambda_context
            )

        assert iam.untagged == []


class TestRollback:
    """CloudFormation rolls an Update back with a second Update whose properties are swapped."""

    def test_succeeds_when_the_rollback_relists_a_role_deleted_since(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT})

        tag_project_roles.lambda_handler(update_event(["etl", "deleted-role"], ["etl"]), lambda_context)

        assert iam.project_tags == {"etl": PROJECT}

    def test_retags_kept_roles_and_untags_the_role_the_failed_update_added(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT, "engineer": PROJECT})

        tag_project_roles.lambda_handler(update_event(["etl"], ["etl", "engineer"]), lambda_context)

        assert iam.project_tags == {"etl": PROJECT, "engineer": None}

    def test_leaves_the_replacement_projects_id_on_a_role_the_failed_update_added(
        self, fake_iam, lambda_context, caplog
    ):
        # The failed update replaced PREVIOUS_PROJECT with PROJECT and added engineer.
        iam = fake_iam({"etl": PROJECT, "engineer": PROJECT})
        rollback = update_event(
            ["etl"],
            ["etl", "engineer"],
            old_project_id=PROJECT,
            project_id=PREVIOUS_PROJECT,
            physical_project_id=PREVIOUS_PROJECT,
        )

        tag_project_roles.lambda_handler(rollback, lambda_context)

        assert iam.project_tags == {"etl": PREVIOUS_PROJECT, "engineer": PROJECT}
        assert f"Role engineer still holds {KEY}={PROJECT} from the project this one replaced" in caplog.text


def delete_event(role_names, physical_resource_id=f"{PROJECT}-role-tags"):
    return event("Delete", role_names, PhysicalResourceId=physical_resource_id)


class TestDelete:
    def test_untags_only_roles_still_holding_this_project_id(self, fake_iam, lambda_context, caplog):
        iam = fake_iam({"etl": PROJECT, "admin": OTHER_PROJECT, "engineer": None})

        response = tag_project_roles.lambda_handler(
            delete_event(["deleted-role", "etl", "admin", "engineer"]), lambda_context
        )

        assert response == {"PhysicalResourceId": f"{PROJECT}-role-tags"}
        assert iam.untagged == ["etl"]
        assert iam.project_tags == {"etl": None, "admin": OTHER_PROJECT, "engineer": None}
        assert "never returned" not in caplog.text

    def test_tries_every_role_then_fails_naming_those_still_tagged(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": PROJECT, "admin": PROJECT})
        iam.fail_untag_for.add("etl")

        with pytest.raises(RuntimeError, match=f"Could not remove {KEY}={PROJECT} from roles etl\\."):
            tag_project_roles.lambda_handler(delete_event(["etl", "admin"]), lambda_context)

        assert iam.project_tags == {"etl": PROJECT, "admin": None}

    def test_warns_on_a_delete_for_a_create_it_never_answered(self, fake_iam, lambda_context, caplog):
        iam = fake_iam({"etl": PROJECT})

        tag_project_roles.lambda_handler(delete_event(["etl"], "test-stack-tagger-ABC123"), lambda_context)

        assert iam.project_tags == {"etl": None}
        assert "Delete for physical ID test-stack-tagger-ABC123, which this handler never returned" in caplog.text
        assert f"may tag roles etl after this Delete; check them for {KEY}={PROJECT}" in caplog.text


class TestTransientRetry:
    def test_retries_access_denied_until_the_policy_change_propagates(self, fake_iam, lambda_context, sleeps):
        iam = fake_iam({"etl": None})
        iam.transient_errors = {"ListRoleTags": ["AccessDenied"], "TagRole": ["AccessDenied", "AccessDenied"]}

        tag_project_roles.lambda_handler(event("Create", ["etl"]), lambda_context)

        assert iam.project_tags == {"etl": PROJECT}
        assert [c.args[0] for c in sleeps.call_args_list] == [1, 1, 2]

    def test_retries_concurrent_modification(self, fake_iam, lambda_context, sleeps):
        iam = fake_iam({"etl": PROJECT})
        iam.transient_errors = {"UntagRole": ["ConcurrentModification"]}

        tag_project_roles.lambda_handler(delete_event(["etl"]), lambda_context)

        assert iam.project_tags == {"etl": None}
        assert [c.args[0] for c in sleeps.call_args_list] == [1]

    def test_raises_access_denied_that_outlasts_the_retries(self, fake_iam, lambda_context, sleeps):
        iam = fake_iam({"etl": None})
        iam.transient_errors = {"ListRoleTags": ["AccessDenied"] * (len(tag_project_roles.TRANSIENT_RETRY_DELAYS) + 1)}

        with pytest.raises(ClientError, match="AccessDenied"):
            tag_project_roles.lambda_handler(event("Create", ["etl"]), lambda_context)

        assert [c.args[0] for c in sleeps.call_args_list] == list(tag_project_roles.TRANSIENT_RETRY_DELAYS)

    def test_does_not_retry_other_errors(self, sleeps):
        def throttled(**_):
            raise ClientError({"Error": {"Code": "Throttling", "Message": "slow down"}}, "TagRole")

        with pytest.raises(ClientError, match="Throttling"):
            tag_project_roles.call_iam(throttled)

        sleeps.assert_not_called()


class TestTagList:
    def test_fails_rather_than_read_a_partial_tag_list(self, fake_iam, lambda_context):
        iam = fake_iam({"etl": None})
        iam.truncated = True

        with pytest.raises(RuntimeError, match="ListRoleTags returned a partial tag list for role etl"):
            tag_project_roles.lambda_handler(event("Create", ["etl"]), lambda_context)

        assert iam.tagged == []


class TestEventValidation:
    def test_missing_project_id_raises(self, fake_iam, lambda_context):
        fake_iam({})
        bad = {"RequestType": "Create", "ResourceProperties": {"roleArns": []}}

        with pytest.raises(ValueError, match="Unable to parse projectId from event."):
            tag_project_roles.lambda_handler(bad, lambda_context)

    def test_unsupported_request_type_raises(self, fake_iam, lambda_context):
        fake_iam({})

        with pytest.raises(ValueError, match="Unsupported RequestType: Bogus"):
            tag_project_roles.lambda_handler(event("Bogus", []), lambda_context)
