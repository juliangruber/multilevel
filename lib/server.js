/**
 * module dependencies
 */

var MuxDemux = require('mux-demux')
var rpc = require('rpc-stream')

var manifest = require('level-manifest')

module.exports = function (db, opts) {
  if (typeof db == 'string') throw 'database instance required'
  
  var mdm = MuxDemux()

  opts = opts || {}
  var auth = opts.auth || function () {
    var cb = [].pop.call(arguments)
    cb(null, true)
  }

  var deauth = opts.deauth || function () {
    var cb = [].pop.call(arguments)
    
  }

  var access = opts.access || function (db, method, args) {
    return true
  }
  
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
          server.createLocalCall(name, function (args, cb) {
            access(db, name, args)
            args.push(cb)
            db[k].apply(db, args) //should include a callback
          })
        }
        else if(method.type == 'sync') {
          server.createLocalCall(name, function (args, cb) {
            access(db, name, args)
            var r
            try {
              r = db[k].apply(db, args)
            } catch (err) {
              return cb(err)
            }
            cb(null, r)
          })
        }
        else {
          handlers[name] = function (args) {
            access(db, name, args)
            return db[k].apply(db, args)
          }
        }
      })(k)
    }
    for(var name in db.sublevels) {
      buildAll(db.sublevels[name], path.concat(name))
    }
  })(db, [])

//  server.createLocalCall('login', function (cb) {
//    if(opts
//  })
  
  mdm.on('connection', function (con) {
    if(con.meta == 'rpc')
      return con.pipe(server).pipe(con)
    try {
      console.log('remote stream', con.meta[0], con.meta.slice(1))
      var stream = handlers[con.meta[0]](con.meta.slice(1))
      if (stream.readable) stream.pipe(con)
      if (stream.writable) con.pipe(stream)
    } catch (err) {
      stream.error(err)
    }
  })
  
  return mdm
}
