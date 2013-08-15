/**
 * Module dependencies.
 */

var rpc = require('rpc-stream');
var Emitter = require('events').EventEmitter;
var duplexer = require('duplexer');
var manifest = require('level-manifest');
var combine = require('stream-combiner');
var inherits = require('util').inherits;
var tmpStream = require('tmp-stream');

module.exports = function (MuxDemux) {

function Db (m) {
  if (!(this instanceof Db)) return new Db(m);
  if (!m) m = manifest({ methods: {} });
  Emitter.call(this);

  this.isClient = true;
  this._isOpen = false;
  this.methods = m.methods;

  this.mdm = null;
  this.client = null;
  var self = this;

  this._buildAll(m, this, [], null);
  this.on('pipe', deprecated);
}

inherits(Db, Emitter);

Db.prototype.sublevel = function (name) {
  if (!this.sublevels || !this.sublevels[name]) {
    throw new Error('client cannot create new sublevels');
  }
  return this.sublevels[name];
};

Db.prototype.prefix = function (key) {
  if (!this._parent) return '' + (key || '');
  return (this._parent.prefix()
    + this._sep + this._prefix + this._sep + (key || ''));
};

Db.prototype.createRpcStream = function () {
  var self = this;
  self._isOpen = true;

  var mdm = self.mdm = MuxDemux({ error: true });
  mdm.on('end', function () {
    self._isOpen = false;
    self.emit('close');
  });

  var client = self.client = rpc(null, true);
  var rpcStream = mdm.createStream('rpc');
  rpcStream.on('error', function () {});
  client.pipe(rpcStream).pipe(client);

  setTimeout(function () {
    self.emit('open');
  });

  return mdm;
};

Db.prototype.close = function (cb) {
  this._isOpen = false;
  if (this.mdm) this.mdm.end();
  if (cb) process.nextTick(cb);
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

Db.prototype.pipe = deprecated;

function deprecated () {
  throw new Error(
    'The API changed. Use db.createRpcStream().'
  );
}


Db.prototype._buildAll = function (_db, db, path, parent) {
  var self = this;
  var m = manifest(_db);

  for (var k in m.methods) {
    var method = m.methods[k];
    var type = method.type;
    var name = path.concat(k).join('!');

    if (type == 'error') throw new Error(method.message || 'not supported');

    /async|sync/.test(type)
      ? self._asyncSync(db, k, name)
      : self._stream(db, k, name, type);
  }

  db._sep = _db._sep || '\xff';
  db._prefix = _db._prefix;
  db._parent = parent;

  for (var name in _db.sublevels) {
    var sublevel = _db.sublevels[name];
    db.sublevels = db.sublevels || {};
    db.sublevels[name] = new Db(sublevel);
    self._buildAll(sublevel, db.sublevels[name], path.concat(name), db);
  }
};

Db.prototype._asyncSync = function (db, k, name) {
  var self = this;

  db[k] = function () {
    var args = [].slice.call(arguments);
    var cb = typeof args[args.length - 1] == 'function'
      ? args.pop()
      : null;

    if (/is(Open|Closed)/.test(k) && !cb) {
      if (k == 'isOpen') return self._isOpen;
      else return !self._isOpen;
    }

    if (!cb) cb = function (err) {
      if (err) db.emit('error', err)
    };

    self._queue(function () {
      self.client.rpc(name, args, cb);
    });
  };
};

Db.prototype._stream = function (db, k, name, type) {
  var self = this;

  db[k] = function () {
    var args = [].slice.call(arguments);
    args.unshift(name);

    var tmp = tmpStream();

    self._queue(function () {
      var mdm = self.mdm;
      var ts = (
          type === 'readable'
        ? mdm.createReadStream(args)
        : type == 'writable'
        ? mdm.createWriteStream(args)
        : type == 'duplex'
        ? mdm.createStream(args)
        : (function () { throw new Error('not supported') })()
      );
      ts.autoDestroy = false;
      tmp.replace(ts);
    });

    return tmp;
  };
};

Db.prototype._queue = function (fn) {
  if (this._isOpen) fn();
  else this.once('open', fn);
};

return Db;

};

