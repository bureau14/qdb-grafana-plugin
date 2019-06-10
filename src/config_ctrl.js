export default class Config {
  static templateUrl = 'partials/config.html'

  constructor($scope, datasourceSrv) {
    this.url = this.current.jsonData.url || ''
    this.name = this.current.jsonData.name || ''
    this.secret = this.current.jsonData.secret || ''
    this.securityEnabled = this.current.jsonData.securityEnabled
    this.datasourceSrv = datasourceSrv
  }
}
