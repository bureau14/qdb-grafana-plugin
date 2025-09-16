#!/usr/bin/env bash

rm qdb-grafana-plugin.zip || true
mv dist qdb-grafana-plugin
zip -vr qdb-grafana-plugin quasardb-datasource
