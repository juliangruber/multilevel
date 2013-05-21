var util = module.exports = {}
var multilevel = require('../')
var rimraf = require('rimraf')
var net = require('net')
var levelup = require('level')
var freeport = require('freeport')
var manifest = require('level-manifest')

var DEBUG = process.env.DEBUG

util.getDb = function (setup, cb) {
  if(!cb) cb = setup, setup = null
  rimraf(__dirname + '/db', function (err) {
    if (err) throw err
    
    var db = levelup(__dirname + '/db')
    var opts
    if(setup) opts = setup(db)

    var m = manifest(db)

    var server = net.createServer(function (con) {
      con.on('error', function () { /* noop */ })
      var server = multilevel.server(db, opts)

      con.on('data', function (data) {
        DEBUG && console.log('S <- ' + data.toString())
      })
      server.on('data', function (data) {
        DEBUG && console.log('S -> ' + data.toString())
      })

      con.pipe(server).pipe(con)
    })

    freeport(function (err, port) {
      if (err) throw err

      server.listen(port, function () {
        var _db = multilevel.client(m)
        var con = net.connect(port)
        con.on('error', function () { /* noop */})
        _db.pipe(con).pipe(_db)

        _db.on('data', function (data) {
          DEBUG && console.log('C -> ' + data)
        })

        cb(_db, dispose)

        function dispose () {
          server.close()
          db.close()
          con.destroy()
        }
      })
    })
  })
}


