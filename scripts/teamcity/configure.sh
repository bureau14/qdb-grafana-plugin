#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

NPM=$(command -v npm)

case "$(uname)" in
    MINGW*)
        ${NPM} config set msvs_version 2017
        ;;
    *)
        echo "Nothing to do"
        ;;
esac

export NPM="${NPM}"
