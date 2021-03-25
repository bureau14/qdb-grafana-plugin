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
go get -d github.com/magefile/mage

ls -l $GOPATH/src/github.com/magefile

cd $GOPATH/src/github.com/magefile/mage
go run bootstrap.go
