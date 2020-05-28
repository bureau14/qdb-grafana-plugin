#!/bin/bash

set -eux

SCRIPT_DIR="$(cd "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null && pwd)"
source "$SCRIPT_DIR/binaries.sh"

function count_instances {
    local instances_count=$(($(ps aux | grep qdb_rest | grep -v "grep" | wc -l)))
    echo ${instances_count}
}

function qdb_rest_start {
    local args=$1; shift
    local output=$1; shift
    local err_output=$1; shift

    echo "Starting ${QDB_REST} with args: ${args}"
    echo "Redirecting output to ${output}"
    echo "Redirecting error output to ${err_output}"

    $QDB_REST ${args} 1>${output} 2>${err_output} &
}

function check_address {
    local address=$1;shift
    case "$(uname)" in
        MINGW*)
            local pid=$(NETSTAT.EXE -an -o | grep $address | grep "LISTENING" | tr -s [:space:] | cut -d' ' -f6)
            if [[ $pid != "" ]]; then
                ps aux | grep $pid | grep qdb_rest
            fi
        ;;
        FreeBSD*)
            sockstat -l | grep $address | tr -s [:space:] | cut -d' ' -f2
        ;;
        *)
            lsof -i -n -P | grep $address | grep LISTEN | cut -d' ' -f1
        ;;
    esac
    echo ""
}

function kill_instances {
    echo "Killing ${QDB_REST_FILENAME} instances..."
    case "$(uname)" in
        MINGW*)
            # we need double slashes for the flag to be recognized
            # a simple slash would cause this error: Invalid argument/option - 'C:/Program Files/Git/IM'.
            #
            # See http://www.mingw.org/wiki/Posix_path_conversion
            Taskkill //IM ${QDB_REST_FILENAME} //F || true
        ;;
        *)
            pkill -SIGKILL -f ${QDB_REST_FILENAME} || true
        ;;
    esac
    sleep 5
    if [[ $(($(count_instances))) != 0 ]]; then
        echo "Could not kill all instances, aborting..."
        exit 1
    fi
}
