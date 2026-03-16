#!/bin/bash
set -e

echo "Merging coverage reports"
python3 ./scripts/mergelcov.py

echo "Running Sonar Scanner"
export SONAR_SCANNER_JAVA_OPTS="-Xmx1024m"
sonar-scanner \
  -Dsonar.projectKey=${SONAR_PROJECT_KEY:-${CI_PROJECT_PATH_SLUG}} \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.qualitygate.wait=true \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.token=${SONAR_LOGIN} \
  -Dsonar.sourceEncoding=utf-8
