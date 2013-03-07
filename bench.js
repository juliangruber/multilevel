/**
 * Results:
 *
 * writing "1234567890abcdef" 1000 times
 *
 * native             : 14ms (71429 ops/s)
 * multilevel direct  : 405ms (2469 ops/s), traffic: 384030
 * multilevel network : 405ms (2469 ops/s)
 *
 * writing "1234567890abcdef" 10000 times
 *
 * native             : 150ms (66667 ops/s)
 * multilevel direct  : 4176ms (2395 ops/s), traffic: 4146912
 * multilevel network : 10572ms (946 ops/s)
 */

var multilevel = require('./')
var levelup = require('levelup')
var rimraf = require('rimraf')
var net = require('net')

var path = '/tmp/multilevel-test-db'
var str = '1234567890abcdef'

run(1e3, function () {
  run(1e4)
})

function native (num, cb) {
  getDb(function (err, db) {
    if (err) return cb(err) 
    write(db, num, function (err, results) {
      db.close()
      cb(err, 'native             : ' + results)
    })
  })
}

function fakeNetwork (num, cb) {
  getDb(function (err, db) {
    if (err) return cb(err)

    var traffic = 0
    function collect (data) {
      traffic += data.length
    }

    var server = multilevel.server(db)
    var client = multilevel.client()

    server.on('data', collect)
    client.on('data', collect)

    client.pipe(server).pipe(client)
    client.on('remote', function (_db) {
      write(_db, num, function (err, results) {
        db.close()
        cb(err, 'multilevel direct  : ' + results + ', traffic: ' + traffic)
      })  
    })
  })
}

function realNetwork (num, cb) {
  getDb(function (err, db) {
    if (err) return cb(err)

    var server = net.createServer(function (c) {
      c.pipe(multilevel.server(db)).pipe(c)
    })
    server.listen(5001)
    var con = net.connect(5001)

    var client = multilevel.client()
    client.on('remote', function (_db) {
      write(_db, num, function (err, results) {
        db.close()
        server.close()
        con.destroy()
        cb(err, 'multilevel network : ' + results)
      })  
    })
    client.pipe(con).pipe(client)
  })
}

function run (num, cb) {
  console.log('\nwriting "' + str + '" ' + num + ' times\n')

  native(num, function (err, results) {
    log(err, results)
    fakeNetwork(num, function (err, results) {
      log(err, results)
      realNetwork(num, function (err, results) {
        log(err, results)
        if (cb) cb()
      })
    })
  })
}


function log (err, results) {
  if (err) throw err
  console.log(results)
}

function getDb (cb) {
  rimraf.sync(path)
  levelup(path, cb)
}

function write (db, num, cb) {
  var written = 0
  var start = Date.now()
  for (var i = 0; i < num; i++) {
    db.put(''+i, str, function (err) {
      if (err) {
        var oldCb = cb
        cb = function () {}
        return oldCb(err)
      }
      if (++written == num) {
        var duration = Date.now() - start
        cb(
          null,
          duration + 'ms (' + (Math.round(num/duration*1000)) + ' ops/s)'
        )
      }
    })
  }
}
