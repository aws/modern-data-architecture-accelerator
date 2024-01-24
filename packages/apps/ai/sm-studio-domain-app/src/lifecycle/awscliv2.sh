#!/bin/sh
pip install -y awscliv2
pip uninstall -y awscli
awsv2 --install
ln -s /opt/conda/bin/awsv2 /opt/conda/bin/aws