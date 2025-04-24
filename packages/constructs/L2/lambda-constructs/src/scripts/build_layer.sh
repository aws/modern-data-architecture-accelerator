#!/bin/sh
TEMP_DIR=$1
cd $TEMP_DIR
mkdir -p python/ && \
    pip3.12 install --no-cache-dir --platform manylinux2014_x86_64 --only-binary=:all: -r requirements.txt -t python