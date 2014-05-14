var getLocalDb = require('./util').getLocalDb;
var through = require('through');
var multilevel = require('..');
var test = require('tape');

test('disconnect', function (t) {
  t.plan(4);

  var db = getLocalDb();
  var server = multilevel.server(db);
  var client = multilevel.client();
  var fakeConnection = through();
  var readStream = db.createReadStream;
  var stream;
  var chunks = 0;

  // get a reference to the server read stream
  db.createReadStream = function () {
    stream = readStream.apply(this, arguments);
    stream.on('data', function () { chunks++ });
    return stream
  };

  setTimeout(function () {
    server.pipe(fakeConnection).pipe(client.createRpcStream()).pipe(server);
    server.on('error',function(){
      t.fail('server emitted error');
    });
  }, 10);

  client.batch([
    { type: 'put', key: 'a', value: "1" },
    { type: 'put', key: 'b', value: "2" },
    { type: 'put', key: 'c', value: "3" }
  ], function (err) {
    t.error(err, 'batch written');

    var errored = false;
    client.createReadStream()
      .on('data',function(data){
        t.equals(data.value, '1', 'data received');
        fakeConnection.destroy();
      })
      .on('error',function (error) {
        errored = true;
        var hasDisconnect = error.message.indexOf('disconnect') > -1;
        t.ok(hasDisconnect, 'emitted disconnect error');
      });

    stream.on('close', function () {
      t.equals(chunks, 1, 'database read stream closed');
    });
  });

});
