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

# Select node version and make sure that yarn is included
NVM_DIR=${NVM_DIR:-"$HOME/.nvm"}
NODE_VERSION=${NODE_VERSION:-"16"}

source "$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
npm install --global yarn

# install nodejs dependencies
${YARN} install

# Mage invokes `go` internally, so the agent-provided Go toolchain must be on PATH.
export PATH="${GOROOT:+${GOROOT}/bin:}${GOPATH:+${GOPATH}/bin:}${PATH}"
GO="${GOROOT:+${GOROOT}/bin/go}"
GO="${GO:-go}"

# export variables for build scripts
export NODEJS="${NODEJS}"
export NODE_GYP="${NODE_GYP}"
export NPM="${NPM}"
export YARN="${YARN}"
export GO

if NODE_VERSION=$(node -v | sed 's/v\([0-9]*\).*/\1/'); [ "$NODE_VERSION" -gt 17 ]; then
    export NODE_OPTIONS=--openssl-legacy-provider
fi
