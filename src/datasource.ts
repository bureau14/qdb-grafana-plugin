import { DataSourceInstanceSettings, TimeRange } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { DataQueryRequest, DataQueryResponse } from '@grafana/data';
import { QdbDataSourceOptions, QdbQuery } from './types';
import { getTemplateSrv } from '@grafana/runtime';
import { Observable } from 'rxjs';

export class DataSource extends DataSourceWithBackend<QdbQuery, QdbDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<QdbDataSourceOptions>) {
    super(instanceSettings);
  }

  replaceRange(range: TimeRange, toReplace: string, queryText: string) {
    return queryText?.replace(
      toReplace,
      `RANGE(${range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS')}, ${range.to
        .utc()
        .format('YYYY-MM-DD[T]HH:mm:ss.SSSSSSSSS')})`
    );
  }

  query(request: DataQueryRequest<QdbQuery>): Observable<DataQueryResponse> {
    request.targets.map(x => (x.queryText = this.replaceRange(request.range, '$__range', x.queryText ?? '')));
    request.targets.map(x => (x.queryText = this.replaceRange(request.range, '${__range}', x.queryText ?? '')));
    console.log(`request.targets[0].queryText: ${request.targets[0].queryText}`);

    return super.query(request);
  }

  applyTemplateVariables(query: QdbQuery) {
    const templateSrv = getTemplateSrv();
    return {
      ...query,
      queryText: templateSrv.replace(query.queryText ?? ''),
    };
  }
}
