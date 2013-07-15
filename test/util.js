var multilevel = require('../');
var level = require('level-test')();
var manifest = require('level-manifest');

var util = module.exports = {};
var DEBUG = process.env.DEBUG

util.getLocalDb = function () {
  return level();
};

util.getDb = function (setup, cb) {
  if (!cb) {
    cb = setup;
    setup = null;
  }

  var db = util.getLocalDb();
  var opts;
  if (setup) opts = setup(db);

  var m = manifest(db);

  var server = multilevel.server(db, opts);
  var _db = multilevel.client(m);
  var rpcStream = _db.createRpcStream();
  server.pipe(rpcStream).pipe(server);

  server.on('data', function (data) {
    DEBUG && console.log('S -> ' + data.toString());
  });

  rpcStream.on('data', function (data) {
    DEBUG && console.log('S <- ' + data.toString())
  });

  cb(_db, dispose);

  function dispose () {
    server.close();
    db.close();
  }
};


