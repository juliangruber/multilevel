var util = module.exports = {}
var multilevel = require('..')
var rimraf = require('rimraf')
var net = require('net')

util.getDb = function (cb) {
  rimraf(__dirname + '/db', function (err) {
    if (err) throw err
    
    var port = 10000 + Math.round(Math.random() * 10000)

    net.createServer(function (con) {
      con.pipe(multilevel.server(__dirname + '/db')).pipe(con)
    }).listen(port)
  
    var client = multilevel.client()
    client.on('remote', function (remote) {
      cb(remote, process.exit.bind(process, 0))
    })
    client.pipe(net.connect(port)).pipe(client)
  })
}
