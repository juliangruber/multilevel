/**
 * module dependencies
 */

var dnode = require('dnode')
var MuxDemux = require('mux-demux')
var levelup = require('levelup')
var emitStream = require('emit-stream')

var sync = [
  'isOpen', 'isClosed'
]

var async = [
  'put', 'get', 'del', 'batch', 'approximateSize'
]

var stream = [
  'readStream', 'keyStream', 'valueStream', 'writeStream'
]

module.exports = function (db) {
  if (typeof db == 'string') db = levelup(db)
  
  var server = MuxDemux()
  
  /**
   * events
   */
   
  emitStream(db).pipe(server.createStream('events'))
  
  /**
   * methods
   */
  
  var methods = {}
  
  /**
   * synchronous methods
   */
  
  sync.forEach(function (method) {
    methods[method] = function (cb) {
      cb(null, db[method]())
    }
  })
  
  /**
   * asynchronous methods
   */
  
  async.forEach(function (method) {
    methods[method] = db[method].bind(db)
  })
  
  /**
   * methods returning streams
   */
   
  stream.forEach(function (method) {
    methods[method] = function () {
      var args = [].slice.call(arguments)
      var id = args.shift()
      var stream = db[method].apply(db, args)
      var idstream = server.createStream(id)
      if (stream.readable) stream.pipe(idstream)
      if (stream.writable) idstream.pipe(stream)
    }
  })
  
  /**
   * dnode
   */
  
  var d = dnode(methods)
  d.pipe(server.createStream('dnode')).pipe(d)
  
  return server
}