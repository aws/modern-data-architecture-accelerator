"""Tests for HealthLake Datastore Replacement Guard custom resource handler.

The Create path is exercised against a real boto3 HealthLake client wrapped in
botocore.stub.Stubber rather than a bare MagicMock. Stubber validates operation
names and parameter shapes against the service model, so a call the real SDK would
reject (e.g. get_paginator on an unpageable operation, or a mistyped parameter)
fails the test instead of silently passing — which is what let earlier deploy-
breaking bugs ship green.

identityProviderConfiguration fixtures use the compact JSON that the TypeScript
side (JSON.stringify) actually emits — no space after ':' or ',' — so the tests
match what CloudFormation delivers in production.
"""
import boto3
import pytest
from botocore.exceptions import ClientError
from botocore.stub import Stubber

import datastore_replacement_guard as guard


BASE_PROPS = {
    'datastoreName': 'test-org-dev-hda-primary',
    'kmsKeyArn': 'arn:aws:kms:us-east-1:123456789012:key/old-key',
    'preloadSynthea': 'false',
}


@pytest.fixture
def healthlake_stub():
    """Yield a (client, stubber) pair and route the handler through the stubbed
    client. Resets the module-level client cache before and after so tests don't
    leak a stubbed client into one another."""
    guard._healthlake_client = None
    client = boto3.client(
        'healthlake',
        region_name='us-east-1',
        aws_access_key_id='testing',
        aws_secret_access_key='testing',
    )
    stubber = Stubber(client)
    guard._healthlake_client = client
    stubber.activate()
    try:
        yield client, stubber
        stubber.assert_no_pending_responses()
    finally:
        stubber.deactivate()
        guard._healthlake_client = None


def _list_response(datastores, next_token=None):
    """Build a ListFHIRDatastores response payload."""
    response = {'DatastorePropertiesList': datastores}
    if next_token is not None:
        response['NextToken'] = next_token
    return response


def _add_list_response(stubber, datastores, next_token=None, expected_next_token=None):
    """Queue a ListFHIRDatastores response, asserting the expected request params."""
    expected_params = {'Filter': {'DatastoreName': BASE_PROPS['datastoreName']}}
    if expected_next_token is not None:
        expected_params['NextToken'] = expected_next_token
    stubber.add_response(
        'list_fhir_datastores',
        _list_response(datastores, next_token),
        expected_params,
    )


def test_create_with_no_existing_datastore_succeeds(healthlake_stub):
    """Create where no live datastore with this name exists succeeds without diffing."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [])

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': BASE_PROPS}, None
    )

    assert result['Status'] == '200'


def test_create_filters_by_datastore_name(healthlake_stub):
    """Create looks up datastores filtered by the configured datastoreName.

    Stubber's expected_params on the queued response enforces the Filter shape; a
    call that omitted or mistyped it would raise StubAssertionError here."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [])

    guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': BASE_PROPS}, None
    )


def test_create_with_matching_existing_datastore_succeeds(healthlake_stub):
    """Create where a live datastore exists with identical config succeeds."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
    }])

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': BASE_PROPS}, None
    )

    assert result['Status'] == '200'


@pytest.mark.parametrize('status', ['DELETED', 'CREATE_FAILED'])
def test_create_ignores_non_live_datastore_of_same_name(healthlake_stub, status):
    """Create ignores DELETED/CREATE_FAILED datastores when checking for a live conflict."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-old',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-old',
        'DatastoreStatus': status,
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-old/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/different-key'},
        },
    }])

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': BASE_PROPS}, None
    )

    assert result['Status'] == '200'


