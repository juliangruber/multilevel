/**
 * module dependencies
 */

var rpc = require('rpc-stream')
var EventEmitter = require('events').EventEmitter
var methodNames = require('./method_names')
var duplexer = require('duplexer')
var manifest = require('level-manifest')
var msgpack = require('msgpack-stream')
var combine = require('stream-combiner')

module.exports = function (MuxDemux) {

return function (db) {

  var m = manifest(db || {methods: {}}) //fill in the missing bits.

  /**
   * use MuxDemux transparently
   */

  var mdm = MuxDemux()
  var db = duplexer(mdm, mdm) //??

  db.isClient = true

  /**
   * rpc
   */

  var client = db.rpc = rpc(null, true)
  client.pipe(mdm.createStream('rpc')).pipe(client)

  /**
   * isClosed, isOpen, tells you whether you are currently connected
   * use db.close() to disconnect.
   */

  var isOpen = true

  db.isOpen = function () {
    return isOpen
  }

  db.isClosed = function () {
    return !isOpen
  }

  db.destroy = function () {
    db.close()
  }

  db.close = function () {
    isOpen = false
    //the stream will emit 'close'
    db.end()
  }

  db.on('end', function () {
    isOpen = false
  })

  /**
   * rpc methods & streams
   */
    
  var api = db

  ;(function buildAll (db, api, path, parent) {
    var m = manifest(db)
    for (var k in m.methods) {
      ;(function (k) {
          var method = m.methods[k]
          var name = path.concat(k).join('!')
          if(/async|sync/.test(method.type)) {
            api[k] = client.createRemoteCall(name)
          }
          else if(method.type == 'error')
            throw new Error(method.message || 'not supported')
          else {
            api[k] = function () {
              var args = [].slice.call(arguments)
              args.unshift(name)
              var ts = (
                  method.type === 'readable'
                ? mdm.createReadStream(args)
                : method.type == 'writable'
                ? mdm.createWriteStream(args)
                : method.type == 'duplex'
                ? mdm.createStream(args)
                : (function () { throw new Error('not supported') })()
              )
            ts.autoDestroy = false
            return ts
          }
        }
      })(k)
    }

    api._sep    = db._sep
    api._prefix = db._prefix
    api._parent = parent

    api.prefix = function (key) {
      if(!this._parent) return '' + (key || '')
      return (this._parent.prefix()
        + this._sep + this._prefix + this._sep + (key || ''))
    }

    api.sublevel = function (name) {
      if(api.sublevels[name])
        return api.sublevels[name]
      throw new Error('client cannot create new sublevels')
    }

    for(var name in db.sublevels) {
      api.sublevels = api.sublevels || {}
      api.sublevels[name] = {}
      buildAll(db.sublevels[name], api.sublevels[name], path.concat(name), api)
    }
  })(m, api, [], null)

  api.auth = client.createRemoteCall('auth')
  api.deauth = client.createRemoteCall('deauth')
  
  return db
}

}
