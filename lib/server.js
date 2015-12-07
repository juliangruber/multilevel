var rpc = require('rpc-stream');
var manifest = require('level-manifest');

module.exports = function (MuxDemux) {

return function (db, opts) {
  if (typeof db == 'string') throw new Error('database instance required');

  if('function' === typeof db.sublevel) {
    if(!(db.version >= '6'))
      throw new Error('expected a level-sublevel@6 or greater')
  }

  var mdm = MuxDemux({ error: true });

  opts = opts || {};

  var deauth = opts.deauth || function () {};
  var auth = opts.auth || function () {
    var cb = [].pop.call(arguments);
    cb(null, true);
  };
  var access = opts.access || function () { return true };

  var server = rpc(null, { raw: true, flattenError: flatten });
  var handlers = {};

  (function buildAll (db, path) {
    var m = manifest(db);
    for (var k in m.methods) (function (k) {
      var name = path.concat(k).join('!');
      var method = m.methods[k];

      if (method.type == 'async') {
        server.createLocalCall(name, function (args, cb) {
          access(server.sessionData, db, k, args);
          args.push(cb);
          db[k].apply(db, args);
        });
      } else if (method.type == 'sync') {
        server.createLocalCall(name, function (args, cb) {
          access(server.sessionData, db, k, args);
          var r;
          try { r = db[k].apply(db, args) }
          catch (err) { return cb(err) }
          cb(null, r);
        });
      } else if (method.type == 'object') {
        db[k].methods = method.methods;
        buildAll(db[k], path.concat('.' + k));
      } else {
        handlers[name] = function (args) {
          access(server.sessionData, db, k, args);
          return db[k].apply(db, args);
        };
      }
    })(k);

    for(var name in db.sublevels) {
      buildAll(db.sublevels[name], path.concat(name));
    }
  })(db, []);

  server.createLocalCall('auth', function (args, cb) {
    auth.apply(null, args.concat(function authCb (err, data) {
      if (err) return cb(err);
      server.sessionData = data;
      cb(null, data);
    }));
  });

  server.createLocalCall('deauth', function (args, cb) {
    server.sessionData = null;
    if (opts.deauth) opts.deauth.apply(null, args);
    else cb();
  });

  mdm.on('connection', function (con) {
    con.on('error', function () {});

    if (con.meta == 'rpc') return con.pipe(server).pipe(con);

    try {
      var stream = handlers[con.meta[0]](con.meta.slice(1));
      // prevent iterators from staying open when connection fails
      con.once('error', function () {
        var method = stream[stream.readable ? 'destroy' : 'end']
        if(method) method.call(stream)
      });
      if (stream.readable) stream.pipe(con);
      if (stream.writable) con.pipe(stream);
      stream.on('error', function (err) {
        con.error(flatten(err));
      });
    } catch (err) {
      con.error(flatten(err));
    }
  });

  return mdm;
};

};

function flatten(err){
  if(!(err instanceof Error)) return err;
  var err2 = {
    message: err.message,
    type: err.type,
    notFound: err.notFound,
    status: err.status
  };
  for (var k in err) err2[k] = err[k];
  return err2;
}
