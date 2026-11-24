#!/bin/bash

set -xe

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Static config

URI_REST_SECURE="127.0.0.1:40443"
URI_REST_INSECURE="127.0.0.1:40080"
URI_REST_FLIGHT="127.0.0.1:40493"
URI_CLUSTER="qdb://127.0.0.1:2836"
CONSOLE_LOG_REST="rest_log.out.txt"
CONSOLE_ERR_LOG_REST="rest_log.err.txt"
