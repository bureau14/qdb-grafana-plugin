set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/commands.sh"

echo "Installing version: $NODE_VERSION -- arch: $NODE_ARCH";

nvm_load
nvm install $NODE_VERSION $NODE_ARCH

source "$SCRIPT_DIR/configure.sh"

nvm_use
npm_config


rm $GOPATH/go.mod
rm -Rf $GOPATH/src/github.com/magefile
go get -u -d github.com/magefile/mage
cd $GOPATH/src/github.com/magefile/mage
go run bootstrap.go

${NPM} install --global yarn
