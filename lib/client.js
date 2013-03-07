/**
 * module dependencies
 */

var MuxDemux = require('mux-demux')
var rpc = require('rpc-stream')
var emitStream = require('emit-stream')
var pauseStream = require('pause-stream')
var EventEmitter = require('events').EventEmitter
var methodNames = require('./method_names')
var duplexer = require('duplexer')

module.exports = function () {

  /**
   * use MuxDemux transparently
   */

  var mdm = MuxDemux()
  var db = duplexer(mdm, mdm)
  
  /**
   * rpc
   */

  var client = db.rpc = rpc()
  var remote = client.wrap(methodNames('sync', 'async', 'stream'))

  // wait for the connection to be up
  var ps = pauseStream().pause()
  client.pipe(ps)

  /**
   * keep isOpen and isClosed up2date
   */

  var isOpen = true
  db.on('connection', function (c) {
    if (c.meta != 'rpc') return
    remote.isOpen(function (_isOpen) {
      isOpen = _isOpen
    })
  })
  db.on('open', function () { isOpen = true })
  db.on('close', function () { isOpen = false })
  
  /**
   * rpc methods
   */
  
  methodNames('async', 'sync').forEach(function (method) {
    db[method] = function (/* args */) {
      var args = [].slice.call(arguments)
      if (typeof args[args.length - 1] != 'function') {
        args.push(function () { /* noop */ })
      }
      remote[method].apply(remote, args)
    }

    if (method == 'isOpen' || method == 'isClosed') {
      var old = db[method]
      db[method] = function (cb) {
        if (cb) return old(cb)
        return method == 'isOpen'
          ? isOpen
          : !isOpen
      }
    }
  })
  
  /**
   * methods returning streams
   */
  
  methodNames('stream').forEach(function (method) {
    db[method] = function () {
      var stream = pauseStream().pause()
      var id = Math.random().toString(16).slice(2)
      var args = [].slice.call(arguments)
      args.unshift(id)
      
      mdm.on('connection', function onConnection (c) {
        if (c.meta == id) {
          mdm.removeListener('connection', onConnection)
          c.pipe(stream).pipe(c)
          stream.resume()
        }
      })
      
      remote[method].apply(remote, args)
      
      return stream
    }
  })
 
  /**
   * connection logic
   */

  mdm.on('connection', function (c) {
    if (c.meta == 'events') {
      emitStream(c).emit = db.emit.bind(db)
    } else if (c.meta == 'rpc') {
      ps.pipe(c).pipe(client)
      ps.resume()
      c.on('end', function () {
        ps.pause()
      })
    }
  })
  
  return db
}
