#!/bin/bash


mkdir -p $NIFI_TOOLKIT_HOME/conf/
rm -rf $NIFI_TOOLKIT_HOME/conf/*
cp -rL $NIFI_INIT_DIR/conf/* $NIFI_TOOLKIT_HOME/conf

find "${NIFI_TOOLKIT_HOME}/conf/" -type f -exec sed -i "s/INIT_HOSTNAME/${HOSTNAME}/g" {} \;
find "${NIFI_TOOLKIT_HOME}/conf/" -type f -exec sed -i "s/INIT_KEYSTORE_PASSWORD/${NIFI_KEYSTORE_PASSWORD}/g" {} \;
find "${NIFI_TOOLKIT_HOME}/conf/" -type f -exec sed -i "s/INIT_TRUSTSTORE_PASSWORD/${NIFI_TRUSTSTORE_PASSWORD}/g" {} \;
find "${NIFI_TOOLKIT_HOME}/conf/" -type f -exec sed -i "s/INIT_SENSITIVE_PROPS_KEY/${NIFI_SENSITIVE_PROPS_KEY}/g" {} \;
find "${NIFI_TOOLKIT_HOME}/conf/" -type f -exec sed -i "s/INIT_NIFI_ZOOKEEPER_CONNECT_STRING/${NIFI_ZOOKEEPER_CONNECT_STRING}/g" {} \;

${NIFI_TOOLKIT_HOME}/bin/cli.sh session set nifi.props "${NIFI_TOOLKIT_HOME}/conf/nifi-cli.config"

export AWS_ROLE_SESSION_NAME=$HOSTNAME
mkdir -p ${NIFI_DATA_DIR}/ssl/keystore
mkdir -p ${NIFI_DATA_DIR}/ssl/truststore

python3 ${NIFI_SCRIPTS_HOME}/aws_creds.py &
python3 ${NIFI_SCRIPTS_HOME}/certs.py & 
python3 ${NIFI_SCRIPTS_HOME}/nifi_manager.py & 
tail -f /dev/null








