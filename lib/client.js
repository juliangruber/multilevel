/**
 * Module dependencies.
 */

var rpc = require('rpc-stream');
var Emitter = require('events').EventEmitter;
var duplexer = require('duplexer');
var manifest = require('level-manifest');
var msgpack = require('msgpack-stream');
var combine = require('stream-combiner');
var inherits = require('util').inherits;
var MuxDemux;

module.exports = function (_MuxDemux) {
  MuxDemux = _MuxDemux;
  return Db;
};

function Db (m) {
  if (!(this instanceof Db)) return new Db(m);
  if (!m) m = manifest({ methods: {} });

  this.isClient = true;
  this._isOpen = false;
  this.methods = m.methods;

  this.mdm = null;
  this.client = null;
  var self = this;

  (function buildAll (_db, db, path, parent) {
    var m = manifest(_db);

    for (var k in m.methods) (function (k) {
      if (/isOpen|isClosed/.test(k)) return;
      var method = m.methods[k];
      var name = path.concat(k).join('!');

      if (method.type == 'error') {
        throw new Error(method.message || 'not supported');
      }

      if (/async|sync/.test(method.type)) {
        db[k] = function () {
          var args = [].slice.call(arguments);
          var cb = typeof args[args.length - 1] == 'function'
            ? args.pop()
            : function () {};
          self.client.rpc(name, args, cb);
        };
      } else {
        db[k] = function () {
          var args = [].slice.call(arguments);
          var mdm = self.mdm;
          args.unshift(name);
          var ts = (
              method.type === 'readable'
            ? mdm.createReadStream(args)
            : method.type == 'writable'
            ? mdm.createWriteStream(args)
            : method.type == 'duplex'
            ? mdm.createStream(args)
            : (function () { throw new Error('not supported') })()
          );
          ts.autoDestroy = false;
          return ts;
        };
      }
    })(k);

    db._sep    = _db._sep || '\xff';
    db._prefix = _db._prefix;
    db._parent = parent;

    for (var name in _db.sublevels) {
      db.sublevels = db.sublevels || {};
      db.sublevels[name] = new Db(_db.sublevels[name]);
      buildAll(_db.sublevels[name], db.sublevels[name], path.concat(name), db);
    }
  })(m, this, [], null);
}

inherits(Db, Emitter);

Db.prototype.sublevel = function (name) {
  if (this.sublevels[name]) return this.sublevels[name];
  throw new Error('client cannot create new sublevels');
};

Db.prototype.prefix = function (key) {
  if (!this._parent) return '' + (key || '');
  return (this._parent.prefix()
    + this._sep + this._prefix + this._sep + (key || ''));
};

Db.prototype.createRpcStream = function () {
  var self = this;
  self._isOpen = true;

  var mdm = self.mdm = MuxDemux();
  mdm.on('end', function () {
    self._isOpen = false;
  });

  var client = self.client = rpc(null, true);
  client.pipe(mdm.createStream('rpc')).pipe(client);

  return mdm;
};

Db.prototype.isOpen = function () {
  return this._isOpen;
};

Db.prototype.isClosed = function () {
  return !this._isOpen;
};

Db.prototype.close = function () {
  this._isOpen = false;
  if (this.mdm) this.mdm.end();
};

Db.prototype.destroy = function () {
  if (this.mdm) this.mdm.close();
};

Db.prototype.auth = function () {
  var args = [].slice.call(arguments);
  var cb = typeof args[args.length - 1] == 'function'
    ? args.pop()
    : function () {};
  this.client.rpc('auth', args, cb);
};

Db.prototype.deauth = function () {
  var args = [].slice.call(arguments);
  var cb = typeof args[args.length - 1] == 'function'
    ? args.pop()
    : function () {};
  this.client.rpc('deauth', args, cb);
};
