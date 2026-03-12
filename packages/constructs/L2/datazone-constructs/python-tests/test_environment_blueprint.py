"""
Unit tests for environment_blueprint Lambda function.
"""
import pytest
from unittest.mock import patch, MagicMock

# Import with alias since module is named 'lambda' (reserved word)
import importlib
env_blueprint = importlib.import_module('lambda')


class TestHelperFunctions:
    """Test cases for helper functions."""

    def test_convert_dict_string_booleans_simple(self):
        """Test convert_dict_string_booleans with simple dict."""
        input_dict = {'enabled': 'true', 'disabled': 'false', 'name': 'test'}
        result = env_blueprint.convert_dict_string_booleans(input_dict)
        assert result == {'enabled': True, 'disabled': False, 'name': 'test'}

    def test_convert_dict_string_booleans_nested(self):
        """Test convert_dict_string_booleans with nested dict."""
        input_dict = {'outer': {'inner': 'true'}}
        result = env_blueprint.convert_dict_string_booleans(input_dict)
        assert result == {'outer': {'inner': True}}

    def test_convert_dict_string_booleans_list(self):
        """Test convert_dict_string_booleans with list values."""
        input_dict = {'items': ['true', 'false', 'other']}
        result = env_blueprint.convert_dict_string_booleans(input_dict)
        assert result == {'items': [True, False, 'other']}

    def test_convert_dict_string_booleans_list_of_dicts(self):
        """Test convert_dict_string_booleans with list of dicts."""
        input_dict = {'items': [{'enabled': 'true'}]}
        result = env_blueprint.convert_dict_string_booleans(input_dict)
        assert result == {'items': [{'enabled': True}]}

    def test_get_s3_bucket_obj_from_url_valid(self):
        """Test get_s3_bucket_obj_from_url with valid URL."""
        url = 'https://s3.amazonaws.com/my-bucket/my-key'
        bucket, key = env_blueprint.get_s3_bucket_obj_from_url(url)
        assert bucket == 'my-bucket'
        assert key == 'my-key'

    def test_get_s3_bucket_obj_from_url_empty_path(self):
        """Test get_s3_bucket_obj_from_url with empty path raises IndexError."""
        url = 'https://s3.amazonaws.com/'
        # Source tries to access path_segments[1] which doesn't exist for empty path
        with pytest.raises(IndexError):
            env_blueprint.get_s3_bucket_obj_from_url(url)


