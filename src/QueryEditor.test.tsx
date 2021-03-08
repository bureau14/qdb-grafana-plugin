// QueryEditor.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import { QdbQuery } from './types';
import { QueryEditor } from './QueryEditor';

test('QueryEditor', () => {
  let query: QdbQuery = {
    refId: 'aaa',
    queryText: 'SELECT * FROM ts;',
    tagQuery: true,
  };
  const component = renderer.create(<QueryEditor query={query}></QueryEditor>);
  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
