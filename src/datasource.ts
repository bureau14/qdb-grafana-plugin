import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { ScopedVars } from '@grafana/data';
import { QdbDataSourceOptions, QdbQuery } from './types';
import { getTemplateSrv } from '@grafana/runtime';

export class DataSource extends DataSourceWithBackend<QdbQuery, QdbDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<QdbDataSourceOptions>) {
    super(instanceSettings);
  }
  applyTemplateVariables(query: QdbQuery, scopedVars: ScopedVars) {
    const templateSrv = getTemplateSrv();
    console.log(`interval: ${this.interval}`);
    console.log(`scopedVars: ${scopedVars[0]}`);
    console.log(`scopedVars: ${scopedVars.text}`);
    let queryText = templateSrv.replace(query.queryText ?? '', scopedVars);
    console.log(`query: ${queryText}`);

    // const from = scopedVars.find(({ name }) => name === '__from');
    // const to = scopedVars.find(({ name }) => name === '__to');
    // console.log(`from: ${from}`);
    // console.log(`to: ${to}`);
    // const range = `range(${from}, ${to})`;
    // queryText = queryText.replace('$__range', range);
    // queryText = queryText.replace('${__range}', range);

    console.log(`query: ${queryText}`);

    return {
      ...query,
      queryText,
    };
  }
}
