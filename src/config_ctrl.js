
export default class Config {
    static templateUrl = 'partials/config.html';

    url = "";
    username = "";
    usersecret = "";

    constructor($scope, datasourceSrv) {
        // console.log("looooooooooooooooooooog config")
        this.url = this.current.jsonData.url;
        this.securityEnabled = this.current.jsonData.securityEnabled;
        this.name = this.current.jsonData.name;
        this.secret = this.current.jsonData.secret;
        this.datasourceSrv = datasourceSrv;
    }
}