def test_create_ignores_prefix_name_collision(healthlake_stub):
    """Create must diff against the exact-name datastore, not a prefix match. The API
    Filter.DatastoreName is not documented as an exact match, so a datastore whose name
    merely starts with the configured name must be skipped client-side."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        # Same prefix, different datastore, different (would-be-blocking) key.
        'DatastoreName': BASE_PROPS['datastoreName'] + '-v2',
        'DatastoreId': 'ds-v2',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-v2',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-v2/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/different-key'},
        },
    }])

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': BASE_PROPS}, None
    )

    assert result['Status'] == '200'


def test_create_traverses_next_token_pages(healthlake_stub):
    """Create pages through NextToken; the matching datastore on the second page is found."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [], next_token='page-2')
    _add_list_response(
        stubber,
        [{
            'DatastoreName': BASE_PROPS['datastoreName'],
            'DatastoreId': 'ds-1',
            'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
            'DatastoreStatus': 'ACTIVE',
            'DatastoreTypeVersion': 'R4',
            'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
            'SseConfiguration': {
                'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/new-key'},
            },
        }],
        expected_next_token='page-2',
    )

    new_props = dict(BASE_PROPS)  # kmsKeyArn differs from the live 'new-key'
    with pytest.raises(RuntimeError, match='kmsKeyArn'):
        guard.lambda_handler(
            {'RequestType': 'Create', 'ResourceProperties': new_props}, None
        )


def test_create_blocks_when_existing_datastore_config_differs(healthlake_stub):
    """Create raises when a live pre-existing datastore's config differs from the
    incoming config - the case where the guard is newly introduced to a stack whose
    datastore already exists and a guarded field changed in the same deploy."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
    }])

    new_props = dict(BASE_PROPS)
    new_props['preloadSynthea'] = 'true'

    with pytest.raises(RuntimeError, match='preloadSynthea'):
        guard.lambda_handler(
            {'RequestType': 'Create', 'ResourceProperties': new_props}, None
        )


def test_create_blocks_when_kms_key_differs(healthlake_stub):
    """Create raises when the live datastore's kmsKeyArn differs - the data-loss case."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': 'arn:aws:kms:us-east-1:123456789012:key/live-key'},
        },
    }])

    new_props = dict(BASE_PROPS)
    new_props['kmsKeyArn'] = 'arn:aws:kms:us-east-1:123456789012:key/config-key'

    with pytest.raises(RuntimeError, match='kmsKeyArn'):
        guard.lambda_handler(
            {'RequestType': 'Create', 'ResourceProperties': new_props}, None
        )


def test_create_allows_config_diff_with_acknowledgement(healthlake_stub):
    """Create with a pre-existing datastore whose config differs succeeds when
    acknowledgeReplacement=true."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
    }])

    new_props = dict(BASE_PROPS)
    new_props['preloadSynthea'] = 'true'
    new_props['acknowledgeReplacement'] = 'true'

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': new_props}, None
    )

    assert result['Status'] == '200'


def test_create_compares_identity_provider_configuration(healthlake_stub):
    """Create diffs identityProviderConfiguration re-keyed from the API's PascalCase
    response against the incoming camelCase-serialized config. The config value uses the
    compact JSON that JSON.stringify (TS side) emits."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
        'IdentityProviderConfiguration': {'AuthorizationStrategy': 'AWS_AUTH'},
    }])

    new_props = dict(BASE_PROPS)
    new_props['identityProviderConfiguration'] = '{"authorizationStrategy":"AWS_AUTH"}'

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': new_props}, None
    )

    assert result['Status'] == '200'


def test_create_allows_multi_key_identity_provider_configuration(healthlake_stub):
    """A multi-key IdP config that is unchanged must not register as a replacement.

    Single-key configs only exercise the ':' separator; a real SMART-on-FHIR config
    (SMART_ON_FHIR + fineGrainedAuthorizationEnabled) also exercises the ',' separator,
    which is where the Python-vs-TS serializer whitespace mismatch used to bite."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
        'IdentityProviderConfiguration': {
            'AuthorizationStrategy': 'SMART_ON_FHIR',
            'FineGrainedAuthorizationEnabled': True,
        },
    }])

    new_props = dict(BASE_PROPS)
    new_props['identityProviderConfiguration'] = (
        '{"authorizationStrategy":"SMART_ON_FHIR","fineGrainedAuthorizationEnabled":true}'
    )

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': new_props}, None
    )

    assert result['Status'] == '200'


def test_create_allows_absent_fine_grained_when_api_returns_false(healthlake_stub):
    """The API returns FineGrainedAuthorizationEnabled=false; JSON.stringify (TS) omits
    the key entirely when unset. Absent-vs-false must compare equal, not as a change."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
        'IdentityProviderConfiguration': {
            'AuthorizationStrategy': 'SMART_ON_FHIR',
            'FineGrainedAuthorizationEnabled': False,
        },
    }])

    new_props = dict(BASE_PROPS)
    # TS omits fineGrainedAuthorizationEnabled when it is unset.
    new_props['identityProviderConfiguration'] = '{"authorizationStrategy":"SMART_ON_FHIR"}'

    result = guard.lambda_handler(
        {'RequestType': 'Create', 'ResourceProperties': new_props}, None
    )

    assert result['Status'] == '200'


