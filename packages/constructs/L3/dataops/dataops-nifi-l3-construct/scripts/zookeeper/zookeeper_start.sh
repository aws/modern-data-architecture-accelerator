#!/bin/bash



rm -rf /conf/*
cp -rL $ZK_INIT_DIR/conf/* /conf

sed -i "s/INIT_HOSTNAME/${HOSTNAME}/g" /conf/zoo.cfg
sed -i "s/INIT_KEYSTORE_PASSWORD/${ZK_KEYSTORE_PASSWORD}/g" /conf/zoo.cfg
sed -i "s/INIT_TRUSTSTORE_PASSWORD/${ZK_TRUSTSTORE_PASSWORD}/g" /conf/zoo.cfg


export ZOO_MY_ID=$(echo $HOSTNAME|cut -d '-' -f 2)

/docker-entrypoint.sh && \
zkServer.sh start-foreground
