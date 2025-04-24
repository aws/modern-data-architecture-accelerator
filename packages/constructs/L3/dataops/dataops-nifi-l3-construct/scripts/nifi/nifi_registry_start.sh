#!/bin/bash

# tail -f /dev/null

rm -rf $NIFI_HOME/conf/*
cp -rL $NIFI_INIT_DIR/conf/* $NIFI_HOME/conf

find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_KEYSTORE_PASSWORD/${NIFI_KEYSTORE_PASSWORD}/g" {} \;
find "${NIFI_HOME}/conf/" -type f -exec sed -i "s/INIT_TRUSTSTORE_PASSWORD/${NIFI_TRUSTSTORE_PASSWORD}/g" {} \;

mkdir -p "${NIFI_REGISTRY_HOME}/logs/"
touch "${NIFI_REGISTRY_HOME}/logs/nifi-registry-app.log"

# Continuously provide logs so that 'docker logs' can produce them
tail -F "${NIFI_REGISTRY_HOME}/logs/nifi-registry-app.log" &
"${NIFI_REGISTRY_HOME}/bin/nifi-registry.sh" run &
nifi_registry_pid="$!"

trap "echo Received trapped signal, beginning shutdown...;" KILL TERM HUP INT EXIT;

echo NiFi-Registry running with PID ${nifi_registry_pid}.
wait ${nifi_registry_pid}