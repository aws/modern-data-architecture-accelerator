# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Evaluation script for measuring mean squared error."""

import json
import logging
import pathlib
import pickle
import sys
import tarfile

import numpy as np
import pandas as pd
import xgboost
from sklearn.metrics import mean_squared_error

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


if __name__ == "__main__":
    logger.debug("Starting evaluation.")
    model_path = "/opt/ml/processing/model/model.tar.gz"
    with tarfile.open(model_path) as tar:
        # Use filter="data" on Python 3.12+ for path traversal protection (PEP 706).
        # Fall back to unfiltered extraction on older runtimes (e.g. SageMaker XGBoost containers).
        if sys.version_info >= (3, 12):
            tar.extractall(path=".", filter="data")
        else:
            tar.extractall(path=".")

    logger.debug("Loading xgboost model.")
    # Security note on pickle.load: pickle deserialization can execute arbitrary code,
    # which is a known risk (https://docs.python.org/3/library/pickle.html#restricting-globals).
    # This is mitigated here because:
    # 1. The model artifact is produced by our own SageMaker Training job within the same
    #    pipeline — it is not user-uploaded or sourced from an untrusted location.
    # 2. The model is stored in a KMS-encrypted S3 bucket with IAM policies restricting
    #    write access to the SageMaker execution role only.
    # 3. This script runs inside an ephemeral SageMaker Processing container with no
    #    inbound network access (VPC + network isolation when enabled).
    # 4. The tar extraction uses filter="data" (PEP 706) to prevent path traversal.
    # If switching to untrusted model sources, replace pickle with a safe format
    # (e.g. xgboost.Booster.load_model with JSON/UBJ serialization).
    # TODO: Consider migrating to xgboost.Booster().load_model("xgboost-model") when
    # training is configured to save in JSON/UBJ format (set save_model_as_json=True).
    with open("xgboost-model", "rb") as model_file:
        model = pickle.load(model_file)  # noqa: S301

    logger.debug("Reading test data.")
    test_path = "/opt/ml/processing/test/test.csv"
    df = pd.read_csv(test_path, header=None)

    logger.debug("Extracting features and target from test data.")
    y_test = df.iloc[:, 0].to_numpy()
    df = df.drop(df.columns[0], axis=1)
    X_test = xgboost.DMatrix(df.to_numpy())

    logger.info("Performing predictions against test data.")
    predictions = model.predict(X_test)

    logger.debug("Calculating mean squared error.")
    mse = mean_squared_error(y_test, predictions)
    std = np.std(y_test - predictions)
    report_dict = {
        "regression_metrics": {
            "mse": {"value": mse, "standard_deviation": std},
        },
    }

    output_dir = "/opt/ml/processing/evaluation"
    pathlib.Path(output_dir).mkdir(parents=True, exist_ok=True)

    logger.info("Writing out evaluation report with mse: %f", mse)
    evaluation_path = f"{output_dir}/evaluation.json"
    with open(evaluation_path, "w") as f:
        f.write(json.dumps(report_dict))