def test_create_blocks_when_identity_provider_configuration_differs(healthlake_stub):
    """Create raises when identityProviderConfiguration differs from the existing datastore."""
    _, stubber = healthlake_stub
    _add_list_response(stubber, [{
        'DatastoreName': BASE_PROPS['datastoreName'],
        'DatastoreId': 'ds-1',
        'DatastoreArn': 'arn:aws:healthlake:us-east-1:123456789012:datastore/fhir/ds-1',
        'DatastoreStatus': 'ACTIVE',
        'DatastoreTypeVersion': 'R4',
        'DatastoreEndpoint': 'https://healthlake.us-east-1.amazonaws.com/datastore/ds-1/r4/',
        'SseConfiguration': {
            'KmsEncryptionConfig': {'CmkType': 'CUSTOMER_MANAGED_KMS_KEY', 'KmsKeyId': BASE_PROPS['kmsKeyArn']},
        },
        'IdentityProviderConfiguration': {'AuthorizationStrategy': 'AWS_AUTH'},
    }])

    new_props = dict(BASE_PROPS)
    new_props['identityProviderConfiguration'] = '{"authorizationStrategy":"SMART_ON_FHIR"}'

    with pytest.raises(RuntimeError, match='identityProviderConfiguration'):
        guard.lambda_handler(
            {'RequestType': 'Create', 'ResourceProperties': new_props}, None
        )


def test_create_propagates_client_error_and_fails_closed(healthlake_stub):
    """An API error (e.g. AccessDenied) must propagate so the deployment fails closed,
    never silently treating the lookup as 'no pre-existing datastore'."""
    _, stubber = healthlake_stub
    stubber.add_client_error(
        'list_fhir_datastores',
        service_error_code='AccessDeniedException',
        service_message='not authorized to perform healthlake:ListFHIRDatastores',
    )

    with pytest.raises(ClientError):
        guard.lambda_handler(
            {'RequestType': 'Create', 'ResourceProperties': BASE_PROPS}, None
        )


def test_delete_always_succeeds():
    """Delete is a no-op and always succeeds."""
    result = guard.lambda_handler(
        {'RequestType': 'Delete', 'ResourceProperties': BASE_PROPS}, None
    )

    assert result['Status'] == '200'


def test_update_with_no_changes_succeeds():
    """Update where nothing guarded changed succeeds."""
    event = {
        'RequestType': 'Update',
        'OldResourceProperties': BASE_PROPS,
        'ResourceProperties': dict(BASE_PROPS),
    }

    result = guard.lambda_handler(event, None)

    assert result['Status'] == '200'


def test_update_with_unrelated_field_change_succeeds():
    """Update where only a non-guarded field changed succeeds."""
    old_props = dict(BASE_PROPS)
    new_props = dict(BASE_PROPS)
    new_props['ServiceToken'] = 'arn:aws:lambda:us-east-1:123456789012:function:new-token'

    event = {
        'RequestType': 'Update',
        'OldResourceProperties': old_props,
        'ResourceProperties': new_props,
    }

    result = guard.lambda_handler(event, None)

    assert result['Status'] == '200'


