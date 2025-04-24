#!/bin/bash
#
# This script packages your project into a solution distributable that can be
# used as an input to the solution builder validation pipeline.
#
# Important notes and prereq's:
#   1. This script should be run from the repo's /deployment folder.
#
# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Install dependencies for the cdk-solution-helper; responsible for
#      converting standard 'npx cdk synth' output into solution assets.
#   3. Build and synthesize your cdk project.
#   4. Run the cdk-solution-helper on template outputs and organize
#      those outputs into the /global-s3-assets folder.
#   5. Organize source code artifacts into the /regional-s3-assets folder.
#   6. Remove any temporary files used for staging.
#
# Parameters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package
#-----------------------
# Formatting
bold=$(tput bold)
normal=$(tput sgr0)
#------------------------------------------------------------------------------
# SETTINGS
#------------------------------------------------------------------------------
template_format="json"
run_helper="true"

# run_helper is false for yaml - not supported
[[ $template_format == "yaml" ]] && {
    run_helper="false"
    echo "${bold}Solution_helper disabled:${normal} template format is yaml"
}

#------------------------------------------------------------------------------
# DISABLE OVERRIDE WARNINGS
#------------------------------------------------------------------------------
# Use with care: disables the warning for overridden properties on
# AWS Solutions Constructs
export overrideWarningsEnabled=false

#------------------------------------------------------------------------------
# Build Functions
#------------------------------------------------------------------------------
# Echo, execute, and check the return code for a command. Exit if rc > 0
# ex. do_cmd npm run build
usage()
{
    echo "Usage: $0 bucket solution-name version"
    echo "Please provide the base source bucket name, trademarked solution name, and version."
    echo "For example: ./build-s3-dist.sh mybucket my-solution v1.0.0"
    exit 1
}

do_cmd()
{
    echo "------ EXEC $*"
    $*
    rc=$?
    if [ $rc -gt 0 ]
    then
            echo "Aborted - rc=$rc"
            exit $rc
    fi
}

sedi()
{
    # cross-platform for sed -i
    sed -i $* 2>/dev/null || sed -i "" $*
}

# use sed to perform token replacement
# ex. do_replace myfile.json %%VERSION%% v1.1.1
do_replace()
{
    replace="s/$2/$3/g"
    file=$1
    do_cmd sedi $replace $file
}

