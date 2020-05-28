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

## Testing

### Download:
*-${your_platform}-c-api.*!**/*=>qdb
*-${your_platform}-server.*!bin/*=>qdb/bin
*-${your_platform}-utils.*!bin/*=>qdb/bin
*-${your_platform}-rest.*!bin/*=>qdb/bin

### Test
Open a bash windows
```sh 
export LD_LIBRARY_PATH=qdb/lib # on linux
export PATH=`pwd`/qdb/bin:$PATH # on windows

# run the services
bash scripts/tests/setup/start-services.sh
bash scripts/tests/rest-setup/start-services.sh

# test
npm run test

# stop the services
bash scripts/tests/setup/stop-services.sh
bash scripts/tests/rest-setup/stop-services.sh
```

