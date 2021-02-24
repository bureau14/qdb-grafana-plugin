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
    const from = request.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS');
    const to = request.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS');

    const vars: any = {
      __range: `RANGE(${from}, ${to})`,
      __interval: `${request.intervalMs}ms`,
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
