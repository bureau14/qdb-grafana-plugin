QuasarDB datasource for Grafana
===============================

Installing
----------

```sh
cd <grafana-root>/data/plugins
git clone -b dev https://github.com/bureau14/qdb-grafana-plugin.git
```

Now start Grafana and add the QuasarDB datasource.

Development
-----------

Requires [node](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/).

Install dependencies with yarn:

```sh
cd <grafana-root>/data/plugins
git clone https://github.com/bureau14/qdb-grafana-plugin.git
yarn && yarn build
```

Common commands:

```sh
yarn build
yarn start # Same as `yarn build`, but in watch mode
yarn test
yarn lint
```
