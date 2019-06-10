# QuasarDB datasource for Grafana

## Installing

```sh
cd <grafana-root>/data/plugins
git clone git@github.com:bureau14/qdb-grafana-plugin.git
```

Now start Grafana and add the QuasarDB datasource.

## Development

Requires [node](https://nodejs.org/en/)

Install dependencies with npm:

```sh
cd <grafana-root>/data/plugins
git clone https://github.com/bureau14/qdb-grafana-plugin.git
npm install
npm run build
```

Common commands:

```sh
npm run build
npm run start # Same as `yarn build`, but in watch mode
npm run test
npm run lint
```
