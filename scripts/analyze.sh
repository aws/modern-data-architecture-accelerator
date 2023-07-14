#!/bin/bash
set -e
echo "Running analyze script."

echo "Analyzing GitLab SAST reports"
python3 ./scripts/analyze_sast_reports.py ./reports

echo "Running Sonar Scanner"
python3 ./scripts/mergelcov.py
./scripts/sonar_scanner.sh $CI_COMMIT_REF_SLUG $SONAR_SERVER $SONAR_LOGIN true





