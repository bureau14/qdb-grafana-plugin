# Using QuasarDB from Grafana

## Requirements

In order to use the QuasarDB datasource you will need both the QDB server and rest api. See the [docs](https://doc.quasardb.net/master/tutorials/tut_quick.html) for getting started.

## Installation

Using the Grafana CLI tool:

```
grafana-cli plugins install qdb-grafana-datasource
```

Or manually

```
git clone https://github.com/bureau14/qdb-grafana-plugin/tree/<qdb-version> <path/to/grafana/plugins>
```

For example:

```
git clone https://github.com/bureau14/qdb-grafana-plugin/tree/3.4.0 /var/lib/grafana/plugins
```

Then restart Grafana

## Configuration

The configuration requires the url to a qdb_rest api server as well as a user name and secret. If your qdb server is running without security you can turn security off in which can an anonymous user will be used.

See the [security docs](https://doc.quasardb.net/master/tutorials/secured_cluster.html) for more information.

## Querying

Once you have successfully connected to the datasource you can perform regular QuasarDB queries. For information on query syntax see [here](https://doc.quasardb.net/master/queries/select.html) for more information.

## Troubleshooting

If you have any problems or suggestions please contact [support@quasardb.net](mailto:support@quasardb.net)
