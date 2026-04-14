import os
import sys
from unittest.mock import Mock


def setup_pythonpath():
    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
    sys.path.insert(0, assets_path)

    # Mock pyspark and awsglue modules (not available outside Glue runtime)
    sys.modules["pyspark"] = Mock()
    sys.modules["pyspark.context"] = Mock()
    sys.modules["awsglue"] = Mock()
    sys.modules["awsglue.context"] = Mock()
    sys.modules["awsglue.transforms"] = Mock()
    sys.modules["awsglue.utils"] = Mock()
    sys.modules["awsglue.job"] = Mock()
    sys.modules["awsgluedq"] = Mock()
    sys.modules["awsgluedq.transforms"] = Mock()


setup_pythonpath()
