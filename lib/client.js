/**
 * module dependencies
 */

var MuxDemux = require('mux-demux')
var rpc = require('rpc-stream')
var emitStream = require('emit-stream')
//var pauseStream = require('pause-stream')
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
  
  /**
   * rpc
   */

  var client = db.rpc = rpc(null, true)
//  var remote = client.wrap(methodNames('sync', 'async', 'stream'))

  // wait for the connection to be up
//  var ps = pauseStream().pause()
//  client.pipe(ps)

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
   * rpc methods
   */
  
//  methodNames('async', 'sync').forEach(function (method) {
//    db[method] = function (/* args */) {
//      var args = [].slice.call(arguments)
//      if (typeof args[args.length - 1] != 'function') {
//        args.push(function () { /* noop */ })
//      }
//      remote[method].apply(remote, args)
//    }
//
//    if (method == 'isOpen' || method == 'isClosed') {
//      var old = db[method]
//      db[method] = function (cb) {
//        if (cb) return old(cb)
//        return method == 'isOpen'
//          ? isOpen
//          : !isOpen
//      }
//    }
//  })*/
  
  /**
   * methods returning streams
   */
  
  /*
//  methodNames('stream').forEach(function (method) {
//    db[method] = function () {
//      var args = [].slice.call(arguments)
//      args.unshift(method)
//      return mdm.createStream(args)
//    }
//  })
  */
 
  /**
   * connection logic
   */

  /*
//  mdm.on('connection', function (c) {
//    if (c.meta == 'events') {
//      emitStream(c).emit = db.emit.bind(db)
//    } else if (c.meta == 'rpc') {
//      ps.pipe(c).pipe(client)
//      ps.resume()
//      c.on('end', function () {
//        ps.pause()
//      })
//    }
//  })
  */

  var api = db

  ;(function buildAll (db, api, path) {
    var m = manifest(db)
    for (var k in m.methods) {
      ;(function (k) {
          var method = m.methods[k]
          if(/async|sync/.test(method.type)) {
            api[k] = client.createRemoteCall(path.concat(k).join('!'))
          }
          else if(method.type == 'error')
            throw new Error(method.message || 'not supported')
          else {
            var name = path.concat(k)
            api[k] = function () {
              var args = [].slice.call(arguments)
              args.unshift(name)
              var ts = (
                  method.type === 'readable'
                ? mdm.createReadStream.apply(mdm, args)
                : method.type == 'writable'
                ? mdm.createWriteStream.apply(mdm, args)
                : method.type == 'duplex'
                ? mdm.createStream(mdm, args)
                : (function () { throw new Error('not supported') })()
              )
            ts.autoDestroy = false
            return ts
          }
        }
      })(k)
    }
    for(var name in db.sublevels) {
      api.sublevels[name] = {}
      buildAll(db.sublevels[name], api.sublevels[name], path.concat(name))
    }
  })(m, api, [])
  
  return db
}
