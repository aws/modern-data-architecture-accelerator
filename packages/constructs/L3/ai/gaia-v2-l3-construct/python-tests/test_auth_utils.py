"""
Unit tests for auth_utils functions.
Tests is_admin and get_user_id functionality.
"""

import pytest
from unittest.mock import Mock, patch

import sys
import os

# Set required environment variables BEFORE importing the module
os.environ["AWS_REGION"] = "us-east-1"



class TestIsAdmin:
    """Test is_admin function"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_router = Mock()

    def _set_groups(self, groups):
        """Helper to set cognito:groups in mock router"""
        self.mock_router.current_event = {
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "cognito:groups": groups
                    }
                }
            }
        }

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_true_single_group(self):
        """Test is_admin returns True when user is in admin group"""
        # Re-import to pick up patched env var
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("admin")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is True

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_true_multiple_groups(self):
        """Test is_admin returns True when admin is one of multiple groups"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("users,admin,developers")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is True

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_false_not_in_group(self):
        """Test is_admin returns False when user is not in admin group"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("users,developers")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_false_empty_groups(self):
        """Test is_admin returns False when groups is empty string"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_false_groups_none(self):
        """Test is_admin returns False when groups is None"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups(None)
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_true_groups_as_list(self):
        """Test is_admin handles groups as list (alternative Cognito format)"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups(["users", "admin", "developers"])
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is True

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_false_groups_as_list_not_member(self):
        """Test is_admin returns False when admin not in list"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups(["users", "developers"])
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": ""})
    def test_is_admin_false_admin_group_not_configured(self):
        """Test is_admin returns False when ADMIN_GROUP env var is empty"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("admin")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {}, clear=False)
    def test_is_admin_false_admin_group_missing(self):
        """Test is_admin returns False when ADMIN_GROUP env var is missing"""
        # Remove ADMIN_GROUP if it exists
        if "ADMIN_GROUP" in os.environ:
            del os.environ["ADMIN_GROUP"]
        
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("admin")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_false_missing_claims(self):
        """Test is_admin returns False when claims are missing"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self.mock_router.current_event = {
            "requestContext": {
                "authorizer": {}
            }
        }
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_false_missing_authorizer(self):
        """Test is_admin returns False when authorizer is missing"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self.mock_router.current_event = {
            "requestContext": {}
        }
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False

    @patch.dict(os.environ, {"ADMIN_GROUP": "admin"})
    def test_is_admin_partial_match_rejected(self):
        """Test is_admin doesn't match partial group names"""
        import importlib
        from utils import auth_utils
        importlib.reload(auth_utils)
        
        self._set_groups("admin-readonly,super-admin")
        
        result = auth_utils.is_admin(self.mock_router)
        
        assert result is False


class TestGetUserId:
    """Test get_user_id function"""

    def setup_method(self):
        """Setup test fixtures"""
        self.mock_router = Mock()
        self.mock_user_id = "user-123-abc"

    def test_get_user_id_success(self):
        """Test successful user ID extraction"""
        from utils import auth_utils
        
        self.mock_router.current_event = {
            "requestContext": {
                "authorizer": {
                    "claims": {
                        "sub": self.mock_user_id
                    }
                }
            }
        }
        
        result = auth_utils.get_user_id(self.mock_router)
        
        assert result == self.mock_user_id

    def test_get_user_id_missing_sub(self):
        """Test get_user_id returns None when sub claim is missing"""
        from utils import auth_utils
        
        self.mock_router.current_event = {
            "requestContext": {
                "authorizer": {
                    "claims": {}
                }
            }
        }
        
        result = auth_utils.get_user_id(self.mock_router)
        
        assert result is None

    def test_get_user_id_missing_claims(self):
        """Test get_user_id returns None when claims are missing"""
        from utils import auth_utils
        
        self.mock_router.current_event = {
            "requestContext": {
                "authorizer": {}
            }
        }
        
        result = auth_utils.get_user_id(self.mock_router)
        
        assert result is None

    def test_get_user_id_missing_authorizer(self):
        """Test get_user_id returns None when authorizer is missing"""
        from utils import auth_utils
        
        self.mock_router.current_event = {
            "requestContext": {}
        }
        
        result = auth_utils.get_user_id(self.mock_router)
        
        assert result is None

    def test_get_user_id_empty_event(self):
        """Test get_user_id returns None for empty event"""
        from utils import auth_utils
        
        self.mock_router.current_event = {}
        
        result = auth_utils.get_user_id(self.mock_router)
        
        assert result is None


if __name__ == '__main__':
    pytest.main([__file__])
