# Source Scripts

ML scripts executed inside SageMaker containers during pipeline runs. These are
uploaded to S3 by the training buildspec and referenced by the pipeline steps in
`ml_pipelines/training/pipeline.py`.

| Script | Pipeline Step | Container |
|--------|--------------|-----------|
| `preprocessing.py` | `PreprocessAbaloneData` | SageMaker Processing (sklearn) |
| `evaluate.py` | `EvaluateAbaloneModel` | SageMaker Processing (xgboost) |

## Adding a new script

1. Add the Python file to this directory
2. Reference it via `ProcessingStep.code` in your pipeline definition
3. Ensure the buildspec uploads it to S3 before `start-pipeline-execution`
