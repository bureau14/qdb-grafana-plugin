#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/common.sh"

# Disable tracing before inspecting or assigning the token: xtrace would expose
# a pre-injected value as well as one retrieved from SSM.
set +x
if [[ -z "${GRAFANA_ACCESS_POLICY_TOKEN:-}" ]]; then
    echo "Loading Grafana plugin signing token from SSM parameter ${GRAFANA_PLUGIN_SIGNING_TOKEN_SSM_PARAM}"
    GRAFANA_ACCESS_POLICY_TOKEN="$(AWS_PAGER='' aws ssm get-parameter \
        --name "${GRAFANA_PLUGIN_SIGNING_TOKEN_SSM_PARAM}" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text)"
    export GRAFANA_ACCESS_POLICY_TOKEN
fi
set -x

${YARN} sign --rootUrls https://quasardb.net
"${NVM_BIN}/npx" @grafana/sign-plugin@3.2.0
