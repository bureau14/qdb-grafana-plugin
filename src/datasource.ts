import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { DataQueryRequest, DataQueryResponse } from '@grafana/data';
import { QdbDataSourceOptions, QdbQuery } from './types';
import { getTemplateSrv } from '@grafana/runtime';
import { Observable } from 'rxjs';

export class DataSource extends DataSourceWithBackend<QdbQuery, QdbDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<QdbDataSourceOptions>) {
    super(instanceSettings);
  }

  transformScopedVars(request: DataQueryRequest<QdbQuery>) {
    const range = {
      from: request.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS'),
      to: request.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS'),
    };

    const vars: any = {
      __from: range.from,
      __to: range.to,
      __range: `RANGE(${range.from}, ${range.to})`,
      __interval: request.interval.slice(-1) === 'm' ? `${request.interval}in` : request.interval,
    };

    return {
      ...request.scopedVars,
      ...Object.keys(vars)
        .map(key => ({ [key]: { text: vars[key], value: vars[key] } }))
        .reduce((x, y) => ({ ...y, ...x }), {}),
    };
  }

  query(request: DataQueryRequest<QdbQuery>): Observable<DataQueryResponse> {
    const templateSrv = getTemplateSrv();
    request.targets.map(x => (x.queryText = templateSrv.replace(x.queryText ?? '', this.transformScopedVars(request))));

    return super.query(request);
  }
}
