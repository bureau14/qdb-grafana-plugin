#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/common.sh"

${YARN} sign --rootUrls https://quasardb.net
npx @grafana/sign-plugin@3.2.0
