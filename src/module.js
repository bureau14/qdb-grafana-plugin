export { default as Datasource } from './datasource';
export { default as QueryCtrl } from './query_ctrl';

export class ConfigCtrl {
  static templateUrl = 'partials/config.html';
}

export class QueryOptionsCtrl {
  static templateUrl = 'partials/query.options.html';
}

export class AnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html'
}
