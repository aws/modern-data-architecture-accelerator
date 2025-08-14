"""
Basic tests to verify the Health Data Accelerator Python testing setup.
"""
import pytest
import sys
import os


def test_python_path_setup():
    """Test that Python paths are correctly set up."""
    lambda_path = os.path.join(os.path.dirname(__file__), '../src/lambda')
    glue_path = os.path.join(os.path.dirname(__file__), '../src/glue')
    
    assert os.path.exists(lambda_path)
    assert os.path.exists(glue_path)


def test_environment_variables(aws_credentials):
    """Test that AWS environment variables are set."""
    assert 'AWS_ACCESS_KEY_ID' in os.environ
    assert 'AWS_SECRET_ACCESS_KEY' in os.environ
    assert 'AWS_DEFAULT_REGION' in os.environ


class TestHealthDataAcceleratorSetup:
    """Test class for Health Data Accelerator setup verification."""
    
    def test_source_directories_exist(self):
        """Test that source directories exist."""
        base_path = os.path.join(os.path.dirname(__file__), '../src')
        
        assert os.path.exists(os.path.join(base_path, 'lambda'))
        assert os.path.exists(os.path.join(base_path, 'glue'))
        assert os.path.exists(os.path.join(base_path, 'lambda/file_manager'))
        assert os.path.exists(os.path.join(base_path, 'lambda/file_processor'))
        assert os.path.exists(os.path.join(base_path, 'glue/file_processor'))
        assert os.path.exists(os.path.join(base_path, 'glue/transformation'))
    
    def test_python_files_exist(self):
        """Test that Python files exist."""
        base_path = os.path.join(os.path.dirname(__file__), '../src')
        
        # Lambda files
        assert os.path.exists(os.path.join(base_path, 'lambda/file_manager/odpf_file_manager.py'))
        assert os.path.exists(os.path.join(base_path, 'lambda/file_processor/odpf_batch_generator_lambda.py'))
        
        # Glue files
        assert os.path.exists(os.path.join(base_path, 'glue/file_processor/odpf_file_processor.py'))
        assert os.path.exists(os.path.join(base_path, 'glue/transformation/surveys_transformation_job.py'))
        assert os.path.exists(os.path.join(base_path, 'glue/transformation/vitals_transformation_job.py'))