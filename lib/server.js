/**
 * module dependencies
 */

var MuxDemux = require('mux-demux')
var rpc = require('rpc-stream')
var emitStream = require('emit-stream')
var methodNames = require('./method_names')

module.exports = function (db) {
  if (typeof db == 'string') throw 'database instance required'
  
  var mdm = MuxDemux()
  
  /**
   * events
   */
   
  emitStream(db).pipe(mdm.createStream('events'))
  
  /**
   * methods
   */
  
  var methods = {}
  
  /**
   * synchronous methods
   */
  
  methodNames('sync').forEach(function (method) {
    methods[method] = function (cb) {
      cb(null, db[method]())
    }
  })
  
  /**
   * asynchronous methods
   */
  
  methodNames('async').forEach(function (method) {
    methods[method] = db[method].bind(db)
  })
  
  /**
   * methods returning streams
   */
   
  methodNames('stream').forEach(function (method) {
    methods[method] = function () {
      var args = [].slice.call(arguments)
      var id = args.shift()
      var stream = db[method].apply(db, args)
      var idstream = mdm.createStream(id)
      if (stream.readable) stream.pipe(idstream)
      if (stream.writable) idstream.pipe(stream)
    }
  })
  
  /**
   * rpc
   */
  
  var server = rpc(methods, true)
  server.pipe(mdm.createStream('rpc')).pipe(server)
  
  return mdm
}
