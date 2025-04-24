#!/bin/bash
set -e
DOCS_BRANCH=$1
DEPLOY_TARGET=$2  # Expected values: 'github' or 'gitlab'

export CURRENT_VERSION=$(jq -r .version < lerna.json)
export CURRENT_MAJOR=$(cut -d'.' -f1 <<<"$CURRENT_VERSION")
export CURRENT_MINOR=$(cut -d'.' -f2 <<<"$CURRENT_VERSION")

#Publish docs without the patch version
export PUBLISHED_VERSION="${CURRENT_MAJOR}.${CURRENT_MINOR}"

# Ensure target/docs exists but is empty
rm -rf target/docs*;mkdir -p target/docs/

# Generate Config Schema Docs
# Generate CLI Schema Doc
generate-schema-doc --config-file ./scripts/jsfh-conf.yaml ./packages/cli/lib/config-schema.json ./packages/cli/SCHEMA.md

# Generate Module Schema Docs
find ./packages/apps/ -name config-schema.json -execdir generate-schema-doc --config-file ../../../../../scripts/jsfh-conf.yaml {} ../SCHEMA.md ';'

# Generate TypeDocs
npx typedoc --out target/docs/typedocs/

# Copy all markdown and doc png images to target/docs dir (mkdocs needs everything in one spot)
rsync -zarvm --exclude="*node_modules*" --exclude="*coverage*" --include="*/" --include="*.md" --include="*.png" --include="*.css" --include=".pages" --include="*.yaml" --include="*.yml" --include="*.tf" --exclude="*" . target/docs/

# Build using mkdocs from root directory
mkdocs build --config-file mkdocs.yml --site-dir target/docs_site

# Function to deploy to GitLab Pages
deploy_gitlab() {
    if [ -z "$CI_GROUP_TOKEN" ] || [ -z "$CI_SERVER_HOST" ] || [ -z "$CAEF_DOCS_PROJECT_PATH" ]; then
        echo "Error: Required GitLab CI variables are not set"
        exit 1
    fi
    
    # Setup GitLab remote
    git remote add docs_publish "https://gitlab-ci-token:$CI_GROUP_TOKEN@$CI_SERVER_HOST/$CAEF_DOCS_PROJECT_PATH.git/"
    git fetch docs_publish

    # Deploy using mike for GitLab
    mike deploy -u -r docs_publish -b "$DOCS_BRANCH" "$PUBLISHED_VERSION" latest --push
    mike set-default "$PUBLISHED_VERSION" -r docs_publish -b "$DOCS_BRANCH" --push
    
    # Cleanup
    git remote remove docs_publish
}

# Function to deploy to GitHub Pages
deploy_github() {
    # No mike commands needed for GitHub Pages
    # The actions/deploy-pages action will handle the deployment

    echo "Documentation built successfully for GitHub Pages deployment"
}

# Main deployment logic
case "$DEPLOY_TARGET" in
    "gitlab")
        echo "Deploying to GitLab Pages..."
        deploy_gitlab
        ;;
    "github")
        echo "Deploying to GitHub Pages..."
        deploy_github
        ;;
    *)
        echo "Error: Invalid deployment target. Use 'github' or 'gitlab'"
        exit 1
        ;;
esac