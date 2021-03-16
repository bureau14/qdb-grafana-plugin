rm qdb-grafana-plugin.zip || true
ls dist/
zip -h
echo "----------------"
zip -vr qdb-grafana-plugin dist
ls qdb-grafana-plugin.zip