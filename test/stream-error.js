var multilevel = require('..');
var through = require('through');
var MemDB = require('memdb');

require('./util')(function (test) {

  test('stream error', function (t) {
    var db = {};
    db.createReadStream = function(){
      var stream = through();
      process.nextTick(function(){
        stream.emit('error', new Error('oops'));
      });
      return stream;
    };

    var server = multilevel.server(db);
    var client = multilevel.client();
    server.pipe(client.createRpcStream()).pipe(server);

    var stream = client.createReadStream();
    stream.on('error', function(err){
      t.equal(err.message, 'oops');
      t.end();
    });
  });
});

