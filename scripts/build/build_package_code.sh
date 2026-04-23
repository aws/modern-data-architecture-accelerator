#!/bin/bash
set -e

# Compiles TypeScript for an MDAA package (core code only).
# No schema generation, no documentation — just tsc.
#
# This is the minimal build needed to produce runnable JS from a package.
# Used by the CLI at deploy time to build local modules without the overhead
# of schema generation and documentation that build_package.sh performs.
#
# Must be run from the package root directory.

tsc
