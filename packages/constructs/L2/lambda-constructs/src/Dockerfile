FROM amazonlinux:2023

# Install necessary packages
RUN yum install -y python3.12 python3.12-pip zip

# Set the working directory
WORKDIR /app

# Copy the requirements.txt file
COPY requirements.txt .

# Install the Python dependencies
RUN pip3.12 install --no-cache-dir --platform manylinux2014_x86_64 --only-binary=:all: -r requirements.txt -t python

# Create boto3_layer directory
RUN mkdir -p python/boto3_layer

# Package the dependencies into a .zip file
RUN zip -r 1.36.11.zip python

# Copy the zip file to boto3_layer
RUN cp 1.36.11.zip python/boto3_layer/
