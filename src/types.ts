import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface QdbQuery extends DataQuery {
  queryText?: string;
}

export const defaultQuery: Partial<QdbQuery> = {};

/**
 * These are options configured for each DataSource instance
 */
export interface QdbDataSourceOptions extends DataSourceJsonData {
  host?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface QdbSecureJsonData {
  username?: string;
  user_private_key?: string;
}
