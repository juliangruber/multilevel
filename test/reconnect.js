var multitest = require('./util')
var getLocalDb = multitest.getLocalDb

multitest(function (test, multilevel) {

  test('reconnect', function (t) {
    t.plan(3);

    var db = getLocalDb();
    var server = multilevel.server(db);
    var client = multilevel.client();

    setTimeout(function () {
      var rpc = client.createRpcStream();
      server.pipe(client.createRpcStream()).pipe(server);
    }, 10);

    client.put('foo', 'bar', function (err) {
      t.error(err);
      client.get('foo', function (err, val) {
        t.error(err);
        t.equals(val, 'bar');
        db.close();
      });
    });
  });

});