class TestLambdaHandler:
    """Test cases for lambda_handler."""

    @pytest.fixture
    def base_resource_config(self):
        """Base resource configuration for tests."""
        return {
            'domain_id': 'dzd_test123',
            'blueprint_name': 'TestBlueprint',
            'template_source_url': 'https://s3.amazonaws.com/source-bucket/template.yaml',
            'template_bucket': 'dest-bucket',
            'template_key': 'blueprints/template.yaml',
            'template_bucket_region_domain_name': 's3.us-east-1.amazonaws.com/dest-bucket',
            'enabled_regions': ['us-east-1'],
            'provisioning_role_arn': 'arn:aws:iam::123456789012:role/ProvisioningRole',
            'user_parameters': [{'key': 'param1', 'value': 'true'}]
        }

    @pytest.fixture
    def create_event(self, base_resource_config):
        """CloudFormation Create event."""
        return {
            'RequestType': 'Create',
            'ResourceProperties': base_resource_config
        }

    @pytest.fixture
    def update_event(self, base_resource_config):
        """CloudFormation Update event."""
        return {
            'RequestType': 'Update',
            'PhysicalResourceId': 'bp-existing123',
            'ResourceProperties': base_resource_config
        }

    @pytest.fixture
    def delete_event(self):
        """CloudFormation Delete event."""
        return {
            'RequestType': 'Delete',
            'PhysicalResourceId': 'bp-existing123',
            'ResourceProperties': {'domain_id': 'dzd_test123'}
        }

    @patch.object(env_blueprint, 'time')
    @patch.object(env_blueprint, 's3_client')
    @patch.object(env_blueprint, 'datazone_client')
    def test_create_success(
        self, mock_dz, mock_s3, mock_time, create_event, lambda_context
    ):
        """Test successful Create request."""
        mock_time.sleep.return_value = None
        mock_s3.copy_object.return_value = {}
        mock_dz.create_environment_blueprint.return_value = {'id': 'bp-new123'}

        response = env_blueprint.lambda_handler(create_event, lambda_context)

        assert response['Status'] == 'SUCCESS'
        assert response['PhysicalResourceId'] == 'bp-new123'
        assert response['Data']['BlueprintId'] == 'bp-new123'
        mock_dz.create_environment_blueprint.assert_called_once()

    @patch.object(env_blueprint, 'time')
    @patch.object(env_blueprint, 's3_client')
    @patch.object(env_blueprint, 'datazone_client')
    def test_create_without_user_parameters(
        self, mock_dz, mock_s3, mock_time, create_event, lambda_context
    ):
        """Test Create without user_parameters."""
        mock_time.sleep.return_value = None
        mock_s3.copy_object.return_value = {}
        mock_dz.create_environment_blueprint.return_value = {'id': 'bp-new123'}
        del create_event['ResourceProperties']['user_parameters']

        response = env_blueprint.lambda_handler(create_event, lambda_context)

        assert response['Status'] == 'SUCCESS'
        call_kwargs = mock_dz.create_environment_blueprint.call_args[1]
        assert 'userParameters' not in call_kwargs

    @patch.object(env_blueprint, 'time')
    @patch.object(env_blueprint, 's3_client')
    @patch.object(env_blueprint, 'datazone_client')
    def test_update_success(
        self, mock_dz, mock_s3, mock_time, update_event, lambda_context
    ):
        """Test successful Update request."""
        mock_time.sleep.return_value = None
        mock_s3.copy_object.return_value = {}
        mock_dz.update_environment_blueprint.return_value = {}
        mock_dz.put_environment_blueprint_configuration.return_value = {}

        response = env_blueprint.lambda_handler(update_event, lambda_context)

        assert response['Status'] == 'SUCCESS'
        assert response['PhysicalResourceId'] == 'bp-existing123'
        mock_dz.update_environment_blueprint.assert_called_once()

    @patch.object(env_blueprint, 'time')
    @patch.object(env_blueprint, 'datazone_client')
    def test_delete_success(
        self, mock_dz, mock_time, delete_event, lambda_context
    ):
        """Test successful Delete request."""
        mock_time.sleep.return_value = None
        mock_dz.delete_environment_blueprint.return_value = {}

        response = env_blueprint.lambda_handler(delete_event, lambda_context)

        assert response['Status'] == 'SUCCESS'
        mock_dz.delete_environment_blueprint.assert_called_once_with(
            domainIdentifier='dzd_test123',
            identifier='bp-existing123'
        )

    @patch.object(env_blueprint, 'time')
    def test_missing_domain_id(self, mock_time, lambda_context):
        """Test error when domain_id is missing."""
        mock_time.sleep.return_value = None
        event = {'RequestType': 'Create', 'ResourceProperties': {}}

        with pytest.raises(Exception) as exc_info:
            env_blueprint.lambda_handler(event, lambda_context)

        assert "Unable to parse domain_id" in str(exc_info.value)

    @patch.object(env_blueprint, 'time')
    def test_delete_missing_physical_resource_id(self, mock_time, lambda_context):
        """Test Delete error when PhysicalResourceId is missing."""
        mock_time.sleep.return_value = None
        event = {
            'RequestType': 'Delete',
            'ResourceProperties': {'domain_id': 'dzd_test123'}
        }

        with pytest.raises(Exception) as exc_info:
            env_blueprint.lambda_handler(event, lambda_context)

        assert "Unable to parse identifier" in str(exc_info.value)


class TestCopyTemplate:
    """Test cases for copy_template function."""

    @patch.object(env_blueprint, 's3_client')
    def test_copy_template_success(self, mock_s3):
        """Test successful template copy."""
        mock_s3.copy_object.return_value = {}

        result = env_blueprint.copy_template(
            'https://s3.amazonaws.com/source-bucket/source-key',
            'dest-bucket',
            's3.us-east-1.amazonaws.com/dest-bucket',
            'dest-key'
        )

        assert result == 'https://s3.us-east-1.amazonaws.com/dest-bucket/dest-key'
        mock_s3.copy_object.assert_called_once_with(
            CopySource={'Bucket': 'source-bucket', 'Key': 'source-key'},
            Bucket='dest-bucket',
            Key='dest-key'
        )
