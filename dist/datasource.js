'use strict';

System.register([], function (_export, _context) {
  "use strict";

  var _slicedToArray, _createClass, _extends, Datasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
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

  function zipObject(keys, values) {
    var reducer = function reducer(acc, key, idx) {
      return _extends({}, acc, _defineProperty({}, key, values[idx]));
    };

    return keys.reduce(reducer, {});
  }

  return {
    setters: [],
    execute: function () {
      _slicedToArray = function () {
        function sliceIterator(arr, i) {
          var _arr = [];
          var _n = true;
          var _d = false;
          var _e = undefined;

          try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
              _arr.push(_s.value);

              if (i && _arr.length === i) break;
            }
          } catch (err) {
            _d = true;
            _e = err;
          } finally {
            try {
              if (!_n && _i["return"]) _i["return"]();
            } finally {
              if (_d) throw _e;
            }
          }

          return _arr;
        }

        return function (arr, i) {
          if (Array.isArray(arr)) {
            return arr;
          } else if (Symbol.iterator in Object(arr)) {
            return sliceIterator(arr, i);
          } else {
            throw new TypeError("Invalid attempt to destructure non-iterable instance");
          }
        };
      }();

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

      Datasource = function () {
        function Datasource(instanceSettings, $q, backendSrv, templateSrv) {
          var _this = this;

          _classCallCheck(this, Datasource);

          this.doQuery = function (query) {
            return _this.backendSrv.datasourceRequest({
              url: _this.url + '/query_exp?query=' + encodeURIComponent(query) + '&date_format=js',
              method: 'GET'
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
              return x.slice(-1) === 'm' ? x + 'in' : x;
            };

            var range = {
              from: options.range.from.format('YYYY-MM-DD[T]HH:mm:ss'),
              to: options.range.to.format('YYYY-MM-DD[T]HH:mm:ss')
            };

            var vars = {
              __from: range.from,
              __to: range.to,
              __range: 'range(' + range.from + ', ' + range.to + ')'
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

          this.url = instanceSettings.url;

          this.$q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
        }

        // ---------------------------------------------------------------------------

        _createClass(Datasource, [{
          key: 'query',
          value: function query(options) {
            var _this2 = this;

            var transformResponse = function transformResponse(response) {
              var tables = response.data.tables;

              var results = tables[0] ? tables[0].results : [];

              var target = 'select metric';
              var datapoints = results.map(function (_ref2) {
                var _ref3 = _slicedToArray(_ref2, 2),
                    date = _ref3[0],
                    sum = _ref3[1];

                return [sum, Date.parse(date)];
              });

              return { target: target, datapoints: datapoints };
            };

            var transformAll = function transformAll(results) {
              var data = results.map(transformResponse);
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
          key: 'annotationQuery',
          value: function annotationQuery(options) {
            var transformResponse = function transformResponse(response) {
              if (!response.data.tables.length) {
                return [];
              }

              var data = response.data.tables[0];
              var keys = data.columns_names;

              return data.results.map(function (result) {
                var obj = zipObject(keys, result);

                var annotation = options.annotation;
                var title = obj.title,
                    text = obj.text;


                var time = Date.parse(obj.timestamp);
                var tags = obj.tags ? obj.tags.trim().split(/\s*,\s*/) : [];

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
          key: 'metricFindQuery',
          value: function metricFindQuery(query) {
            console.log('metricFindQuery:', query);
            throw new Error('metricFindQuery is not yet implemented.');
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            return this.backendSrv.datasourceRequest({
              url: this.url + '/global_status',
              method: 'GET'
            }).then(function () {
              var status = 'success';
              var message = 'QuasarDB connection is OK!';

              return { status: status, message: message };
            }).catch(function (err) {
              var status = 'error';
              var message = 'Unable to connect to datasource. ' + 'See console for detailed information.';

              if ('production' !== 'test') {
                // eslint-disable-next-line no-console
                console.error('QDB CONNECTION ERROR:', err);
              }

              return { status: status, message: message };
            });
          }
        }]);

        return Datasource;
      }();

      _export('default', Datasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map