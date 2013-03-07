var util = module.exports = {}
var multilevel = require('..')
var rimraf = require('rimraf')
var net = require('net')
var levelup = require('levelup')

util.getDb = function (cb) {
  rimraf(__dirname + '/db', function (err) {
    if (err) throw err
    
    var port = 10000 + Math.round(Math.random() * 10000)
    var db = levelup(__dirname + '/db')

    var server = net.createServer(function (con) {
      var server = multilevel.server(db)

      con.on('data', function (data) {
        //console.log('S <- ' + data.toString())
      })
      server.on('data', function (data) {
        //console.log('S -> ' + data.toString())
      })

      con.pipe(server).pipe(con)
    })
    server.listen(port)
  
    var client = multilevel.client()
    client.on('data', function (data) {
      //console.log('C -> ' + data)
    })

    client.on('remote', function (remote) {
      cb(remote, dispose)
    })

    var con = net.connect(port)
    client.pipe(con).pipe(client)

    function dispose () {
      server.close()
      db.close()
      con.destroy()
    }
  })
}
