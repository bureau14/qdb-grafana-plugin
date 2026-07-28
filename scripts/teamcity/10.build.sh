#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/common.sh"

# Fix permission issue when using docker builds
git config --global --add safe.directory '*'

# cleanup GOPATH
rm -Rf $GOPATH || true
mkdir $GOPATH || true
rm $GOPATH/go.mod || true
rm -Rf $GOPATH/src/github.com/magefile

# install mage - tool that grafana plugins use for builds
pushd $PWD
cd $GOPATH
git clone --depth 1 -b v1.14.0 https://github.com/magefile/mage
cd mage
$GO run bootstrap.go
popd

# build plugin

export CGO_ENABLED=0

rm -Rf dist
$GOPATH/bin/mage -v

${YARN} build
