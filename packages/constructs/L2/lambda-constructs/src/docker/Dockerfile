FROM amazonlinux:2023

# Install necessary packages
RUN yum install -y python3.12 python3.12-pip zip

# Set the working directory
WORKDIR /asset

# Copy the requirements.txt file
COPY requirements.txt ./requirements.txt

# Install the Python dependencies
RUN mkdir -p python/ && \
    pip3.12 install --no-cache-dir --platform manylinux2014_x86_64 --only-binary=:all: -r ./requirements.txt -t python

