/**
 * module dependencies
 */

var MuxDemux = require('mux-demux')
var rpc = require('rpc-stream')
//var emitStream = require('emit-stream')
//var methodNames = require('./method_names')

var manifest = require('level-manifest')

module.exports = function (db) {
  if (typeof db == 'string') throw 'database instance required'
  
  var mdm = MuxDemux()
  
  var server = rpc(null, true)

  /**
   * events
   */
  //remove this, because othewise each put, batch, del
  //event will send ALL the inserted data to every client!
  //emitStream(db).pipe(mdm.createStream('events'))
  
  /**
   * methods
   */
  
  var m = manifest(db)
  
  /**
   * rpc
   */
  
  var handlers = {}

  ;(function buildAll (db, path) {
    var m = manifest(db)
    for (var k in m.methods) {
      ;(function (k) {
        var name = path.concat(k).join('!')
        var method = m.methods[k]
        if(method.type == 'async') {
          server.createLocalCall(name, function () {
            db[k].apply(db, arguments) //should include a callback
          })
        }
        else if(method.type == 'sync') {
          server.createLocalCall(name, function (cb) {
            var r
            try {
              r = db[k]()
            } catch (err) {
              return cb(err)
            }
            cb(null, r)
          })
        }
        else {
          handlers[name] = function (args) {
            return db[k].apply(db, args)
          }
        }
      })(k)
    }
    for(var name in db.sublevels) {
      buildAll(db.sublevels[name], path.concat(name))
    }
  })(db, [])
  
  
  mdm.on('connection', function (con) {
    if(con.meta == 'rpc')
      return con.pipe(server).pipe(con)
    var stream = handlers[con.meta[0]](con.meta.slice(1))
    if (stream.readable) stream.pipe(con)
    if (stream.writable) con.pipe(stream)
  })
  
  return mdm
}
