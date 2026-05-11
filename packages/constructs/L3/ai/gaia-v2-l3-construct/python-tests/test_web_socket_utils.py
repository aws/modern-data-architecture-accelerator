# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for web socket utilities module.
Tests WebSocket message sending functionality.
"""

import json
import pytest
import urllib.error
import urllib.request
from unittest.mock import Mock, patch, MagicMock, mock_open

# Import the module under test
import sys
import os

from web_socket_utils import send_websocket_message


class TestSendWebsocketMessage:
    """Test class for send_websocket_message function"""

    def setup_method(self):
        """Setup test fixtures"""
        self.websocket_url = "https://websocket.example.com/api"
        self.channel = "/out/user-123/session-456"
        self.message = {
            'id': 'msg-789',
            'content': {
                'type': 'textDelta',
                'sequenceNumber': 1,
                'text': 'Hello world'
            }
        }
        self.auth_header = "Bearer token123"

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_success(self, mock_urlopen):
        """Test successful WebSocket message send"""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"status": "ok"}'
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        assert result == '{"status": "ok"}'
        mock_urlopen.assert_called_once()

    @patch('web_socket_utils.urllib.request.urlopen')
    @patch('web_socket_utils.urllib.request.Request')
    def test_send_websocket_message_request_construction(self, mock_request, mock_urlopen):
        """Test that request is constructed correctly"""
        mock_response = MagicMock()
        mock_response.read.return_value = b'ok'
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        # Verify Request was created with correct parameters
        mock_request.assert_called_once()
        call_kwargs = mock_request.call_args[1]
        
        assert call_kwargs['url'] == self.websocket_url
        assert call_kwargs['method'] == 'POST'
        
        # Verify headers
        headers = call_kwargs['headers']
        assert headers['Content-Type'] == 'application/json; charset=UTF-8'
        assert headers['Authorization'] == self.auth_header
        
        # Verify data payload structure
        data = call_kwargs['data']
        decoded_data = json.loads(data.decode('utf-8'))
        assert decoded_data['channel'] == self.channel
        assert len(decoded_data['events']) == 1
        
        # Event should be JSON stringified message
        event = json.loads(decoded_data['events'][0])
        assert event['id'] == 'msg-789'
        assert event['content']['type'] == 'textDelta'
        assert event['content']['text'] == 'Hello world'

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_with_complex_message(self, mock_urlopen):
        """Test sending WebSocket message with complex nested structure"""
        mock_response = MagicMock()
        mock_response.read.return_value = b'ok'
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        complex_message = {
            'id': 'complex-123',
            'content': {
                'type': 'source',
                'documents': [
                    {
                        'retrievedReference': {
                            'content': {'text': 'Document content'},
                            'location': {'type': 'S3'}
                        },
                        'sourceId': 'doc_1'
                    }
                ]
            },
            'metadata': {
                'timestamp': 1234567890,
                'nested': {
                    'field': 'value'
                }
            }
        }
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            complex_message,
            self.auth_header
        )
        
        assert result == 'ok'

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_http_error(self, mock_urlopen):
        """Test handling HTTPError"""
        # Mock HTTP error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url=self.websocket_url,
            code=500,
            msg='Internal Server Error',
            hdrs={},
            fp=None
        )
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        # Should return None on error
        assert result is None

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_url_error(self, mock_urlopen):
        """Test handling URLError"""
        # Mock URL error
        mock_urlopen.side_effect = urllib.error.URLError('Connection refused')
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        # Should return None on error
        assert result is None

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_404_error(self, mock_urlopen):
        """Test handling 404 not found error"""
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url=self.websocket_url,
            code=404,
            msg='Not Found',
            hdrs={},
            fp=None
        )
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        assert result is None

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_401_unauthorized(self, mock_urlopen):
        """Test handling 401 unauthorized error"""
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url=self.websocket_url,
            code=401,
            msg='Unauthorized',
            hdrs={},
            fp=None
        )
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        assert result is None

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_empty_response(self, mock_urlopen):
        """Test handling empty response from server"""
        mock_response = MagicMock()
        mock_response.read.return_value = b''
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            self.message,
            self.auth_header
        )
        
        assert result == ''

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_websocket_message_with_unicode(self, mock_urlopen):
        """Test sending message with unicode characters"""
        mock_response = MagicMock()
        mock_response.read.return_value = 'OK'.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        unicode_message = {
            'id': 'unicode-123',
            'content': {
                'type': 'textDelta',
                'text': 'Hello 世界 🌍 émojis'
            }
        }
        
        result = send_websocket_message(
            self.websocket_url,
            self.channel,
            unicode_message,
            self.auth_header
        )
        
        assert result == 'OK'


class TestWebSocketUtilsEdgeCases:
    """Test edge cases and error scenarios"""

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_message_with_none_values(self, mock_urlopen):
        """Test sending message with None values"""
        mock_response = MagicMock()
        mock_response.read.return_value = b'ok'
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        message_with_none = {
            'id': 'test-123',
            'content': None,
            'metadata': None
        }
        
        result = send_websocket_message(
            "https://example.com",
            "/channel",
            message_with_none,
            "auth-token"
        )
        
        assert result == 'ok'

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_message_with_large_payload(self, mock_urlopen):
        """Test sending message with large payload"""
        mock_response = MagicMock()
        mock_response.read.return_value = b'ok'
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        # Create a message with large text content
        large_message = {
            'id': 'large-123',
            'content': {
                'type': 'textDelta',
                'text': 'x' * 10000  # 10KB of text
            }
        }
        
        result = send_websocket_message(
            "https://example.com",
            "/channel",
            large_message,
            "auth-token"
        )
        
        assert result == 'ok'

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_message_with_special_characters_in_channel(self, mock_urlopen):
        """Test sending message with special characters in channel path"""
        mock_response = MagicMock()
        mock_response.read.return_value = b'ok'
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        special_channel = "/out/user-abc-123/session-def-456"
        
        result = send_websocket_message(
            "https://example.com",
            special_channel,
            {'id': 'test'},
            "auth-token"
        )
        
        assert result == 'ok'

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_message_timeout(self, mock_urlopen):
        """Test handling timeout error"""
        mock_urlopen.side_effect = urllib.error.URLError('Timeout')
        
        result = send_websocket_message(
            "https://example.com",
            "/channel",
            {'id': 'test'},
            "auth-token"
        )
        
        assert result is None

    @patch('web_socket_utils.urllib.request.urlopen')
    def test_send_message_with_binary_response(self, mock_urlopen):
        """Test handling binary response data"""
        mock_response = MagicMock()
        # Binary response that is valid UTF-8
        mock_response.read.return_value = '{"status":"ok"}'.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = None
        mock_urlopen.return_value = mock_response
        
        result = send_websocket_message(
            "https://example.com",
            "/channel",
            {'id': 'test'},
            "auth-token"
        )
        
        assert result == '{"status":"ok"}'


if __name__ == '__main__':
    pytest.main([__file__])