#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/common.sh"

${YARN} test

# Integration tests: the live qdb_rest started by scripts/tests/rest-setup
# against the cluster seeded there (pkg/integration_test.go).
QDB_REST_URI="http://127.0.0.1:40080" ${GO} test -tags integration -count=1 -v ./pkg/...
