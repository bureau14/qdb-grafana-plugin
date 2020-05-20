'use strict';

System.register([], function (_export, _context) {
  "use strict";

  var _extends, _createClass, _typeof, Datasource;

  function _asyncToGenerator(fn) {
    return function () {
      var gen = fn.apply(this, arguments);
      return new Promise(function (resolve, reject) {
        function step(key, arg) {
          try {
            var info = gen[key](arg);
            var value = info.value;
          } catch (error) {
            reject(error);
            return;
          }

          if (info.done) {
            resolve(value);
          } else {
            return Promise.resolve(value).then(function (value) {
              step("next", value);
            }, function (err) {
              step("throw", err);
            });
          }
        }

        return step("next");
      });
    };
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

  function transformValue(value) {
    if (typeof value == 'string') {
      var d = Date.parse(value);
      if (!isNaN(d)) {
        return d;
      }
      try {
        var v = window.atob(value);
        return v;
      } catch (error) {
        return value;
      }
    }
    return value;
  }

  _export('transformValue', transformValue);

  function transformResponse(response) {
    var maxDurationYear = Date.parse('1971-01-01');
    var result = response.data;
    if (result.tables.length === 0) {
      return [];
    }

    switch (response.data.format) {
      case 'table':
        {
          var table = result.tables[0];
          var colCount = table.columns.length;
          var rowCount = table.columns[0].data.length;
          var columns = table.columns.map(function (c, i) {
            var result = { text: c.name };
            if (c.data.length > 0) {
              var value = c.data[0];
              if (typeof value == 'string') {
                var d = Date.parse(value);
                if (d >= maxDurationYear) {
                  result.type = 'time';
                }
              }
            }
            return result;
          });
          var rows = [];
          for (var i = 0; i < rowCount; i++) {
            var row = [];
            for (var j = 0; j < colCount; j++) {
              var value = table.columns[j].data[i];
              row.push(transformValue(value));
            }
            rows.push(row);
          }

          return [{
            columns: columns,
            rows: rows,
            type: 'table'
          }];
        }
      default:
        {
          var _ret = function () {
            var table = result.tables[0];
            var timestamps = table.columns[0].data;

            var results = [];

            for (var _i = 1; _i < table.columns.length; _i++) {
              var target = table.columns[_i].name;
              var datapoints = table.columns[_i].data.map(function (value, idx) {
                return [transformValue(value), Date.parse(timestamps[idx])];
              });
              results.push({ target: target, datapoints: datapoints });
            }

            return {
              v: results
            };
          }();

          if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
    }
  }

  _export('transformResponse', transformResponse);

  function transformAll(results) {
    var data = results.map(transformResponse).reduce(function (a, b) {
      return [].concat(_toConsumableArray(a), _toConsumableArray(b));
    }, []);
    return { data: data };
  }

  _export('transformAll', transformAll);

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

      _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
      } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };

      Datasource = function () {
        function Datasource(instanceSettings, $q, backendSrv, templateSrv) {
          var _this = this;

          _classCallCheck(this, Datasource);

          this.doQuery = function (_ref) {
            var query = _ref.query,
                format = _ref.format;

            return _this.backendSrv.datasourceRequest({
              url: _this.url + '/api/query',
              method: 'POST',
              data: '{ "query" : "' + query + '" }',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _this.token }
            }).then(function (result) {
              result.data.format = format;
              return result;
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
              from: options.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss'),
              to: options.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss')
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

          var securityEnabled = instanceSettings.jsonData.securityEnabled;
          var username = securityEnabled ? instanceSettings.jsonData.name : 'anonymous';
          var usersecret = securityEnabled ? instanceSettings.jsonData.secret : '';

          this.name = instanceSettings.name;
          this.id = instanceSettings.id;
          this.url = instanceSettings.url;
          this.username = username;
          this.usersecret = usersecret;
          this.token = '';
          this.token_expiry = Date.now();

          this.$q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
        }

        _createClass(Datasource, [{
          key: 'login',
          value: function () {
            var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
              var result, status, message, _status, _message;

              return regeneratorRuntime.wrap(function _callee$(_context2) {
                while (1) {
                  switch (_context2.prev = _context2.next) {
                    case 0:
                      _context2.prev = 0;
                      _context2.next = 3;
                      return this.backendSrv.datasourceRequest({
                        url: this.url + '/api/login',
                        method: 'POST',
                        data: '{ "username": "' + this.username + '", "secret_key": "' + this.usersecret + '" }',
                        headers: {
                          'Content-Type': 'application/json'
                        }
                      });

                    case 3:
                      result = _context2.sent;


                      this.token = result.data.token;
                      this.token_expiry = Date.now() + 10 * 60 * 60 * 1000;

                      status = 'success';
                      message = 'QuasarDB connection is OK!';
                      return _context2.abrupt('return', { status: status, message: message });

                    case 11:
                      _context2.prev = 11;
                      _context2.t0 = _context2['catch'](0);
                      _status = 'error';
                      _message = 'Unable to connect to datasource. See console for detailed information.';


                      if ('production' !== 'dev') {
                        console.error('QDB CONNECTION ERROR:', _context2.t0);
                      }

                      return _context2.abrupt('return', { status: _status, message: _message });

                    case 17:
                    case 'end':
                      return _context2.stop();
                  }
                }
              }, _callee, this, [[0, 11]]);
            }));

            function login() {
              return _ref3.apply(this, arguments);
            }

            return login;
          }()
        }, {
          key: 'checkToken',
          value: function () {
            var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
              var result;
              return regeneratorRuntime.wrap(function _callee2$(_context3) {
                while (1) {
                  switch (_context3.prev = _context3.next) {
                    case 0:
                      if (!(this.token === '' || this.token_expiry - Date.now() < 1000)) {
                        _context3.next = 6;
                        break;
                      }

                      _context3.next = 3;
                      return this.login();

                    case 3:
                      result = _context3.sent;

                      if (!(result.status === 'error')) {
                        _context3.next = 6;
                        break;
                      }

                      throw new Error(result.message);

                    case 6:
                      return _context3.abrupt('return');

                    case 7:
                    case 'end':
                      return _context3.stop();
                  }
                }
              }, _callee2, this);
            }));

            function checkToken() {
              return _ref4.apply(this, arguments);
            }

            return checkToken;
          }()
        }, {
          key: 'query',
          value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(options) {
              var _this2 = this;

              var variables, queries, results, transformedResults;
              return regeneratorRuntime.wrap(function _callee3$(_context4) {
                while (1) {
                  switch (_context4.prev = _context4.next) {
                    case 0:
                      variables = this.getVariables(options);
                      queries = options.targets.filter(function (t) {
                        return !t.hide && t.rawSql;
                      }).map(function (t) {
                        return {
                          format: t.resultFormat,
                          query: _this2.templateSrv.replace(t.rawSql, variables)
                        };
                      });

                      if (queries.length) {
                        _context4.next = 4;
                        break;
                      }

                      return _context4.abrupt('return', { data: [] });

                    case 4:
                      _context4.next = 6;
                      return this.checkToken();

                    case 6:
                      _context4.next = 8;
                      return this.doQueries(queries);

                    case 8:
                      results = _context4.sent;
                      _context4.next = 11;
                      return transformAll(results);

                    case 11:
                      transformedResults = _context4.sent;
                      return _context4.abrupt('return', transformedResults);

                    case 13:
                    case 'end':
                      return _context4.stop();
                  }
                }
              }, _callee3, this);
            }));

            function query(_x) {
              return _ref5.apply(this, arguments);
            }

            return query;
          }()
        }, {
          key: 'annotationQuery',
          value: function annotationQuery(options) {
            throw new Error('annotations not yet implemented.');
          }
        }, {
          key: 'metricFindQuery',
          value: function metricFindQuery(query) {
            throw new Error('metrics not yet implemented.');
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            return this.login();
          }
        }]);

        return Datasource;
      }();

      _export('default', Datasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map