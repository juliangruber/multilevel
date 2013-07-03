var multilevel = require('..');
var level = require('level');

var DB = level(__dirname + '/.db');
var db = multilevel.client();
var server = multilevel.server(DB);
server.pipe(db.createRpcStream()).pipe(server);

db.put('foo', 'bar', function (err) {
  if (err) throw err;
  db.get('foo', function (err, val) {
    if (err) throw err;
    console.log(val);
  });
});
