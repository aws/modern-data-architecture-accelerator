"""Tests for the AgentCore Runtime containment runbook scripts."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError, UnknownServiceError

import has_approvers
import record_containment
import release_gate
import resolve_role_name
import stop_sessions

TAG_KEY = 'mdaa:agentcore:contained-at'
ROLE_NAME = 'test-execution-role'
RUNTIME_ARN = 'arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test_runtime-abc123'


def _client_error(code):
    return ClientError({'Error': {'Code': code, 'Message': code}}, 'StopRuntimeSession')


def _role(tags=None, max_session_duration=3600):
    role = {'RoleName': ROLE_NAME, 'MaxSessionDuration': max_session_duration}
    if tags is not None:
        role['Tags'] = tags
    return role


def _fmt(when):
    return when.strftime(release_gate.TIMESTAMP_FORMAT)


class TestResolveRoleName:
    @pytest.mark.parametrize(
        'role_arn, expected',
        [
            ('arn:aws:iam::123456789012:role/agent-role', 'agent-role'),
            ('arn:aws:iam::123456789012:role/service/team/agent-role', 'agent-role'),
            ('arn:aws-us-gov:iam::123456789012:role/agent-role', 'agent-role'),
        ],
    )
    def test_returns_last_path_segment(self, role_arn, expected):
        assert resolve_role_name.handler({'RoleArn': role_arn}, None) == {'RoleName': expected}

    @pytest.mark.parametrize(
        'role_arn',
        [
            '',
            '{{resolve:ssm:/path/to/role-arn}}',
            'arn:aws:iam::123456789012:user/someone',
            'arn:aws:s3:::bucket/role/agent-role',
            'agent-role',
        ],
    )
    def test_rejects_anything_but_a_role_arn(self, role_arn):
        with pytest.raises(ValueError, match='is not an IAM role ARN'):
            resolve_role_name.handler({'RoleArn': role_arn}, None)

    def test_rejects_missing_arn(self):
        with pytest.raises(ValueError, match='is not an IAM role ARN'):
            resolve_role_name.handler({}, None)


class TestHasApprovers:
    def test_false_when_approvers_empty(self):
        assert has_approvers.handler({'Approvers': []}, None) == {'HasApprovers': False}

    def test_false_when_approvers_missing(self):
        assert has_approvers.handler({}, None) == {'HasApprovers': False}

    def test_false_when_approvers_are_blank_strings(self):
        assert has_approvers.handler({'Approvers': ['', '  ']}, None) == {'HasApprovers': False}

    def test_true_when_an_approver_is_named(self):
        event = {'Approvers': ['arn:aws:iam::123456789012:role/SecurityLead']}
        assert has_approvers.handler(event, None) == {'HasApprovers': True}


class TestRecordContainment:
    def test_tags_role_with_utc_containment_time(self):
        iam = MagicMock()
        with patch('record_containment.boto3.client', return_value=iam) as client:
            result = record_containment.handler({'RoleName': ROLE_NAME, 'TagKey': TAG_KEY}, None)

        client.assert_called_once_with('iam')
        contained_at = result['ContainedAt']
        iam.tag_role.assert_called_once_with(RoleName=ROLE_NAME, Tags=[{'Key': TAG_KEY, 'Value': contained_at}])
        parsed = datetime.strptime(contained_at, record_containment.TIMESTAMP_FORMAT).replace(tzinfo=timezone.utc)
        assert abs(datetime.now(timezone.utc) - parsed) < timedelta(minutes=1)

    def test_timestamp_format_matches_release_gate(self):
        # The release gate parses the tag this step writes; the formats must agree.
        assert record_containment.TIMESTAMP_FORMAT == release_gate.TIMESTAMP_FORMAT


class TestStopSessions:
    # Not 'DEFAULT', which is also the API's default, so a script ignoring the input would fail.
    QUALIFIER = 'support_endpoint'

    def _event(self, session_ids):
        return {'SessionIds': session_ids, 'RuntimeArn': RUNTIME_ARN, 'Qualifier': self.QUALIFIER}

    def test_no_sessions_makes_no_calls(self):
        with patch('stop_sessions.boto3.client') as client:
            assert stop_sessions.handler(self._event([]), None) == {'Stopped': []}
        client.assert_not_called()

    def test_blank_session_ids_are_ignored(self):
        with patch('stop_sessions.boto3.client') as client:
            assert stop_sessions.handler(self._event(['', ' ']), None) == {'Stopped': []}
        client.assert_not_called()

    def test_stops_each_session_with_runtime_and_qualifier(self):
        agentcore = MagicMock()
        with patch('stop_sessions.boto3.client', return_value=agentcore) as client:
            result = stop_sessions.handler(self._event([' session-1', 'session-2']), None)

        client.assert_called_once_with('bedrock-agentcore')
        assert result == {'Stopped': ['session-1', 'session-2']}
        agentcore.stop_runtime_session.assert_any_call(
            agentRuntimeArn=RUNTIME_ARN, runtimeSessionId='session-1', qualifier=self.QUALIFIER
        )
        agentcore.stop_runtime_session.assert_any_call(
            agentRuntimeArn=RUNTIME_ARN, runtimeSessionId='session-2', qualifier=self.QUALIFIER
        )

    def test_attempts_every_session_and_names_the_failures(self):
        agentcore = MagicMock()
        agentcore.stop_runtime_session.side_effect = [_client_error('AccessDeniedException'), None]
        with patch('stop_sessions.boto3.client', return_value=agentcore):
            with pytest.raises(RuntimeError) as excinfo:
                stop_sessions.handler(self._event(['session-1', 'session-2']), None)

        assert agentcore.stop_runtime_session.call_count == 2
        message = str(excinfo.value)
        assert 'containment policy is attached' in message
        assert 'Stopped 1 of 2' in message
        assert 'session-1 (AccessDeniedException)' in message
        assert 'session-2' not in message.split('not stopped:')[1]

    def test_connection_failure_is_reported_per_session(self):
        agentcore = MagicMock()
        agentcore.stop_runtime_session.side_effect = EndpointConnectionError(endpoint_url='https://example')
        with patch('stop_sessions.boto3.client', return_value=agentcore):
            with pytest.raises(RuntimeError) as excinfo:
                stop_sessions.handler(self._event(['session-1']), None)

        assert 'session-1 (EndpointConnectionError)' in str(excinfo.value)

    def test_sdk_without_stop_runtime_session_reports_every_session_not_stopped(self):
        agentcore = MagicMock(spec=[])
        with patch('stop_sessions.boto3.client', return_value=agentcore):
            with pytest.raises(RuntimeError) as excinfo:
                stop_sessions.handler(self._event(['session-1', 'session-2']), None)

        message = str(excinfo.value)
        assert 'Stopped 0 of 2' in message
        assert 'session-1 (StopRuntimeSession unsupported by SDK)' in message
        assert 'session-2 (StopRuntimeSession unsupported by SDK)' in message

    def test_sdk_without_agentcore_reports_every_session_not_stopped(self):
        error = UnknownServiceError(service_name='bedrock-agentcore', known_service_names='iam')
        with patch('stop_sessions.boto3.client', side_effect=error):
            with pytest.raises(RuntimeError) as excinfo:
                stop_sessions.handler(self._event(['session-1']), None)

        assert 'Stopped 0 of 1' in str(excinfo.value)
        assert 'session-1 (UnknownServiceError)' in str(excinfo.value)


class TestReleaseGate:
    def _event(self, force=False, max_lifetime_seconds='28800'):
        return {
            'RoleName': ROLE_NAME,
            'TagKey': TAG_KEY,
            'MaxLifetimeSeconds': max_lifetime_seconds,
            'Force': force,
        }

    def _run(self, role, force=False, max_lifetime_seconds='28800'):
        iam = MagicMock()
        iam.get_role.return_value = {'Role': role}
        with patch('release_gate.boto3.client', return_value=iam):
            return release_gate.handler(self._event(force, max_lifetime_seconds), None), iam

    def test_refuses_before_gate_and_names_the_opening_time(self):
        contained_at = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(hours=1)
        role = _role([{'Key': TAG_KEY, 'Value': _fmt(contained_at)}])

        with pytest.raises(RuntimeError) as excinfo:
            self._run(role)

        expected_open = contained_at + timedelta(seconds=28800 + 3600)
        assert f'It opens at {_fmt(expected_open)}' in str(excinfo.value)

    def test_passes_after_gate(self):
        contained_at = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(hours=10)
        role = _role([{'Key': TAG_KEY, 'Value': _fmt(contained_at)}])

        result, iam = self._run(role)

        iam.get_role.assert_called_once_with(RoleName=ROLE_NAME)
        assert result['GateStatus'] == 'passed'
        assert result['GateOpenedAt'] == _fmt(contained_at + timedelta(hours=9))

    def test_gate_includes_role_max_session_duration(self):
        contained_at = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(hours=10)
        role = _role([{'Key': TAG_KEY, 'Value': _fmt(contained_at)}], max_session_duration=4 * 3600)

        with pytest.raises(RuntimeError) as excinfo:
            self._run(role)

        assert f'It opens at {_fmt(contained_at + timedelta(hours=12))}' in str(excinfo.value)

    def test_gate_uses_the_runtime_max_lifetime_passed_in(self):
        # Not AgentCore's 28800-second default, so a script ignoring the input would fail.
        contained_at = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=30)
        role = _role([{'Key': TAG_KEY, 'Value': _fmt(contained_at)}])

        with pytest.raises(RuntimeError) as excinfo:
            self._run(role, max_lifetime_seconds=600)

        assert f'It opens at {_fmt(contained_at + timedelta(seconds=600 + 3600))}' in str(excinfo.value)

    def test_refuses_when_tag_missing(self):
        with pytest.raises(RuntimeError) as excinfo:
            self._run(_role([{'Key': 'other', 'Value': 'x'}]))
        assert f'has no {TAG_KEY} tag' in str(excinfo.value)
        assert 'Force=true' in str(excinfo.value)

    def test_refuses_when_role_has_no_tags(self):
        with pytest.raises(RuntimeError) as excinfo:
            self._run(_role())
        assert f'has no {TAG_KEY} tag' in str(excinfo.value)

    def test_refuses_when_tag_unparseable(self):
        with pytest.raises(RuntimeError) as excinfo:
            self._run(_role([{'Key': TAG_KEY, 'Value': 'not-a-time'}]))
        assert 'is not a' in str(excinfo.value)

    @pytest.mark.parametrize('force', [True, 'true', 'True'])
    def test_force_skips_gate_without_reading_role(self, force):
        result, iam = self._run(_role(), force=force)
        assert result == {'GateStatus': 'forced'}
        iam.get_role.assert_not_called()

    @pytest.mark.parametrize('force', [False, 'false', None])
    def test_force_false_values_still_check_gate(self, force):
        with pytest.raises(RuntimeError):
            self._run(_role(), force=force)
