#!/bin/bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/configure.sh"

export CGO_ENABLED=0

rm -Rf dist
mage -v

${YARN} test -u

${YARN} build
