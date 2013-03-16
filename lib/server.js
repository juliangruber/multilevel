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

  mdm.on('connection', function (con) {
    var stream = db[con.meta[0]].apply(db, con.meta.slice(1))
    if (stream.readable) stream.pipe(con)
    if (stream.writable) con.pipe(stream)
  })
  
  /**
   * rpc
   */
  
  var server = rpc(methods, true)
  server.pipe(mdm.createStream('rpc')).pipe(server)
  
  return mdm
}
