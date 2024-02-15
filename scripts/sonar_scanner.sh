#!/bin/bash
set -e
PROJECT_KEY=$1
SONAR_SERVER=$2
SONAR_LOGIN=$3
QUALITY_WAIT=$4
export SONAR_SCANNER_OPTS="-Xmx1024m"
sonar-scanner \
  -Dsonar.projectKey=${PROJECT_KEY} \
  '-Dsonar.inclusions=packages/**/lib/**/*.ts' \
  '-Dsonar.exclusions=**.d.ts **.js, **/test/**, **.py, **/bin/**, **/node_modules/**' \
  -Dsonar.javascript.lcov.reportPaths=./coverage/merged_lcov.info \
  -Dsonar.qualitygate.wait=${QUALITY_WAIT} \
  -Dsonar.host.url=${SONAR_SERVER} \
  -Dsonar.login=${SONAR_LOGIN} \
  -Dsonar.sourceEncoding=utf-8