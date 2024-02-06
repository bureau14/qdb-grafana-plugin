import { DataSourceInstanceSettings, DefaultTimeZone, MetricFindValue } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { DataQueryRequest, DataQueryResponse, getDefaultTimeRange } from '@grafana/data';
import { QdbDataSourceOptions, QdbQuery } from './types';
import { getTemplateSrv } from '@grafana/runtime';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

// This is taken from https://github.com/grafana/grafana/blob/master/public/app/features/variables/utils.ts#L16
const variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::([^\}]+))?}/g;

// constructs query for metricFindQuery from strings in format table.column
export function createQueryFromTableColumnOnly(query: string) {
  const constructQueryPattern = /^.*\..+$/;
  if (!constructQueryPattern.exec(query)) {
    return query;
  }
  let queryArgs = query.split('.');
  return `SELECT ${queryArgs[1]} FROM ${queryArgs[0]} GROUP BY ${queryArgs[1]}`;
}

// format table name for use in the queries
export function formatTableName(tableName: string) {
  if (tableName.includes('.') || tableName.includes('/')) {
    tableName = '"' + tableName + '"';
  }
  return tableName;
}

// extracts variable names and macros indexes from query
export function extractMacrosFunction(query: any, macro: any) {
  const macroStart = `${macro}(`;

  let fromIndex = 0;
  let matchIndex = query.indexOf(macroStart, fromIndex);
  let matches = [];

  while (matchIndex !== -1) {
    let stack = [];
    const startIndex = matchIndex + macroStart.length;
    for (let i = startIndex; i < query.length; i++) {
      const ch = query.charAt(i);
      if (ch === '(') {
        stack.push(ch);
      } else if (ch === ')') {
        if (stack.length) {
          stack.pop();
        } else {
          matches.push({
            start: matchIndex,
            end: i,
            template: query.substring(startIndex, i).trim(),
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

// extract variable name, values
// if includeAll was not set by user its replaced with default value
export function extractMacroVariables(template: any, dashVars: any) {
  const macroVariables = Array.from(template.matchAll(variableRegex));
  return macroVariables.map((match: any) => {
    const fullVariableName = match[0];
    let variableName: any;
    for (let i = 1; i < match.length; i++) {
      variableName = match[i];
      if (variableName) {
        break;
      }
    }
    const dashVar = dashVars.find((dv: { name: any }) => dv.name === variableName);

    // we only consider multi variables
    if (dashVar && dashVar.multi) {
      // ensure the current value is always an array when multi is true
      // sometimes (rarely) it seems to come through as a string
      let value = dashVar.current.value || [];
      value = Array.isArray(value) ? value : [value];

      // set default value for allValue if its not set by the user
      if (value.length === 1 && value[0] === '$__all') {
        if (dashVar.allValue === null) {
          value = ['1=1'];
        } else {
          value = [dashVar.allValue];
        }
      }

      return {
        fullName: fullVariableName,
        name: variableName,
        value: value,
      };
    }

    return {
      fullName: fullVariableName,
      name: variableName,
    };
  });
}

// replaces variables with their values, returns string joined by join string passed as argument
export function renderMacroTemplate(template: any, join: any, variables: any) {
  // we only want macros that have a value
  let macroVariables = extractMacroVariables(template, variables);
  macroVariables = macroVariables.filter((m) => !!m.value);
  // all macrovariables value array length should be the same

  let result = [];
  if (macroVariables.length <= 0) {
    console.warn('No variables to expand. If this is unusual, make sure your variables are set to multi-value.');
    return '';
  }
  for (let i = 0; i < macroVariables[0].value.length; i++) {
    let resultTemplate = template;
    for (let j = 0; j < macroVariables.length; j++) {
      resultTemplate = resultTemplate.replaceAll(macroVariables[j].fullName, macroVariables[j].value[i]);
    }
    result.push(resultTemplate);
  }
  return result.join(join);
}

// replace macros, join variables with passed sql syntax
export function buildSqlTemplate(
  sql: string,
  macro: string | null,
  replacer: string,
  variables: any,
  addParentheses = true
) {
  if (macro === null) {
    sql = sql.replace(variableRegex, (match, _) => {
      // if template is empty variable is not multi-value, it will be replaced later
      let template = renderMacroTemplate(match, replacer, variables);
      if (template !== '') {
        if (addParentheses === true) {
          template = `(${template})`;
        }
        return template;
      }
      return match;
    });
  } else {
    // macros require additionaly removig macro variables from query
    let macros = extractMacrosFunction(sql, macro);
    if (macros.length) {
      sql = macros.reduce((query: string, mc: { template: any; start: any; end: number }) => {
        let template = renderMacroTemplate(mc.template, replacer, variables);
        if (addParentheses === true) {
          template = `(${template})`;
        }
        // replace macro and variable inside with coresponding sql keywords
        return query.substring(0, mc.start) + template + query.substring(mc.end + 1);
      }, sql);
    }
  }
  return sql;
}

// formats variables with coma, and, or depending on variable
// e.g:
// var1 : { column = val1, column = val2 }
// $__and(${var1}) => column = val1 AND column = val2
export function buildQueryTemplate(sql: any, variables: any) {
  // handle variables inside macros
  sql = buildSqlTemplate(sql, '$__comma', ', ', variables, false);
  sql = buildSqlTemplate(sql, '$__or', ' OR ', variables, true);
  sql = buildSqlTemplate(sql, '$__and', ' AND ', variables, true);
  // handle variables not included in any macros
  sql = buildSqlTemplate(sql, null, ' OR ', variables, true);
  return sql;
}

export function transformScopedVars(request: DataQueryRequest<QdbQuery>) {
  if (request.range) {
    const from = request.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS');
    const to = request.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS');

    const vars: any = {
      __range: `RANGE(${from}, ${to})`,
      __interval: `${request.intervalMs}ms`,
      __sensor: ['asd', 'bsd'],
    };

    return {
      ...request.scopedVars,
      ...Object.keys(vars)
        .map((key) => ({ [key]: { text: vars[key], value: vars[key] } }))
        .reduce((x, y) => ({ ...y, ...x }), {}),
    };
  } else {
    return request;
  }
}

export class DataSource extends DataSourceWithBackend<QdbQuery, QdbDataSourceOptions> {
  templateSrv: any;

  constructor(instanceSettings: DataSourceInstanceSettings<QdbDataSourceOptions>) {
    super(instanceSettings);
    this.templateSrv = getTemplateSrv();
  }

  // send query to backend
  query(request: DataQueryRequest<QdbQuery>): Observable<DataQueryResponse> {
    if (request.targets[0].tagQuery === true) {
      return super.query(request);
    }
    // replace variables with their values
    request.targets.map(
      (x) =>
        (x.queryText = this.templateSrv.replace(
          buildQueryTemplate(x.queryText ?? '', this.templateSrv.getVariables()),
          transformScopedVars(request)
        ))
    );
    console.log('query sent:', request.targets[0].queryText);
    return super.query(request);
  }

  // this method adds support for dynamic query variables
  // https://grafana.com/developers/plugin-tools/create-a-plugin/extend-a-plugin/add-support-for-variables
  async metricFindQuery?(queryText: string, options?: any): Promise<MetricFindValue[]> {
    queryText = createQueryFromTableColumnOnly(queryText);
    // id is needed to retrive query result
    // query responses are stored in a hashmap, without id response data was empty
    // see Query, QueryData in pkg/qdb-grafana-plugin.go
    console.log('options:');
    console.log(options);
    if (options.id === null || options.id === undefined) {
      options.id = uuidv4().toString();
    }

    // tag queries go to diffrent endpoint in qdb rest api, they need to be identified before sending query
    let isTagQuery = false;
    const tagQueryPattern = /^show\s+tags.*/i; // e.g: `show tags where tag ~ some-tag`, `show tags`
    if (tagQueryPattern.exec(queryText)) {
      isTagQuery = true;
    }

    let query: QdbQuery = {
      refId: options.id,
      queryText: queryText,
      tagQuery: isTagQuery,
    };

    let req: DataQueryRequest<QdbQuery> = {
      requestId: options.id,
      interval: '5m',
      intervalMs: 30000,
      range: getDefaultTimeRange(),
      scopedVars: options,
      timezone: DefaultTimeZone,
      app: 'grafana-plugin',
      startTime: 0,
      targets: [query],
    };

    // make request, process output
    const response = await this.query(req);
    return response.toPromise().then((res) => {
      console.log('response');
      console.log(res.data); // this is visible only when used with yarn dev
      if (res.error) {
        // throw new error to ui
        throw new Error(res.error.message);
      }
      const values: MetricFindValue[] = [];
      if (res.data.length === 0) {
        // empty query response shouldnt throw error to user
        return values;
      }
      let fields = res.data[0].fields;
      if (fields) {
        // query variables should contain only one column
        if (fields.length !== 1) {
          throw new Error(`Query should return only one column, retured columns ${fields.length}`);
        }
        fields = fields[0];
        for (let i = 0; i < fields.values.length; i++) {
          // queries are returned as column_name = value
          // tag queries are formated as value only
          // queries returning $table column are returned as value only
          if (fields.type === 'string') {
            if (query.tagQuery === true) {
              values.push({ text: fields.values.get(i), value: fields.values.get(i) });
            } else if (fields.name === '$table' || queryText.match(/^find\(tag=.*\)$/)) {
              values.push({ text: fields.values.get(i), value: formatTableName(fields.values.get(i)) });
            } else {
              values.push({ text: fields.values.get(i), value: `${fields.name}=` + "'" + fields.values.get(i) + "'" });
            }
          } else {
            values.push({ text: fields.values.get(i), value: `${fields.name}=` + fields.values.get(i) });
          }
        }
      }
      console.log('returning variables: ', values);
      return values;
    });
  }
}
