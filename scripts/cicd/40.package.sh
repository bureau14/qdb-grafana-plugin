#!/usr/bin/env bash

rm qdb-grafana-plugin.zip || true
mv dist quasardb-datasource
zip -vr qdb-grafana-plugin quasardb-datasource
