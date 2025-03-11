#!/bin/bash

rm -f common_layer.zip

if ! command -v docker 2>&1 >/dev/null
then
    echo "Docker command could not be found. Skipping container builds. Note, this might break functionality for this module."
    exit 0
fi

# Build the Docker image
docker build -t bundler .

docker run --name bundler-container bundler

docker cp bundler-container:/app/common_layer.zip .

docker rm -f bundler-container

# Check if the .zip file was created
if [ -f "common_layer.zip" ]; then
    echo "common_layer.zip file created successfully!"
else
    echo "Error: common_layer.zip file not found."
    exit 1
fi