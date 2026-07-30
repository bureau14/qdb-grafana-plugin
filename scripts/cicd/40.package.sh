#!/usr/bin/env bash

set -eu

rm qdb-grafana-plugin.zip || true
mv dist quasardb-datasource

find quasardb-datasource -maxdepth 1 -type f -name 'gpx_qdb-grafana-plugin_*' -exec chmod 0755 {} +
echo 'Plugin executable permissions before packaging:'
find quasardb-datasource -maxdepth 1 -type f -name 'gpx_qdb-grafana-plugin_*' -printf '%m %p\n'
zip -vr qdb-grafana-plugin quasardb-datasource
echo 'Plugin executable permissions in archive:'
zipinfo -l qdb-grafana-plugin.zip 'quasardb-datasource/gpx_qdb-grafana-plugin_*'
