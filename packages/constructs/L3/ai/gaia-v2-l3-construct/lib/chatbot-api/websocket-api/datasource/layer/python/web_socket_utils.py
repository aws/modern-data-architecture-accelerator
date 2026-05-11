import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Dict, Any

# Timeout for WebSocket HTTP requests (seconds)
WEBSOCKET_TIMEOUT = int(os.environ.get('WEBSOCKET_TIMEOUT', '10'))


def send_websocket_message(websocket_url: str, channel: str, message: Dict[str, Any], auth_header: str):
    """
    Send message to websocket using standard urllib library
    """
    data = json.dumps({
        'channel': channel,
        'events': [json.dumps(message)]
    }).encode('utf-8')

    headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': auth_header
    }

    req = urllib.request.Request(
        url=websocket_url,
        data=data,
        headers=headers,
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=WEBSOCKET_TIMEOUT) as response:
            return response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        logging.error(f"HTTP Error: {e.code} - {e.reason}")
        return None
    except urllib.error.URLError as e:
        logging.error(f"URL Error: {e.reason}")
        return None
    except TimeoutError:
        logging.error(f"WebSocket request timed out after {WEBSOCKET_TIMEOUT}s")
        return None
