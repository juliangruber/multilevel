/**
 * module dependencies
 */

var MuxDemux = require('mux-demux')
var rpc = require('rpc-stream')
//var emitStream = require('emit-stream')
var EventEmitter = require('events').EventEmitter
var methodNames = require('./method_names')
var duplexer = require('duplexer')
var manifest = require('level-manifest')

module.exports = function (db) {

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
   * keep isOpen and isClosed up2date
  */
  /*
//  var isOpen = true
//  db.on('connection', function (c) {
//    if (c.meta != 'rpc') return
//    remote.isOpen(function (_isOpen) {
//      isOpen = _isOpen
//    })
//  })
//  db.on('open', function () { isOpen = true })
//  db.on('close', function () { isOpen = false })
  */

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
