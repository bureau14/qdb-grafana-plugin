// QueryEditor.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import { QdbQuery } from './types';
import { QueryEditor } from './QueryEditor';
import { DataSource } from 'datasource';

test('QueryEditor', () => {
  const datasourceMock: unknown = {};
  const datasource: DataSource = datasourceMock as DataSource;
  const onRunQuery = jest.fn();
  const onChange = jest.fn();
  let query: QdbQuery = {
    refId: 'aaa',
    queryText: 'SELECT * FROM ts;',
    tagQuery: true,
  };
  const props: any = {
    datasource,
    onChange,
    onRunQuery,
    query,
  };
  const component = renderer.create(
    <QueryEditor
      query={props.query}
      onRunQuery={props.onRunQuery}
      onChange={props.onChange}
      datasource={props.datasource}
    ></QueryEditor>
  );
  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
