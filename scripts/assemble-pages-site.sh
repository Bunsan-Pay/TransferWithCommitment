#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
site="${root}/_site"

rm -rf "${site}"
mkdir -p "${site}/demo"
cp -r "${root}/docs/dist/." "${site}/"
cp -r "${root}/demo/dist/." "${site}/demo/"
touch "${site}/.nojekyll"

echo "Assembled GitHub Pages site at ${site}"
