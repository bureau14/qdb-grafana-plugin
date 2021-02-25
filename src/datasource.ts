import { DataSourceInstanceSettings, DefaultTimeZone, MetricFindValue } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { DataQueryRequest, DataQueryResponse, DefaultTimeRange } from '@grafana/data';
import { QdbDataSourceOptions, QdbQuery } from './types';
import { getTemplateSrv } from '@grafana/runtime';
import { Observable } from 'rxjs';

export class DataSource extends DataSourceWithBackend<QdbQuery, QdbDataSourceOptions> {
  templateSrv: any;

  constructor(instanceSettings: DataSourceInstanceSettings<QdbDataSourceOptions>) {
    super(instanceSettings);
    this.templateSrv = getTemplateSrv();
  }

  // This is taken from https://github.com/grafana/grafana/blob/master/public/app/features/variables/utils.ts#L16
  variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::([^\}]+))?}/g;

  extractMacrosFunction(query: any, macro: any) {
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

  extractMacroVariables(template: any) {
    const dashVars = this.templateSrv.getVariables();
    const macroVariables = Array.from(template.matchAll(this.variableRegex));
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

  renderMacroTemplate(template: any, join: any) {
    // we only want macros that have a value
    console.log(`template: ${template}`);
    let macroVariables = this.extractMacroVariables(template);
    console.log(`macroVariables: ${macroVariables}`);
    macroVariables = macroVariables.filter(m => !!m.value);
    console.log(`macroVariables: ${macroVariables}`);
    // all macrovariables value array length should be the same

    let result = [];
    for (let i = 0; i < macroVariables[0].value.length; i++) {
      let resultTemplate = template;
      for (let j = 0; j < macroVariables.length; j++) {
        resultTemplate = resultTemplate.replaceAll(macroVariables[j].fullName, macroVariables[j].value[i]);
      }
      result.push(resultTemplate);
    }
    return result.join(join);
  }

  buildSqlTemplate(sql: string, macro: string, replacer: string) {
    let macros = this.extractMacrosFunction(sql, macro);
    if (macros.length) {
      sql = macros.reduce((query, mc) => {
        const template = this.renderMacroTemplate(mc.template, replacer);
        return query.substring(0, mc.start) + template + query.substring(mc.end + 1);
      }, sql);
    }
    return sql;
  }

  buildQueryTemplate(sql: any, variables: any) {
    sql = this.buildSqlTemplate(sql, '$__comma', ', ');
    sql = this.buildSqlTemplate(sql, '$__or', ' OR ');
    sql = this.buildSqlTemplate(sql, '$__and', ' AND ');

    const result = this.templateSrv.replace(sql, variables);
    console.log(result);
    return result;
  }

  transformScopedVars(request: DataQueryRequest<QdbQuery>) {
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
  }

  query(request: DataQueryRequest<QdbQuery>): Observable<DataQueryResponse> {
    if (request.targets[0].tagQuery === true) {
      console.log('tag query!');
      return super.query(request);
    }
    request.targets.map(
      x => (x.queryText = this.buildQueryTemplate(x.queryText ?? '', this.transformScopedVars(request)))
    );
    request.targets.map(
      x => (x.queryText = this.templateSrv.replace(x.queryText ?? '', this.transformScopedVars(request)))
    );

    return super.query(request);
  }

  async metricFindQuery?(queryText: string, options?: any): Promise<MetricFindValue[]> {
    console.log('metricFindQuery!');
    console.log('options:');
    console.log(options);

    let query: QdbQuery = {
      refId: options.id,
      queryText: queryText,
      tagQuery: true,
    };

    let req: DataQueryRequest<QdbQuery> = {
      requestId: options.id,
      interval: '5m',
      intervalMs: 30000,
      range: DefaultTimeRange,
      scopedVars: options,
      timezone: DefaultTimeZone,
      app: '',
      startTime: 0,
      targets: [query],
    };

    const response = await this.query(req);

    console.log('query:');
    console.log(query);

    console.log('req:');
    console.log(req);

    console.log('response:');
    console.log(response);

    response.subscribe(res => console.log(res.data[0]));
    return Promise.resolve([]);

    // if (query.queryText === '') {
    //   return Promise.resolve([]);
    // }
    // req: DataQueryRequest<QdbQuery>;

    // const res = await response;
    // try {
    //   response.subscribe(res => res.data[0].fields[0].data.map((tag: any) => ({ text: tag })));
    //   const result = res.data;
    //   return result;
    // } catch (error) {
    //   console.log(error);
    //   console.log(response);
    //   throw Error('Unexpected metricFindQuery error. See console output for more information.');
    // }
    // return Promise.resolve([]);

    // const res = this.query(req);

    // return Promise.resolve([]);
  }

  // async metricFindQuery(query: QdbQuery) {
  //   query.queryText = query.trim()
  //   // exit early if query is blank otherwise the server will return an invalid query error

  // }
}
