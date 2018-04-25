QuasarDB datasource for Grafana
===============================


Installing (for now)
--------------------

Requires [node](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/).

Requires `qdbd` and `qdb_httpd` to be running on localhost using their default
ports.

```sh
cd <grafana-root>/data/plugins
git clone -b dev git@github.com:bureau14/qdb-grafana-plugin.git
yarn && yarn build
```

Now start Grafana.
