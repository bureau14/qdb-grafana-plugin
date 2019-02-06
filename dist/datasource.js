"use strict";

System.register([], function (_export, _context) {
  "use strict";

  var _extends, _createClass, Datasource;

  function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    } else {
      return Array.from(arr);
    }
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [],
    execute: function () {
      _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      Datasource = function () {
        function Datasource(instanceSettings, $q, backendSrv, templateSrv) {
          var _this = this;

          _classCallCheck(this, Datasource);

          this.login = function () {
            return _this.backendSrv.datasourceRequest({
              url: _this.url + "/api/login",
              method: 'POST',
              data: "{ \"username\": \"" + _this.username + "\", \"secret_key\": \"" + _this.usersecret + "\" }",
              headers: {
                'Content-Type': 'application/json'
              }
            }).then(function (result) {
              _this.token = result.data;
              _this.token_expiry = Date.now() + 10 /*hours*/ * 60 /*minutes*/ * 60 /*seconds*/ * 1000 /*milliseconds*/;
              var status = 'success';
              var message = 'QuasarDB connection is OK!';

              return { status: status, message: message };
            }).catch(function (err) {
              var status = 'error';
              var message = 'Unable to connect to datasource. ' + 'See console for detailed information.';

              if ("production" !== 'test') {
                // eslint-disable-next-line no-console
                console.error('QDB CONNECTION ERROR:', err);
              }

              return { status: status, message: message };
            });
          };

          this.checkToken = function () {
            if (_this.token == "" || _this.token_expiry - Date.now() < 1000) {
              var status = "";
              var message = "";
              status, message = _this.login();
              if (status == 'error') {
                return { status: status, message: message };
              }
            }
          };

          this.doQuery = function (query) {
            return _this.backendSrv.datasourceRequest({
              url: _this.url + "/api/query",
              method: 'POST',
              data: "\"" + query + "\"",
              headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + _this.token
              }
            });
          };

          this.doQueries = function (queries) {
            return Promise.all(queries.map(_this.doQuery));
          };

          this.getVariables = function (options) {
            var toValue = function toValue(x) {
              return {
                text: x,
                value: x
              };
            };

            var replaceInterval = function replaceInterval(x) {
              return x.slice(-1) === 'm' ? x + "in" : x;
            };

            var range = {
              from: options.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss'),
              to: options.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss')
            };

            var vars = {
              __from: range.from,
              __to: range.to,
              __range: "range(" + range.from + ", " + range.to + ")"
            };

            if (options.scopedVars && options.scopedVars.__interval) {
              var value = options.scopedVars.__interval.value;

              vars.__interval = replaceInterval(value);
            }

            return _extends({}, options.scopedVars, Object.keys(vars).map(function (key) {
              return _defineProperty({}, key, toValue(vars[key]));
            }).reduce(function (x, y) {
              return _extends({}, y, x);
            }, {}));
          };

          this.name = instanceSettings.name;
          this.id = instanceSettings.id;

          this.url = instanceSettings.jsonData.url;
          this.securityEnabled = instanceSettings.jsonData.securityEnabled;
          this.username = this.securityEnabled && instanceSettings.jsonData.name ? instanceSettings.jsonData.name : "";
          this.username = this.securityEnabled && instanceSettings.jsonData.usersecret ? instanceSettings.jsonData.usersecret : "";

          this.token = "";
          this.token_expiry = Date.now();

          this.$q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
        }

        // ---------------------------------------------------------------------------


        _createClass(Datasource, [{
          key: "query",
          value: function query(options) {
            var _this2 = this;

            this.checkToken();
            var transformResponse = function transformResponse(response) {
              var result = response.data;
              if (result.tables.length === 0) {
                return [];
              }
              var table = result.tables[0];
              var timestamps = table.columns[0].data;

              var target = table.columns[1].name;
              var datapoints = table.columns[1].data.map(function (value, idx) {
                return [value, Date.parse(timestamps[idx])];
              });

              return [{ target: target, datapoints: datapoints }];
            };

            var transformAll = function transformAll(results) {
              var data = results.map(transformResponse).reduce(function (a, b) {
                return [].concat(_toConsumableArray(a), _toConsumableArray(b));
              }, []);
              return { data: data };
            };

            var variables = this.getVariables(options);
            var queries = options.targets.filter(function (x) {
              return !x.hide && x.rawSql;
            }).map(function (x) {
              return _this2.templateSrv.replace(x.rawSql, variables);
            });

            if (!queries.length) {
              var data = [];
              return this.$q.when({ data: data });
            }

            return this.doQueries(queries).then(transformAll);
          }
        }, {
          key: "annotationQuery",
          value: function annotationQuery(options) {
            this.checkToken();
            var transformResponse = function transformResponse(response) {
              if (!response.data.tables.length) {
                return [];
              }

              var data = response.data.tables[0];

              return data.columns.map(function (column) {
                var annotation = options.annotation;
                var title = column.name.title;
                var text = column.name.text;
                var tags = [].tags;


                var time = Date.parse(data.columns[0].data[0]);

                return { annotation: annotation, time: time, title: title, text: text, tags: tags };
              });
            };

            var rawQuery = options.annotation.query;

            if (!rawQuery) {
              var message = 'Query missing in annotation definition';
              return this.$q.reject({ message: message });
            }

            var variables = this.getVariables(options);
            var query = this.templateSrv.replace(rawQuery, variables);

            return this.doQuery(query).then(transformResponse);
          }
        }, {
          key: "metricFindQuery",
          value: function metricFindQuery(query) {
            console.log('metricFindQuery:', query);
            throw new Error('metricFindQuery is not yet implemented.');
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            return this.login();
          }
        }]);

        return Datasource;
      }();

      _export("default", Datasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map