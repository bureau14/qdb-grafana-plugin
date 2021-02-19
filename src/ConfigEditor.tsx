import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, SecureJsonData } from './types';

const { SecretFormField, FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onURIChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      uri: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };
  onUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        username: event.target.value,
      },
    });
  };
  // Secure field (only sent to the backend)
  onUserPrivateKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        user_private_key: event.target.value,
      },
    });
  };
  // Secure field (only sent to the backend)
  onClusterPublicKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        ...options.secureJsonData,
        cluster_public_key: event.target.value,
      },
    });
  };

  onResetUsername = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        username: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        username: '',
      },
    });
  };
  onResetUserPrivateKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        user_private_key: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        user_private_key: '',
      },
    });
  };
  onResetClusterPublicKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        cluster_public_key: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        cluster_public_key: '',
      },
    });
  };

  render() {
    const { options } = this.props;
    const { jsonData, secureJsonFields } = options;
    const secureJsonData = (options.secureJsonData || {}) as SecureJsonData;

    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <FormField
            label="URI"
            labelWidth={6}
            inputWidth={20}
            onChange={this.onURIChange}
            value={jsonData.uri || ''}
            placeholder="A quasardb URI"
          />
        </div>
        <div className="gf-form">
          <SecretFormField
            isConfigured={(secureJsonFields && secureJsonFields.username) as boolean}
            label="Username"
            labelWidth={6}
            inputWidth={20}
            onChange={this.onUsernameChange}
            value={secureJsonData.username || ''}
            onReset={this.onResetUsername}
            placeholder="User"
          />
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              isConfigured={(secureJsonFields && secureJsonFields.user_private_key) as boolean}
              value={secureJsonData.user_private_key || ''}
              label="user private key"
              placeholder="User Private Key"
              labelWidth={6}
              inputWidth={20}
              onReset={this.onResetUserPrivateKey}
              onChange={this.onUserPrivateKeyChange}
            />
          </div>
        </div>

        <div className="gf-form-inline">
          <div className="gf-form">
            <SecretFormField
              isConfigured={(secureJsonFields && secureJsonFields.cluster_public_key) as boolean}
              value={secureJsonData.cluster_public_key || ''}
              label="user private key"
              placeholder="User Private Key"
              labelWidth={6}
              inputWidth={20}
              onReset={this.onResetClusterPublicKey}
              onChange={this.onClusterPublicKeyChange}
            />
          </div>
        </div>
      </div>
    );
  }
}
