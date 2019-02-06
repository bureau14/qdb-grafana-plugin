"use strict";

System.register([], function (_export, _context) {
    "use strict";

    var Config;

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    return {
        setters: [],
        execute: function () {
            Config = function Config($scope, datasourceSrv) {
                _classCallCheck(this, Config);

                this.url = "";
                this.username = "";
                this.usersecret = "";

                // console.log("looooooooooooooooooooog config")
                this.url = this.current.jsonData.url;
                this.securityEnabled = this.current.jsonData.securityEnabled;
                this.name = this.current.jsonData.name;
                this.secret = this.current.jsonData.secret;
                this.datasourceSrv = datasourceSrv;
            };

            Config.templateUrl = 'partials/config.html';

            _export("default", Config);
        }
    };
});
//# sourceMappingURL=config_ctrl.js.map