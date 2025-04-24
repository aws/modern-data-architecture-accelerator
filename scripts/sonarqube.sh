#!/bin/bash
set -e

echo "Merging coverage reports"
python3 ./scripts/mergelcov.py

echo "Running Sonar Scanner"
export SONAR_SCANNER_OPTS="-Xmx1024m"
sonar-scanner \
  -Dsonar.projectKey=${CI_COMMIT_REF_SLUG} \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.login=${SONAR_LOGIN} \
  -Dsonar.sourceEncoding=utf-8



