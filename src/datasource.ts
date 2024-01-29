import { DataSourceInstanceSettings, DefaultTimeZone, MetricFindValue } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { DataQueryRequest, DataQueryResponse, DefaultTimeRange } from '@grafana/data';
import { QdbDataSourceOptions, QdbQuery } from './types';
import { getTemplateSrv } from '@grafana/runtime';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

// This is taken from https://github.com/grafana/grafana/blob/master/public/app/features/variables/utils.ts#L16
const variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::([^\}]+))?}/g;

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

export function renderMacroTemplate(template: any, join: any, variables: any) {
  // we only want macros that have a value
  let macroVariables = extractMacroVariables(template, variables);
  macroVariables = macroVariables.filter(m => !!m.value);
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

export function buildSqlTemplate(sql: string, macro: string, replacer: string, variables: any) {
  let macros = extractMacrosFunction(sql, macro);
  if (macros.length) {
    sql = macros.reduce((query: string, mc: { template: any; start: any; end: number }) => {
      const template = renderMacroTemplate(mc.template, replacer, variables);
      return query.substring(0, mc.start) + template + query.substring(mc.end + 1);
    }, sql);
  }
  return sql;
}

export function buildQueryTemplate(sql: any, variables: any) {
  sql = buildSqlTemplate(sql, '$__comma', ', ', variables);
  sql = buildSqlTemplate(sql, '$__or', ' OR ', variables);
  sql = buildSqlTemplate(sql, '$__and', ' AND ', variables);
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
        .map(key => ({ [key]: { text: vars[key], value: vars[key] } }))
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

  query(request: DataQueryRequest<QdbQuery>): Observable<DataQueryResponse> {
    if (request.targets[0].tagQuery === true) {
      return super.query(request);
    }
    request.targets.map(
      x =>
        (x.queryText = this.templateSrv.replace(
          buildQueryTemplate(x.queryText ?? '', this.templateSrv.getVariables()),
          transformScopedVars(request)
        ))
    );
    request.targets.map(x => (x.queryText = this.templateSrv.replace(x.queryText ?? '', transformScopedVars(request))));

    return super.query(request);
  }

  async metricFindQuery?(queryText: string, options?: any): Promise<MetricFindValue[]> {
    // id is needed to retrive query result
    if (options.id === null || options.id === undefined) {
      options.id = uuidv4().toString();
    }

    let isTagQuery = false;
    const tagQueryPattern = /^show\s+tags.*/; // e.g: `show tags where tag ~ some-tag`, `show tags`
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
      range: DefaultTimeRange,
      scopedVars: options,
      timezone: DefaultTimeZone,
      app: 'grafana-plugin',
      startTime: 0,
      targets: [query],
    };

    const response = await this.query(req);
    return response.toPromise().then(res => {
      if (res.error) {
        throw new Error(res.error.message);
      }
      const values: MetricFindValue[] = [];
      if (res.data.length === 0) {
        // empty response from query
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
          values.push({ text: '' + fields.values.get(i) });
        }
      }
      return values;
    });
  }
}
