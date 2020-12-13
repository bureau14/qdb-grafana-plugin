'use strict';

System.register([], function (_export, _context) {
  "use strict";

  var _extends, _slicedToArray, _createClass, _typeof, atob, req, variableRegex, Datasource;

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

  function extractMacrosFunction(query, macro) {
    var macroStart = macro + '(';

    var fromIndex = 0;
    var matchIndex = query.indexOf(macroStart, fromIndex);
    var matches = [];

    while (matchIndex != -1) {
      var stack = [];
      var startIndex = matchIndex + macroStart.length;
      for (var i = startIndex; i < query.length; i++) {
        var ch = query.charAt(i);
        if (ch === '(') {
          stack.push(ch);
        } else if (ch === ')') {
          if (stack.length) {
            stack.pop();
          } else {
            matches.push({
              start: matchIndex,
              end: i,
              template: query.substring(startIndex, i).trim()
            });
            fromIndex = i;
            break;
          }
        }
      }
      matchIndex = query.indexOf(macroStart, fromIndex);
    }
    return matches;
  }

  function transformValue(column_type, value) {
    switch (column_type) {
      case 'timestamp':
        return Date.parse(value);
      case 'blob':
        return atob(value);
      case 'string':
      case 'double':
      case 'int64':
      case 'count':
        return value;
      case 'none':
        return null;
      default:
        throw 'unexpected column type: ' + column_type;
    }
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
            if (c.data.length > 0 && c.type == 'timestamp') {
              var d = Date.parse(c.data[0]);
              if (d >= maxDurationYear) {
                result.type = 'time';
              }
            }
            return result;
          });
          var rows = [];
          for (var i = 0; i < rowCount; i++) {
            var row = [];
            for (var j = 0; j < colCount; j++) {
              var value = table.columns[j].data[i];
              row.push(transformValue(table.columns[j].type, value));
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

            var _loop = function _loop(_i) {
              var target = table.columns[_i].name;
              var datapoints = table.columns[_i].data.map(function (value, idx) {
                return [transformValue(table.columns[_i].type, value), Date.parse(timestamps[idx])];
              });
              results.push({ target: target, datapoints: datapoints });
            };

            for (var _i = 1; _i < table.columns.length; _i++) {
              _loop(_i);
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

      _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
      } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };

      if (typeof window === 'undefined') {
        req = require('atob');

        atob = req.atob;
      } else {
        atob = window.atob;
      }

      // This is taken from https://github.com/grafana/grafana/blob/master/public/app/features/variables/utils.ts#L16
      variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::([^\}]+))?}/g;

      Datasource = function () {
        function Datasource(instanceSettings, $q, backendSrv, templateSrv) {
          var _this = this;

          _classCallCheck(this, Datasource);

          this.doQuery = function (_ref) {
            var query = _ref.query,
                format = _ref.format;

            query = query.trim();
            // show tags with regex filter
            // query format: show tags where tag ~ <regex>
            if (/^show\s+tags\s+where\s+tag\s+~\s+\S+$/i.test(query)) {
              var _query$split = query.split(/\s+/),
                  _query$split2 = _slicedToArray(_query$split, 6),
                  regex = _query$split2[5];

              return _this.backendSrv.datasourceRequest({
                url: _this.url + '/api/tags',
                method: 'GET',
                params: { regex: regex },
                headers: { Authorization: 'Bearer ' + _this.token }
              }).then(function (result) {
                result.data.format = format;
                return result;
              });
            }
            // show all tags
            // query format: show tags
            else if (/^show\s+tags$/i.test(query)) {
                return _this.backendSrv.datasourceRequest({
                  url: _this.url + '/api/tags',
                  method: 'GET',
                  headers: { Authorization: 'Bearer ' + _this.token }
                }).then(function (result) {
                  result.data.format = format;
                  return result;
                });
              }
              // default query
              else {
                  return _this.backendSrv.datasourceRequest({
                    url: _this.url + '/api/query',
                    method: 'POST',
                    data: '{ "query" : "' + query + '" }',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _this.token }
                  }).then(function (result) {
                    result.data.format = format;
                    return result;
                  });
                }
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
          key: 'extractMacroVariables',
          value: function extractMacroVariables(template) {
            var dashVars = this.templateSrv.getVariables();
            var macroVariables = Array.from(template.matchAll(variableRegex));
            return macroVariables.map(function (match) {
              var fullVariableName = match[0];
              var variableName = void 0;
              for (var i = 1; i < match.length; i++) {
                variableName = match[i];
                if (variableName) {
                  break;
                }
              }
              var dashVar = dashVars.find(function (dv) {
                return dv.name === variableName;
              });

              if (dashVar && dashVar.multi) {
                var value = dashVar.current.value || [];
                value = Array.isArray(value) ? value : [value];
                return {
                  fullName: fullVariableName,
                  name: variableName,
                  value: value
                };
              }

              return {
                fullName: fullVariableName,
                name: variableName
              };
            });
          }
        }, {
          key: 'renderMacroTemplate',
          value: function renderMacroTemplate(template, join) {
            var macroVariables = this.extractMacroVariables(template).filter(function (m) {
              return !!m.value;
            });
            // all macrovariables value array length should be the same
            console.log('macroVariables', macroVariables);
            var result = [];
            for (var i = 0; i < macroVariables[0].value.length; i++) {
              var resultTemplate = template;
              for (var j = 0; j < macroVariables.length; j++) {
                resultTemplate = resultTemplate.replaceAll(macroVariables[j].fullName, macroVariables[j].value[i]);
              }
              result.push(resultTemplate);
            }
            return result.join(join);
          }
        }, {
          key: 'buildQueryTemplate',
          value: function buildQueryTemplate(sql, variables) {
            var _this2 = this;

            var commaMacros = extractMacrosFunction(sql, '$__comma');
            if (commaMacros.length) {
              sql = commaMacros.reduce(function (query, macro) {
                var template = _this2.renderMacroTemplate(macro.template, ', ');
                return query.substring(0, macro.start) + template + query.substring(macro.end + 1);
              }, sql);
            }

            var orMacros = extractMacrosFunction(sql, '$__or');
            if (orMacros.length) {
              sql = orMacros.reduce(function (query, macro) {
                var template = _this2.renderMacroTemplate(macro.template, ' OR ');
                return query.substring(0, macro.start) + template + query.substring(macro.end + 1);
              }, sql);
            }

            var andMacros = extractMacrosFunction(sql, '$__and');
            if (andMacros.length) {
              sql = andMacros.reduce(function (query, macro) {
                var template = _this2.renderMacroTemplate(macro.template, ' AND ');
                return query.substring(0, macro.start) + template + query.substring(macro.end + 1);
              }, sql);
            }

            var result = this.templateSrv.replace(sql, variables);
            console.log(result);
            return result;
          }
        }, {
          key: 'query',
          value: function () {
            var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(options) {
              var _this3 = this;

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
                          query: _this3.buildQueryTemplate(t.rawSql, variables)
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
          value: function () {
            var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(query) {
              var response, result;
              return regeneratorRuntime.wrap(function _callee4$(_context5) {
                while (1) {
                  switch (_context5.prev = _context5.next) {
                    case 0:
                      query = query.trim();
                      // exit early if query is blank otherwise the server will return an invalid query error

                      if (!(query == '')) {
                        _context5.next = 3;
                        break;
                      }

                      return _context5.abrupt('return', []);

                    case 3:
                      _context5.next = 5;
                      return this.checkToken();

                    case 5:
                      _context5.next = 7;
                      return this.doQuery({ query: query });

                    case 7:
                      response = _context5.sent;
                      _context5.prev = 8;
                      result = response.data.tables[0].columns[0].data.map(function (tag) {
                        return { text: tag };
                      });
                      return _context5.abrupt('return', result);

                    case 13:
                      _context5.prev = 13;
                      _context5.t0 = _context5['catch'](8);

                      console.log(_context5.t0);
                      console.log(response);
                      throw Error('Unexpected metricFindQuery error. See console output for more information.');

                    case 18:
                    case 'end':
                      return _context5.stop();
                  }
                }
              }, _callee4, this, [[8, 13]]);
            }));

            function metricFindQuery(_x2) {
              return _ref6.apply(this, arguments);
            }

            return metricFindQuery;
          }()
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