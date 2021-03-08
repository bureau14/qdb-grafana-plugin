// ConfigEditor.test.js
import React from 'react';
import renderer from 'react-test-renderer';
import { ConfigEditor } from './ConfigEditor';
import { QdbDataSourceOptions, QdbSecureJsonData } from './types';

test('ConfigEditor', () => {
  let jsonData: QdbDataSourceOptions = {
    host: 'https://127.0.0.1:443',
  };
  let secureJsonData: QdbSecureJsonData = {
    user: 'test-user',
    secret: 'SIqZ+vg4eZGeuhzCyT90OtwweivdtOieodaaTV/Xtd6k=',
  };

  let options = {
    jsonData: jsonData,
    secureJsonData: secureJsonData,
  };
  const component = renderer.create(<ConfigEditor options={options}></ConfigEditor>);
  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
