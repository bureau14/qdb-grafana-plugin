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

# configure build environment

NODE_VERSION=${NODE_VERSION:-"22"}
NVM_DIR=${NVM_DIR:-"$HOME/.nvm"}

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source $NVM_DIR/nvm.sh
nvm install $NODE_VERSION

node -v

export NODEJS="${NODEJS}"
export NODE_GYP="${NODE_GYP}"
export NPM="${NPM}"
export YARN="${YARN}"

export NODE_OPTIONS=--openssl-legacy-provider
