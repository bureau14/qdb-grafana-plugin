#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/commands.sh"

echo "Installing version: $NODE_VERSION -- arch: $NODE_ARCH";

nvm_load
nvm install $NODE_VERSION $NODE_ARCH

source "$SCRIPT_DIR/configure.sh"

nvm_use
npm_config

rm -Rf $GOPATH || true

mkdir $GOPATH || true
rm $GOPATH/go.mod || true

${NPM} install --global yarn
${YARN} install

rm -Rf $GOPATH/src/github.com/magefile

cd $GOPATH

# go get -d github.com/magefile/mage

# BASE_DIR=$GOPATH/src

# if [ ! -d $BASE_DIR ] ; then
    # BASE_DIR=$GOPATH/pkg/mod
# fi

# ls -l $BASE_DIR/github.com/magefile

# cd $BASE_DIR/github.com/magefile/mage*
# go run bootstrap.go

# Clone whole repository at the latest master branch.
# git clone https://github.com/magefile/mage

# Clone a precise tag.
git clone --depth 1 -b v1.14.0 https://github.com/magefile/mage

cd mage
go run bootstrap.go