create_template_json()
{
    # Run 'npx cdk synth' to generate raw solution outputs
    do_cmd cd $installer_dir
    do_cmd npm install
    do_cmd npx cdk synth --output=$staging_dist_dir

    # Remove unnecessary output files
    do_cmd cd $staging_dist_dir
    # ignore return code - can be non-zero if any of these does not exist
    rm -f tree.json manifest.json cdk.out

    # Move outputs from staging to template_dist_dir
    echo "Move outputs from staging to template_dist_dir"
    do_cmd mv $staging_dist_dir/*.template.json $template_dist_dir/

    # Rename all *.template.json files to *.template
    echo "Rename all *.template.json to *.template"
    echo "copy templates and rename"
    for f in $template_dist_dir/*.template.json; do
        mv -- "$f" "${f%.template.json}.template"
    done
}

create_template_installer_json()
{
    # Run 'npx cdk synth' to generate raw solution outputs
    do_cmd cd $installer_dir
    do_cmd npm install
    
    # Generate template with permission boundary
    do_cmd npx cdk synth --output=$staging_dist_dir --context use-permission-boundary=true
    do_cmd find $staging_dist_dir -name '*InstallerStack.template.json' -exec mv {} {}-CustomBp.template.json \;

    # Generate template with external pipeline
    do_cmd npx cdk synth --output=$staging_dist_dir --context use-external-pipeline-account=true
    do_cmd find $staging_dist_dir -name '*InstallerStack.template.json' -exec mv {} {}-ExternalPipeline.template.json \;

    # Generate default template
    do_cmd npx cdk synth --output=$staging_dist_dir
    
    # Remove unnecessary output files
    do_cmd cd $staging_dist_dir
    # ignore return code - can be non-zero if any of these does not exist
    rm -f tree.json manifest.json cdk.out

    # Move outputs from staging to template_dist_dir
    echo "Move outputs from staging to template_dist_dir"
    do_cmd mv $staging_dist_dir/*.template.json* $template_dist_dir/

    # Rename all *.template.json*.template.json to *.template
    echo "Rename all *.template.json*.template.json to *.template"
    echo "copy templates and rename"
    for f in $template_dist_dir/*.template.json-*.template.json; do
        if [ -f "$f" ]; then
            newname=$(echo "$f" | sed -E 's/\.template\.json-/-/; s/\.json$//')
            mv -- "$f" "$newname"
        fi
    done
    
    # Rename standard template files
    for f in $template_dist_dir/*.template.json; do
        if [ -f "$f" ]; then
            mv -- "$f" "${f%.template.json}.template"
        fi
    done
}

create_template_yaml()
{
    # Assumes current working directory is where the cdk is defined
    # Output YAML - this is currently the only way to do this for multiple templates
    maxrc=0
    for template in `npx cdk list`; do
        echo Create template $template
        do_cmd npx cdk synth $template > ${template_dist_dir}/${template}.template
        if [[ $? > $maxrc ]]; then
            maxrc=$?
        fi
    done
}

cleanup_temporary_generted_files()
{
    echo "------------------------------------------------------------------------------"
    echo "${bold}[Cleanup] Remove temporary files${normal}"
    echo "------------------------------------------------------------------------------"

    # Delete the temporary /staging folder
    do_cmd rm -rf $staging_dist_dir
}

fn_exists()
{
    exists=`LC_ALL=C type $1`
    return $?
}

#------------------------------------------------------------------------------
# INITIALIZATION
#------------------------------------------------------------------------------
# solution_config must exist in the deployment folder (same folder as this
# file) . It is the definitive source for solution ID, name, and trademarked
# name.
#
# Example:
#
# SOLUTION_ID='SO0320'
# SOLUTION_NAME='Modern Data Architecture Accelerator'
# SOLUTION_TRADEMARKEDNAME='modern-data-architecture-accelerator'
# SOLUTION_VERSION='v1.0.0' # optional
if [[ -e './solution_config' ]]; then
    source ./solution_config
else
    echo "solution_config is missing from the solution root."
    exit 1
fi

if [[ -z $SOLUTION_ID ]]; then
    echo "SOLUTION_ID is missing from ../solution_config"
    exit 1
else
    export SOLUTION_ID
fi

if [[ -z $SOLUTION_NAME ]]; then
    echo "SOLUTION_NAME is missing from ../solution_config"
    exit 1
else
    export SOLUTION_NAME
fi

if [[ -z $SOLUTION_TRADEMARKEDNAME ]]; then
    echo "SOLUTION_TRADEMARKEDNAME is missing from ../solution_config"
    exit 1
else
    export SOLUTION_TRADEMARKEDNAME
fi

if [[ ! -z $SOLUTION_VERSION ]]; then
    export SOLUTION_VERSION
fi

#------------------------------------------------------------------------------
# Validate command line parameters
#------------------------------------------------------------------------------
# Validate command line input - must provide bucket
[[ -z $1 ]] && { usage; exit 1; } || { SOLUTION_BUCKET=$1; }

# Environmental variables for use in cdk
export DIST_OUTPUT_BUCKET=$SOLUTION_BUCKET

# Version from the command line is definitive. Otherwise, use, in order of precedence:
# - SOLUTION_VERSION from solution_config
# - version.txt
#
# Note: Solutions Pipeline sends bucket, name, version. Command line expects bucket, version
# if there is a 3rd parm then version is $3, else $2
#
# If confused, use build-s3-dist.sh <bucket> <version>
if [ ! -z $3 ]; then
    version="$3"
elif [ ! -z "$2" ]; then
    version=$2
elif [ ! -z $SOLUTION_VERSION ]; then
    version=$SOLUTION_VERSION
elif [ -e ../source/version.txt ]; then
    version=$(cat ../source/version.txt)
else
    echo "Version not found. Version must be passed as an argument or in version.txt in the format vn.n.n"
    exit 1
fi
SOLUTION_VERSION=$version

# SOLUTION_VERSION should be vn.n.n
if [[ $SOLUTION_VERSION != v* ]]; then
    echo prepend v to $SOLUTION_VERSION
    SOLUTION_VERSION=v${SOLUTION_VERSION}
fi

export SOLUTION_VERSION=$version

#-----------------------------------------------------------------------------------
# Get reference for all important folders
#-----------------------------------------------------------------------------------
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../packages"
installer_dir="$source_dir/../installer"

echo "------------------------------------------------------------------------------"
echo "${bold}[Init] Remove any old dist files from previous runs${normal}"
echo "------------------------------------------------------------------------------"

do_cmd rm -rf $template_dist_dir
do_cmd mkdir -p $template_dist_dir
do_cmd rm -rf $build_dist_dir
do_cmd mkdir -p $build_dist_dir
do_cmd rm -rf $staging_dist_dir
do_cmd mkdir -p $staging_dist_dir


echo "------------------------------------------------------------------------------"
echo "${bold}[Init] Install dependencies for the cdk-solution-helper${normal}"
echo "------------------------------------------------------------------------------"

do_cmd cd $template_dir/cdk-solution-helper
do_cmd npm install

echo "------------------------------------------------------------------------------"
echo "${bold}[Synth] cdk Project${normal}"
echo "------------------------------------------------------------------------------"

echo "------------------------------------------------------------------------------"
echo "${bold}[Create] Templates${normal}"
echo "------------------------------------------------------------------------------"

if fn_exists create_template_${template_format}; then
    create_template_installer_${template_format}
else
    echo "Invalid setting for \$template_format: $template_format"
    exit 255
fi

echo "------------------------------------------------------------------------------"
echo "${bold}[Packing] Template artifacts${normal}"
echo "------------------------------------------------------------------------------"

# Run the helper to clean-up the templates and remove unnecessary cdk elements
echo "Run the helper to clean-up the templates and remove unnecessary cdk elements"
[[ $run_helper == "true" ]] && {
    echo "node $template_dir/cdk-solution-helper/index"
    node $template_dir/cdk-solution-helper/index
    if [ "$?" = "1" ]; then
    	echo "(cdk-solution-helper) ERROR: there is likely output above." 1>&2
    	exit 1
    fi
} || echo "${bold}Solution Helper skipped: ${normal}run_helper=false"

# Find and replace bucket_name, solution_name, and version
echo "Find and replace bucket_name, solution_name, and version"
cd $template_dist_dir
do_replace "*.template" %%BUCKET_NAME%% ${SOLUTION_BUCKET}
do_replace "*.template" %%SOLUTION_NAME%% ${SOLUTION_TRADEMARKEDNAME}
do_replace "*.template" %%VERSION%% ${SOLUTION_VERSION}
do_replace "*.template" %%PRODUCT_BUCKET%% ${TEMPLATE_OUTPUT_BUCKET}

echo "------------------------------------------------------------------------------"
echo "${bold}[Packing] Source code artifacts${normal}"
echo "------------------------------------------------------------------------------"

# Create a placeholder file in the regional-s3-assets directory
# This is needed because the original script expects assets but MDAA may not generate any
touch $build_dist_dir/temp-asset.file

# cleanup temporary generated files that are not needed for later stages of the build pipeline
cleanup_temporary_generted_files

# Return to original directory from when we started the build
cd $template_dir

echo "------------------------------------------------------------------------------"
echo "${bold}[Complete] Template generation complete${normal}"
echo "------------------------------------------------------------------------------"
echo "The CloudFormation template is available at: $template_dist_dir"
echo "A placeholder asset file was created at: $build_dist_dir/temp-asset.file"
