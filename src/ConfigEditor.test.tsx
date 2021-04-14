// ConfigEditor.test.js
import React from 'react';
import { create } from 'react-test-renderer';
import { ConfigEditor } from './ConfigEditor';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { QdbDataSourceOptions, QdbSecureJsonData } from './types';
import { createDatasourceSettings } from './mocks';

test('ConfigEditor', () => {
  let jsonData: QdbDataSourceOptions = {
    host: 'https://127.0.0.1:443',
  };
  let secureJsonData: QdbSecureJsonData = {
    user: 'test-user',
    secret: 'SIqZ+vg4eZGeuhzCyT90OtwweivdtOieodaaTV/Xtd6k=',
  };

  let opts = createDatasourceSettings(jsonData);
  let props: DataSourcePluginOptionsEditorProps<QdbDataSourceOptions> = {
    options: {
      ...opts,
      secureJsonData: secureJsonData,
    },
    onOptionsChange: () => {
      return;
    },
  };

  const component = create(<ConfigEditor options={props.options} onOptionsChange={props.onOptionsChange} />);
  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
