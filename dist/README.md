# QuasarDB for Grafana

## Introduction

[QuasarDB](https://www.quasardb.net/why-quasardb/) is a high performance, limitless, time series database built to handle the most demanding use cases.

This is the official QuasarDB Grafana Data Source plugin. It extends QuasarDB’s support to allow integration with the Grafana analytics and monitoring platform.

![QDB Grafana Dashboard](https://doc.quasardb.net/master/_images/qdb_grafana_dash.png)


## Prerequisites
This documentation assumes you have:

* Grafana [installed](https://grafana.com/docs/) and running.
* Both the QuasarDB daemon `qdbd` and the REST API `qdb_rest` running.

## Installation
The easiest way to install the plugin is via the Grafana CLI

```
grafana-cli --pluginUrl https://github.com/bureau14/qdb-grafana-plugin/archive/3.4.0.zip plugins install qdb-grafana-datasource
```

Alternatively, you can clone the git repository to your Grafana plugins directory (this is usually `/var/lib/grafana/plugins` on Linux-based systems)

```
cd /var/lib/grafana/plugins
git clone https://github.com/bureau14/qdb-grafana-plugin.git
```

Finally, restart your Grafana server and the plugin will be added automatically.

## Configuration

Navigate your web browser to Grafana’s datasource configuration, and click Add data source. You will see QuasarDB as one of the available data sources.

```
Note:
It is recommended to leave Access set to Server (Default) unless you specifically know otherwise.
```

If your cluster is not secured you just need to fill in the REST API URL (default is [http://localhost:40080](http://localhost:40080)) into the URL field as shown below:

![Unsecured Configuration](https://doc.quasardb.net/master/_images/qdb_grafana_plugin_configuration_unsecured.png)

If your cluster is secured make sure to use the secure REST API URL (default is [https://localhost:40493](https://localhost:40493)) when filling in the URL field.

```
Note:
You may need to check Skip TLS Verify under Auth settings if you are using a self-signed TLS certificate.
```

Check the Use Secure Cluster checkbox and fill in the User name and User secret fields using the information found in your user private key file as shown below:

![Unsecured Configuration](https://doc.quasardb.net/master/_images/qdb_grafana_plugin_configuration_secured.png)

After you are done, click Save & Test and you are ready to starting creating visualizations using QuasarDB.

## Usage

You can add a visualization using QuasarDB by selecting the QuasarDB Data Source when creating a new visualization.

```
Note:
Which result format you need will be specified by the visualization you are using, but Time series is a most common format.
```

When defining a query for your visualization you should specify whether you was like to format the result as either `Time series` or a `Table` by selecting an option from the `FORMAT AS` dropdown in the query editor as shown below:

![Query Editor Format As](https://doc.quasardb.net/master/_images/qdb_grafana_query.png)

In additional to normal query syntax you can use the `$__range` and `$__interval` variables provided by Grafana.

For example the query:

```
SELECT * FROM stocks.apple IN RANGE(2007, 2008) GROUP BY 1h
```

Could be written to use Grafana's variables like this:

```
SELECT * FROM stocks.apple IN $__range GROUP BY $__interval
```

For information on query syntax see our [docs](https://doc.quasardb.net/master/queries/select.html) for more information.


## Troubleshooting

If you have any problems or suggestions please don't hesitate to contact us at [support@quasardb.net](mailto:support@quasardb.net)