def test_update_with_equivalent_idp_serialization_succeeds():
    """Update must not flag an identityProviderConfiguration change when the two payloads
    are semantically identical but differ only in key order or absent-vs-false booleans."""
    old_props = dict(BASE_PROPS)
    old_props['identityProviderConfiguration'] = (
        '{"authorizationStrategy":"SMART_ON_FHIR","fineGrainedAuthorizationEnabled":false}'
    )
    new_props = dict(BASE_PROPS)
    # Reordered keys, and fineGrained omitted (defaults to false).
    new_props['identityProviderConfiguration'] = '{"authorizationStrategy":"SMART_ON_FHIR"}'

    event = {
        'RequestType': 'Update',
        'OldResourceProperties': old_props,
        'ResourceProperties': new_props,
    }

    result = guard.lambda_handler(event, None)

    assert result['Status'] == '200'


@pytest.mark.parametrize('field,old_value,new_value', [
    ('datastoreName', 'test-org-dev-hda-primary', 'test-org-dev-hda-primary-v2'),
    ('kmsKeyArn', 'arn:aws:kms:us-east-1:123456789012:key/old-key', 'arn:aws:kms:us-east-1:123456789012:key/new-key'),
    ('preloadSynthea', 'false', 'true'),
    ('identityProviderConfiguration', None, '{"authorizationStrategy":"AWS_AUTH"}'),
])
def test_update_blocks_guarded_field_change(field, old_value, new_value):
    """Update where a guarded field changed raises without acknowledgeReplacement."""
    old_props = dict(BASE_PROPS)
    new_props = dict(BASE_PROPS)
    if old_value is not None:
        old_props[field] = old_value
    new_props[field] = new_value

    event = {
        'RequestType': 'Update',
        'OldResourceProperties': old_props,
        'ResourceProperties': new_props,
    }

    with pytest.raises(RuntimeError, match=field):
        guard.lambda_handler(event, None)


def test_update_allows_guarded_change_with_acknowledgement():
    """Update where a guarded field changed succeeds when acknowledgeReplacement=true."""
    old_props = dict(BASE_PROPS)
    new_props = dict(BASE_PROPS)
    new_props['preloadSynthea'] = 'true'
    new_props['acknowledgeReplacement'] = 'true'

    event = {
        'RequestType': 'Update',
        'OldResourceProperties': old_props,
        'ResourceProperties': new_props,
    }

    result = guard.lambda_handler(event, None)

    assert result['Status'] == '200'
    assert 'preloadSynthea' in result['Data']['AcknowledgedChangedFields']


def test_update_blocks_multiple_guarded_changes_reports_all():
    """Update where multiple guarded fields changed reports all of them in the error."""
    old_props = dict(BASE_PROPS)
    new_props = dict(BASE_PROPS)
    new_props['kmsKeyArn'] = 'arn:aws:kms:us-east-1:123456789012:key/new-key'
    new_props['preloadSynthea'] = 'true'

    event = {
        'RequestType': 'Update',
        'OldResourceProperties': old_props,
        'ResourceProperties': new_props,
    }

    with pytest.raises(RuntimeError) as exc_info:
        guard.lambda_handler(event, None)

    assert 'kmsKeyArn' in str(exc_info.value)
    assert 'preloadSynthea' in str(exc_info.value)


def test_update_with_missing_old_properties_treats_as_first_update():
    """Update with no OldResourceProperties compares against an empty dict."""
    event = {
        'RequestType': 'Update',
        'ResourceProperties': BASE_PROPS,
    }

    with pytest.raises(RuntimeError, match='datastoreName'):
        guard.lambda_handler(event, None)


def test_unexpected_request_type_raises():
    """Unexpected RequestType raises ValueError."""
    event = {
        'RequestType': 'Invalid',
        'ResourceProperties': BASE_PROPS,
    }

    with pytest.raises(ValueError, match='Unexpected RequestType: Invalid'):
        guard.lambda_handler(event, None)


def test_acknowledge_replacement_is_case_insensitive():
    """acknowledgeReplacement is compared case-insensitively."""
    old_props = dict(BASE_PROPS)
    new_props = dict(BASE_PROPS)
    new_props['preloadSynthea'] = 'true'
    new_props['acknowledgeReplacement'] = 'True'

    event = {
        'RequestType': 'Update',
        'OldResourceProperties': old_props,
        'ResourceProperties': new_props,
    }

    result = guard.lambda_handler(event, None)

    assert result['Status'] == '200'
