require('./util')(function (test, multilevel, getDb) {

  test('access error', function (t) {
    t.plan(2);

    var multilevel = require('..');
    var level = require('memdb');

    var db = level('db');

    var server = multilevel.server(db, {
      access: function () {
        throw new Error('unauthorized');
      }
    });

    var db = multilevel.client();
    server.pipe(db.createRpcStream()).pipe(server);

    db.createReadStream()
      .on('error', function (err) {
        t.ok(err);
        t.equal(err.message, 'unauthorized');
      });
  });

});

