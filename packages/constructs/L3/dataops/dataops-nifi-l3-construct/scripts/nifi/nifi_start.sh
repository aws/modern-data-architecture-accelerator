#!/bin/bash

# tail -f /dev/null

rm -rf $NIFI_HOME/conf/*
cp -rL $NIFI_INIT_DIR/conf/* $NIFI_HOME/conf

find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_HOSTNAME/${HOSTNAME}/g" {} \;
find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_KEYSTORE_PASSWORD/${NIFI_KEYSTORE_PASSWORD}/g" {} \;
find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_TRUSTSTORE_PASSWORD/${NIFI_TRUSTSTORE_PASSWORD}/g" {} \;
find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_SENSITIVE_PROPS_KEY/${NIFI_SENSITIVE_PROPS_KEY}/g" {} \;
find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_NIFI_ZOOKEEPER_CONNECT_STRING/${NIFI_ZOOKEEPER_CONNECT_STRING}/g" {} \;

if [ -n "${SINGLE_USER_CREDENTIALS_USERNAME}" ] && [ -n "${SINGLE_USER_CREDENTIALS_PASSWORD}" ]; then
    ${NIFI_HOME}/bin/nifi.sh set-single-user-credentials "${SINGLE_USER_CREDENTIALS_USERNAME}" "${SINGLE_USER_CREDENTIALS_PASSWORD}"
fi

# Continuously provide logs so that 'docker logs' can produce them
"${NIFI_HOME}/bin/nifi.sh" run &
nifi_pid="$!"
tail -F --pid=${nifi_pid} "${NIFI_HOME}/logs/nifi-app.log" &

trap 'echo Received trapped signal, beginning shutdown...;./bin/nifi.sh stop;exit 0;' TERM HUP INT;
trap ":" EXIT

echo NiFi running with PID ${nifi_pid}.
wait ${nifi_pid}