var level = require('level-test')();
var manifest = require('level-manifest');
var net = require('net');

var DEBUG = process.env.DEBUG

var multilevel = require('../')
var multilevelMsgpack = require('../msgpack')

var tape = require('tape')

var util = module.exports = function (tests) {
  function prefix(pre) {
    return function (name, test) {
      return tape(pre + ': ' + name, test)
    }
  }

  tests(
    prefix('jsonb'),
    multilevel,
    util.createGetDb(multilevel)
  );
  tests(
    prefix('msgpack'),
    multilevelMsgpack,
    util.createGetDb(multilevelMsgpack)
  );
};

util.getLocalDb = function () {
  return level();
};

//util.getDb = 
util.createGetDb = function (multilevel) {
  return function (setup, cb) {
    if (!cb) {
      cb = setup;
      setup = null;
    }

    var db = util.getLocalDb();
    var opts;
    if (setup) opts = setup(db);

    var m = manifest(db);

    var server = multilevel.server(db, opts);
    server.on('data', function (data) {
      DEBUG && console.log('S -> ' + data.toString());
    });
    var _db = multilevel.client(m);

    function createRpcStream () {
      var rpcStream = _db.createRpcStream();
      rpcStream.on('data', function (data) {
        DEBUG && console.log('S <- ' + data.toString())
      });
      return rpcStream;
    }

    server.pipe(createRpcStream()).pipe(server);
    cb(_db, dispose);

    function dispose () {
      db.close();
    }
  };
};

util.getDb = util.createGetDb(multilevel)
