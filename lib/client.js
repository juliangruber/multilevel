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
var codec = require('level-codec');

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
  this.codec = new codec.Codec(m.options);
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

  var client = self.client = rpc(null, { raw: true });
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

// EventEmitter special casing, to prevent
// users from listening to db events
// like "put", although they are not supported

var on = Db.prototype.on;
var allowed = [
  'error',
  'pipe',
  'open',
  'close'
];

Db.prototype.addEventListener =
Db.prototype.on = function(ev, fn){
  if (allowed.indexOf(ev) == -1) throw new Error('not supported');
  return on.call(this, ev, fn);
};

Db.prototype.pipe = deprecated;

function deprecated () {
  throw new Error(
    'The API changed. Use db.createRpcStream().'
  );
}


Db.prototype._buildAll = function (_db, db, path, parent) {
  var self = this;
  var m = manifest(_db, true /* terse */);
  var isLeveldb = db == self || !!parent; // not nested object

  for (var k in m.methods) {
    var method = m.methods[k];
    var type = method.type;
    var name = path.concat(k).join('!');

    if (type == 'error') throw new Error(method.message || 'not supported');

    if (/async|sync/.test(type)) {
      self._asyncSync(db, k, name, isLeveldb);
    } else if (/readable|writable/.test(type)) {
      self._stream(db, k, name, type);
    } else if (type == 'object') {
      db[k] = new Emitter;
      self._buildAll(method, db[k], path.concat('.' + k));
    }
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

Db.prototype._asyncSync = function (db, k, name, isLeveldb) {
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

    var optsIdx, opts, tempOpts;

    if (isLeveldb) {
      optsIdx = self._getOpts(k, args);
      opts = args[optsIdx] || {};
      tempOpts = {};

      self._encodeArgs(k, args, opts, tempOpts);

      if (k == 'get' || k == 'put' || k == 'del' || k == 'batch') {
        if (self.codec.keyAsBuffer(opts)) tempOpts.keyEncoding = 'binary';
        if (self.codec.valueAsBuffer(opts)) tempOpts.valueEncoding = 'binary';
        if (typeof optsIdx == 'number') {
          args[optsIdx] = tempOpts;
        } else {
          args.push(tempOpts);
        }
      }
    }

    self._queue(function () {
      self.client.rpc(name, args, function () {
        var cbArgs = [].slice.call(arguments);
        if (isLeveldb) self._decodeArgs(k, cbArgs, opts);
        cb.apply(db, cbArgs);
      });
    });
  };
};

Db.prototype._getOpts = function (k, args) {
  if (k == 'get' || k == 'del' || k == 'batch') return 1;
  if (k == 'put') return 2;
};

Db.prototype._encodeArgs = function (k, args, opts, tempOpts) {
  var self = this;

  var keyIdx;
  if (k == 'get' || k == 'del' || k == 'put') keyIdx = 0;

  var valueIdx;
  if (k == 'put') valueIdx = 1;

  var opsIdx;
  if (k == 'batch') opsIdx = 0;

  if (typeof keyIdx != 'undefined') {
    args[keyIdx] = this.codec.encodeKey(args[keyIdx], opts);
    if (this.codec.keyAsBuffer(opts)) tempOpts.keyEncoding = 'binary';
  }
  if (typeof valueIdx != 'undefined') {
    args[valueIdx] = this.codec.encodeValue(args[valueIdx], opts);
    if (this.codec.valueAsBuffer(opts)) tempOpts.valueIdxEncoding = 'binary';
  }
  if (typeof opsIdx != 'undefined') {
    args[opsIdx] = this.codec.encodeBatch(args[opsIdx], opts);
  }
};

Db.prototype._decodeArgs = function (k, cbArgs, opts) {
  if (k == 'get' && !cbArgs[0]) {
    cbArgs[1] = this.codec.decodeValue(cbArgs[1], opts);
  }
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

function isObject (o) {
  return o !== null && typeof o == 'object';
}

