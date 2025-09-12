"""
Unit tests for CFN Response module.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
import urllib3

import cfnresponse


class TestCfnResponse:
    """Test cases for cfnresponse module."""
    
    @patch('cfnresponse.http')
    def test_send_success_response(self, mock_http):
        """Test sending successful CFN response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_http.request.return_value = mock_response
        
        event = {
            "ResponseURL": "https://cloudformation-custom-resource-response.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestResource"
        }
        
        context = MagicMock()
        context.log_stream_name = "test-log-stream"
        
        response_data = {"result": "success"}
        
        cfnresponse.send(event, context, cfnresponse.SUCCESS, response_data)
        
        # Verify HTTP request was made
        mock_http.request.assert_called_once()
        
        # Verify request parameters
        call_args = mock_http.request.call_args
        assert call_args[0][0] == "PUT"
        assert call_args[0][1] == event["ResponseURL"]
        
        # Verify response body
        response_body = json.loads(call_args[1]["body"])
        assert response_body["Status"] == "SUCCESS"
        assert response_body["StackId"] == event["StackId"]
        assert response_body["RequestId"] == event["RequestId"]
        assert response_body["LogicalResourceId"] == event["LogicalResourceId"]
        assert response_body["Data"] == response_data
        assert response_body["PhysicalResourceId"] == context.log_stream_name
    
    @patch('cfnresponse.http')
    def test_send_failed_response(self, mock_http):
        """Test sending failed CFN response."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_http.request.return_value = mock_response
        
        event = {
            "ResponseURL": "https://cloudformation-custom-resource-response.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestResource"
        }
        
        context = MagicMock()
        context.log_stream_name = "test-log-stream"
        
        response_data = {"error": "Something went wrong"}
        reason = "Custom error message"
        
        cfnresponse.send(event, context, cfnresponse.FAILED, response_data, reason=reason)
        
        # Verify HTTP request was made
        mock_http.request.assert_called_once()
        
        # Verify response body
        call_args = mock_http.request.call_args
        response_body = json.loads(call_args[1]["body"])
        assert response_body["Status"] == "FAILED"
        assert response_body["Reason"] == reason
        assert response_body["Data"] == response_data
    
    @patch('cfnresponse.http')
    def test_send_with_custom_physical_resource_id(self, mock_http):
        """Test sending response with custom physical resource ID."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_http.request.return_value = mock_response
        
        event = {
            "ResponseURL": "https://cloudformation-custom-resource-response.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestResource"
        }
        
        context = MagicMock()
        context.log_stream_name = "test-log-stream"
        
        custom_physical_id = "custom-resource-id"
        
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {}, physicalResourceId=custom_physical_id)
        
        # Verify response body
        call_args = mock_http.request.call_args
        response_body = json.loads(call_args[1]["body"])
        assert response_body["PhysicalResourceId"] == custom_physical_id
    
    @patch('cfnresponse.http')
    def test_send_with_no_echo(self, mock_http):
        """Test sending response with NoEcho flag."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_http.request.return_value = mock_response
        
        event = {
            "ResponseURL": "https://cloudformation-custom-resource-response.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestResource"
        }
        
        context = MagicMock()
        context.log_stream_name = "test-log-stream"
        
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {}, noEcho=True)
        
        # Verify response body
        call_args = mock_http.request.call_args
        response_body = json.loads(call_args[1]["body"])
        assert response_body["NoEcho"] is True
    
    @patch('cfnresponse.http')
    def test_send_http_error_handling(self, mock_http):
        """Test error handling when HTTP request fails."""
        mock_http.request.side_effect = Exception("HTTP request failed")
        
        event = {
            "ResponseURL": "https://cloudformation-custom-resource-response.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestResource"
        }
        
        context = MagicMock()
        context.log_stream_name = "test-log-stream"
        
        # Should not raise exception
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        
        # Verify HTTP request was attempted
        mock_http.request.assert_called_once()
    
    @patch('cfnresponse.http')
    def test_send_default_reason(self, mock_http):
        """Test default reason message generation."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_http.request.return_value = mock_response
        
        event = {
            "ResponseURL": "https://cloudformation-custom-resource-response.s3.amazonaws.com/test",
            "StackId": "arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/test-id",
            "RequestId": "test-request-id",
            "LogicalResourceId": "TestResource"
        }
        
        context = MagicMock()
        context.log_stream_name = "test-log-stream"
        
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        
        # Verify response body has default reason
        call_args = mock_http.request.call_args
        response_body = json.loads(call_args[1]["body"])
        assert "See the details in CloudWatch Log Stream" in response_body["Reason"]
        assert context.log_stream_name in response_body["Reason"]
    
    def test_constants(self):
        """Test module constants."""
        assert cfnresponse.SUCCESS == "SUCCESS"
        assert cfnresponse.FAILED == "FAILED"
    
    def test_http_pool_manager(self):
        """Test HTTP pool manager initialization."""
        assert isinstance(cfnresponse.http, urllib3.PoolManager)