var multilevel = require('./')
var levelup = require('levelup')
var rimraf = require('rimraf')

var path = '/tmp/multilevel-test-db'
var str = '1234567890abcdef'
var num = 1e2

var db

function native (cb) {
  getDb(function () {
    write(db, cb)
  })
}

function network (cb) {
  getDb(function () {
    var server = multilevel.server(db)
    var client = multilevel.client()
    client.pipe(server).pipe(client)
    client.on('remote', function (_db) {
      write(_db, cb)  
    })
  })
}

native(function () {
  network(function () {
  
  })
})

function getDb (cb) {
  if (db) db.close()
  rimraf.sync(path)
  levelup(path, function (err, _db) {
    if (err) throw err
    db = _db
    cb()
  })
}

function write (db, cb) {
  var written = 0
  var start = Date.now()
  for (var i = 0; i < num; i++) {
    db.put(''+i, str, function (err) {
      if (err) throw err
      if (++written == num) {
        console.log('took ' + (Date.now() - start) + 'ms')
        cb()
      }
    })
  }
}
