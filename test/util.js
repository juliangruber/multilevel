var util = module.exports = {}
var multilevel = require('..')
var rimraf = require('rimraf')

util.getDb = function (cb) {
  rimraf(__dirname + '/db', function (err) {
    if (err) throw err
    
    var server = multilevel.server(__dirname + '/db')
    var client = multilevel.client()
    client.on('remote', cb)
    server.pipe(client).pipe(server)
  })
}