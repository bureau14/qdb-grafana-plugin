#!/usr/bin/env bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

NPM=$(command -v npm)

case "$(uname)" in
    MINGW*)
        ${NPM} config set msvs_version 2017
        ;;
    *)
        ${NPM} config set python python3
        ;;
esac

export NPM="${NPM}"
