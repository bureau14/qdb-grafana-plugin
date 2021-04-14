import defaults from 'lodash/defaults';

import React, { ChangeEvent, PureComponent } from 'react';
import { TextArea, Button } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, QdbDataSourceOptions, QdbQuery } from './types';

type Props = QueryEditorProps<DataSource, QdbQuery, QdbDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onQueryTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryText: event.target.value });
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { queryText } = query;

    return (
      <div className="gf-form">
        <TextArea label="Query" value={queryText || ''} onChange={this.onQueryTextChange}></TextArea>
        <Button onClick={this.props.onRunQuery}>Run Query</Button>
      </div>
    );
  }
}
