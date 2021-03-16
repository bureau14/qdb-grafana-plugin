set -eux

# Setup
SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/commands.sh"

echo "Installing version: $NODE_VERSION -- arch: $NODE_ARCH";

nvm_load
nvm install $NODE_VERSION $NODE_ARCH

source "$SCRIPT_DIR/configure.sh"

nvm_use
npm_config

# Install
npm install