#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

# Commands we expect to exist
NODEJS=${NODEJS_CMD:-"nodejs"}
NODE_GYP=${NODE_GYP_CMD:-"node-gyp"}
NPM=${NPM_CMD:-"npm"}
YARN=${YARN_CMD:-"yarn"}

case "$(uname)" in
    MINGW*)
        ${NPM} config set msvs_version 2017
        ;;
    *)
        echo "Nothing to do"
        ;;
esac

export NODEJS="${NODEJS}"
export NODE_GYP="${NODE_GYP}"
export NPM="${NPM}"
export YARN="${YARN}"

export NODE_OPTIONS=--openssl-legacy-provider
