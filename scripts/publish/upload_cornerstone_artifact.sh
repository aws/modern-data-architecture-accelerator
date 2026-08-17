#!/bin/bash
set -e
# Uploads the packaged Cornerstone artifact with the object metadata Cornerstone reads.
# Usage: upload_cornerstone_artifact.sh <artifact-path> <bucket>
# Requires: CI_COMMIT_SHA, CI_COMMIT_REF_NAME, CI_COMMIT_TIMESTAMP, CI_COMMIT_AUTHOR,
#           CI_COMMIT_MESSAGE

ARTIFACT_PATH=$1
PACKAGE_BUCKET=$2

SOLUTION_ID=SO0320
SOLUTION_NAME=modern-data-architecture-accelerator
PACKAGE_NAME=ModernDataArchitectureAccelerator
# S3 caps user metadata at 2 KB; the commit message is the only unbounded value.
MAX_COMMIT_MESSAGE_LENGTH=512

[ -n "$ARTIFACT_PATH" ] || {
  echo "ERROR: artifact path argument is required" >&2
  exit 1
}
[ -n "$PACKAGE_BUCKET" ] || {
  echo "ERROR: bucket argument is required" >&2
  exit 1
}
[ -f "$ARTIFACT_PATH" ] || {
  echo "ERROR: artifact not found: $ARTIFACT_PATH" >&2
  exit 1
}

PUBLISHED_VERSION=v$(jq -r .version < package.json)

# CI_COMMIT_AUTHOR is "Name <email>"; Cornerstone wants just the email.
AUTHOR_EMAIL=$(printf '%s' "$CI_COMMIT_AUTHOR" | sed -n 's/.*<\(.*\)>.*/\1/p')
[ -n "$AUTHOR_EMAIL" ] || AUTHOR_EMAIL=unknown

# Metadata rides in HTTP headers, so fold to one line of printable ASCII.
COMMIT_MESSAGE=$(printf '%s' "$CI_COMMIT_MESSAGE" |
  tr '\n\r\t' '   ' |
  tr -cd ' -~' |
  tr -s ' ' |
  cut -c "1-$MAX_COMMIT_MESSAGE_LENGTH" |
  sed 's/^ //; s/ $//')

# JSON, not the CLI's key=value shorthand: the shorthand splits on every comma, so a commit
# message containing one parses as a list and fails ParamValidation.
METADATA=$(jq -nc \
  --arg package "$PACKAGE_NAME" \
  --arg commitId "$CI_COMMIT_SHA" \
  --arg solutionId "$SOLUTION_ID" \
  --arg solutionVersion "$PUBLISHED_VERSION" \
  --arg solutionName "$SOLUTION_NAME" \
  --arg commitauthor "$AUTHOR_EMAIL" \
  --arg publishpublicecrimage false \
  --arg commitmessage "$COMMIT_MESSAGE" \
  --arg committimestamp "$CI_COMMIT_TIMESTAMP" \
  --arg enablequicksight No \
  --arg branch "$CI_COMMIT_REF_NAME" \
  '$ARGS.named')

S3_URI="s3://$PACKAGE_BUCKET/$SOLUTION_ID/$PUBLISHED_VERSION/$CI_COMMIT_SHA/artifact.zip"

echo "Uploading Cornerstone artifact for version: $PUBLISHED_VERSION"
echo "Object metadata: $METADATA"

aws s3 cp "$ARTIFACT_PATH" "$S3_URI" --metadata "$METADATA"

echo "Published solution archive to $S3_URI"
