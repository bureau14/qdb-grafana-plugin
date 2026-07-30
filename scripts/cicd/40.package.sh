#!/usr/bin/env bash

set -eu

rm qdb-grafana-plugin.zip || true
mv dist quasardb-datasource

# The validator requires directories to be traversable and regular files to be at least 0744
find quasardb-datasource -type d -exec chmod 0755 {} +
find quasardb-datasource -type f -exec chmod 0744 {} +
find quasardb-datasource -maxdepth 1 -type f -name 'gpx_qdb-grafana-plugin_*' -exec chmod 0755 {} +
zip -vr qdb-grafana-plugin quasardb-datasource
