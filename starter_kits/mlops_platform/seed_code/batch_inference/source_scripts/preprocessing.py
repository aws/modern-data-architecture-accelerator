# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Feature engineers the abalone dataset."""

import argparse
import logging
import os
import pathlib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Data split ratios — adjust these to change train/validation/test allocation.
TRAIN_RATIO = 0.70
VALIDATION_RATIO = 0.15
TEST_RATIO = 1.0 - TRAIN_RATIO - VALIDATION_RATIO
assert TEST_RATIO > 0, "Split ratios must sum to less than 1.0"

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


# Since we get a headerless CSV file we specify the column names here.
feature_columns_dtype = {
    "sex": str,
    "length": np.float64,
    "diameter": np.float64,
    "height": np.float64,
    "whole_weight": np.float64,
    "shucked_weight": np.float64,
    "viscera_weight": np.float64,
    "shell_weight": np.float64,
}
label_column_dtype = {"rings": np.float64}

feature_columns_names = list(feature_columns_dtype.keys())
label_column = next(iter(label_column_dtype))


if __name__ == "__main__":
    logger.debug("Starting preprocessing.")
    parser = argparse.ArgumentParser()
    parser.add_argument("--do-train-test-split", type=str, default="True")
    args = parser.parse_args()

    base_dir = "/opt/ml/processing"
    pathlib.Path(f"{base_dir}/data").mkdir(parents=True, exist_ok=True)

    # Data is provided via SageMaker ProcessingInput channel.
    # SageMaker copies the S3 data to /opt/ml/processing/input/data/ BEFORE the
    # container starts, so this works with enableNetworkIsolation=true (no API calls needed).
    input_dir = f"{base_dir}/input/data"
    input_files = list(pathlib.Path(input_dir).glob("*.csv"))
    if not input_files:
        raise FileNotFoundError(f"No CSV files found in {input_dir}. Check the InputDataUrl pipeline parameter.")
    fn = str(input_files[0])
    logger.info("Reading input data from channel: %s", fn)

    df = pd.read_csv(
        fn,
        header=None,
        names=feature_columns_names + [label_column],
        dtype={**feature_columns_dtype, **label_column_dtype},
    )
    os.unlink(fn)

    logger.debug("Defining transformers.")
    numeric_features = list(feature_columns_names)
    numeric_features.remove("sex")
    numeric_transformer = Pipeline(steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())])

    categorical_features = ["sex"]
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocess = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
        ]
    )

    logger.info("Applying transforms.")
    y = df.pop("rings")
    X_pre = preprocess.fit_transform(df)
    y_pre = y.to_numpy().reshape(len(y), 1)

    if args.do_train_test_split.lower() == "true":
        X = np.concatenate((y_pre, X_pre), axis=1)
        logger.info("Splitting %d rows of data into train, validation, test datasets.", len(X))
        np.random.default_rng(seed=42).shuffle(X)
        train_end = int(TRAIN_RATIO * len(X))
        val_end = int((TRAIN_RATIO + VALIDATION_RATIO) * len(X))
        train, validation, test = np.split(X, [train_end, val_end])

        logger.info("Writing out datasets to %s.", base_dir)
        pd.DataFrame(train).to_csv(f"{base_dir}/train/train.csv", header=False, index=False)
        pd.DataFrame(validation).to_csv(f"{base_dir}/validation/validation.csv", header=False, index=False)
        pd.DataFrame(test).to_csv(f"{base_dir}/test/test.csv", header=False, index=False)
    else:
        logger.info("Writing out datasets to %s.", base_dir)
        pd.DataFrame(X_pre).to_csv(f"{base_dir}/output_data/data.csv", header=False, index=False)
