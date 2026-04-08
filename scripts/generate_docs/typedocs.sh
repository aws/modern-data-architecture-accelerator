#!/bin/bash
set -e

echo "Generating TypeDocs..."
npx typedoc --out target/docs/typedocs/
echo "TypeDocs generated."
