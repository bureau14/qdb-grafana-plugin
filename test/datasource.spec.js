import Q from 'q';
import { expect } from 'chai';

import Datasource from '../src/datasource';

describe('Datasource', function () {
  const instanceSettings = {
    id: 1,
    name: 'qdb-grafana-plugin',
    url: '/grafana/proxy',
  };

  let backendSrv;
  let templateSrv;
  let datasource;

  beforeEach(function () {
    backendSrv = {};
    templateSrv = {};
    datasource = new Datasource(instanceSettings, Q, backendSrv, templateSrv);
  });

  // ---------------------------------------------------------------------------

  it('should use the `global_status` API for connection validation', function () {
    backendSrv.datasourceRequest = (request) => {
      expect(request).to.deep.equal({
        url: '/grafana/proxy/global_status',
        method: 'GET',
      });

      return Q.when();
    };

    datasource.testDatasource();
  });

  // ---------------------------------------------------------------------------

  it('should report a success status when the datasource connection works', function (done) {
    backendSrv.datasourceRequest = () => Q.when();
    datasource.testDatasource()
      .then((result) => {
        expect(result).to.deep.equal({
          status: 'success',
          message: 'QuasarDB connection is OK!',
        });

        done();
      });
  });

  // ---------------------------------------------------------------------------

  it('should report an error status when the datasource connection fails', function (done) {
    backendSrv.datasourceRequest = () => Q.reject();
    datasource.testDatasource()
      .then((result) => {
        expect(result).to.deep.equal({
          status: 'error',
          message: 'Unable to connect to datasource. See console for detailed information.',
        });

        done();
      });
  });
});
