#!/bin/bash

mkdir -p ./src/python/boto3_layer/
rm -f ./src/python/boto3_layer/1.36.11.zip

if ! command -v docker 2>&1 >/dev/null
then
    echo "Docker command could not be found. Skipping container builds. Note, this might break functionality for this module."
    exit 0
fi

# Build the Docker image
docker build -t bundler .

docker run --name bundler-container bundler

docker cp bundler-container:/app/1.36.11.zip .

docker rm -f bundler-container

# Check if the .zip file was created
if [ -f "1.36.11.zip" ]; then
    echo "1.36.11.zip file created successfully!"
else
    echo "Error: 1.36.11.zip file not found."
    exit 1
fi