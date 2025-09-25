"""
Unit tests for the provisioning macro Lambda function.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from provisioning_macro.provisioning_macro import lambda_handler


class TestProvisioningMacro:
    """Test cases for the provisioning macro functionality."""

    def test_lambda_handler_basic_transformation(self, sample_provisioning_event, expected_transformed_template, lambda_context):
        """Test basic template transformation with provisioned ID replacement."""
        result = lambda_handler(sample_provisioning_event, lambda_context)
        
        assert result["requestId"] == "test-request-123"
        assert result["status"] == "success"
        assert result["fragment"] == expected_transformed_template

    def test_lambda_handler_lowercase_placeholder(self, lambda_context):
        """Test transformation with lowercase __provisioned_id__ placeholder."""
        event = {
            "requestId": "test-request-456",
            "templateParameterValues": {
                "PROVISIONEDID": "my-test-id"
            },
            "fragment": {
                "Resources": {
                    "TestBucket": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "bucket-__provisioned_id__-suffix"
                        }
                    }
                }
            }
        }
        
        result = lambda_handler(event, lambda_context)
        
        assert result["requestId"] == "test-request-456"
        assert result["status"] == "success"
        assert result["fragment"]["Resources"]["TestBucket"]["Properties"]["BucketName"] == "bucket-my-test-id-suffix"

    def test_lambda_handler_uppercase_placeholder(self, lambda_context):
        """Test transformation with uppercase __PROVISIONED_ID__ placeholder."""
        event = {
            "requestId": "test-request-789",
            "templateParameterValues": {
                "PROVISIONEDID": "UPPER-TEST-ID"
            },
            "fragment": {
                "Resources": {
                    "TestRole": {
                        "Type": "AWS::IAM::Role",
                        "Properties": {
                            "RoleName": "Role__PROVISIONED_ID__"
                        }
                    }
                }
            }
        }
        
        result = lambda_handler(event, lambda_context)
        
        assert result["requestId"] == "test-request-789"
        assert result["status"] == "success"
        assert result["fragment"]["Resources"]["TestRole"]["Properties"]["RoleName"] == "RoleUPPER-TEST-ID"

    def test_lambda_handler_both_placeholders(self, lambda_context):
        """Test transformation with both uppercase and lowercase placeholders."""
        event = {
            "requestId": "test-request-mixed",
            "templateParameterValues": {
                "PROVISIONEDID": "mixed-case-id"
            },
            "fragment": {
                "Resources": {
                    "Resource1": {
                        "Properties": {
                            "Name": "prefix-__provisioned_id__-suffix"
                        }
                    },
                    "Resource2": {
                        "Properties": {
                            "Name": "PREFIX-__PROVISIONED_ID__-SUFFIX"
                        }
                    }
                }
            }
        }
        
        result = lambda_handler(event, lambda_context)
        
        assert result["fragment"]["Resources"]["Resource1"]["Properties"]["Name"] == "prefix-mixed-case-id-suffix"
        assert result["fragment"]["Resources"]["Resource2"]["Properties"]["Name"] == "PREFIX-mixed-case-id-SUFFIX"

    def test_lambda_handler_no_placeholders(self, lambda_context):
        """Test transformation when no placeholders are present."""
        event = {
            "requestId": "test-request-no-placeholders",
            "templateParameterValues": {
                "PROVISIONEDID": "unused-id"
            },
            "fragment": {
                "Resources": {
                    "StaticResource": {
                        "Type": "AWS::S3::Bucket",
                        "Properties": {
                            "BucketName": "static-bucket-name"
                        }
                    }
                }
            }
        }
        
        result = lambda_handler(event, lambda_context)
        
        assert result["requestId"] == "test-request-no-placeholders"
        assert result["status"] == "success"
        assert result["fragment"]["Resources"]["StaticResource"]["Properties"]["BucketName"] == "static-bucket-name"

    def test_lambda_handler_empty_template(self, lambda_context):
        """Test transformation with empty template fragment."""
        event = {
            "requestId": "test-request-empty",
            "templateParameterValues": {
                "PROVISIONEDID": "test-id"
            },
            "fragment": {}
        }
        
        result = lambda_handler(event, lambda_context)
        
        assert result["requestId"] == "test-request-empty"
        assert result["status"] == "success"
        assert result["fragment"] == {}

    def test_lambda_handler_complex_nested_structure(self, lambda_context):
        """Test transformation with deeply nested template structure."""
        event = {
            "requestId": "test-request-nested",
            "templateParameterValues": {
                "PROVISIONEDID": "nested-id"
            },
            "fragment": {
                "Resources": {
                    "ComplexResource": {
                        "Type": "AWS::CloudFormation::Stack",
                        "Properties": {
                            "Parameters": {
                                "BucketName": "bucket-__provisioned_id__",
                                "RoleName": "role-__PROVISIONED_ID__"
                            },
                            "Tags": [
                                {
                                    "Key": "Name",
                                    "Value": "stack-__provisioned_id__"
                                }
                            ]
                        }
                    }
                }
            }
        }
        
        result = lambda_handler(event, lambda_context)
        
        properties = result["fragment"]["Resources"]["ComplexResource"]["Properties"]
        assert properties["Parameters"]["BucketName"] == "bucket-nested-id"
        assert properties["Parameters"]["RoleName"] == "role-nested-id"
        assert properties["Tags"][0]["Value"] == "stack-nested-id"

    @patch('provisioning_macro.provisioning_macro.logger')
    def test_lambda_handler_logging(self, mock_logger, sample_provisioning_event, lambda_context):
        """Test that appropriate logging occurs."""
        lambda_handler(sample_provisioning_event, lambda_context)
        
        mock_logger.info.assert_called_with("**Starting")
        mock_logger.debug.assert_called_once()

    def test_lambda_handler_special_characters_in_id(self, lambda_context):
        """Test transformation with special characters in provisioned ID."""
        event = {
            "requestId": "test-request-special",
            "templateParameterValues": {
                "PROVISIONEDID": "test-id-123_ABC"
            },
            "fragment": {
                "Resources": {
                    "TestResource": {
                        "Properties": {
                            "Name": "resource-__provisioned_id__"
                        }
                    }
                }
            }
        }
        
        result = lambda_handler(event, lambda_context)
        
        assert result["fragment"]["Resources"]["TestResource"]["Properties"]["Name"] == "resource-test-id-123_ABC"