# Training Data

Place your training dataset here. Files in this directory are uploaded to the
pipeline S3 bucket (`s3://<pipeline-bucket>/dataset/`) during `mdaa deploy`.

## Sample Abalone Dataset

```bash
curl -o abalone-dataset.csv \
  https://archive.ics.uci.edu/ml/machine-learning-databases/abalone/abalone.data
```

The pipeline expects this file as `abalone-dataset.csv` (headerless CSV, ~4177 rows).
See `seed_code/training/source_scripts/preprocessing.py` for the column definitions.
