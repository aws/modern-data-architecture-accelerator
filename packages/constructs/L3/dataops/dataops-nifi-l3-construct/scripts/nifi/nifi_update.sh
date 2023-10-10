#!/bin/bash

# tail -f /dev/null

pip install boto3

export AWS_ROLE_SESSION_NAME=$HOSTNAME
mkdir -p ${NIFI_DATA_DIR}/ssl/keystore
mkdir -p ${NIFI_DATA_DIR}/ssl/truststore

python ${NIFI_INIT_DIR}/scripts/nifi_aws_creds.py &
python ${NIFI_INIT_DIR}/scripts/nifi_certs.py 








