/**
 * Results:
 *
 * writing "1234567890abcdef" 10000 times
 *
 * native             : 124ms (80645 ops/s)
 * multilevel direct  : 601ms (16639 ops/s)
 * multilevel network : 794ms (12594 ops/s)
 */

var multilevel = require('..')
var levelup = require('levelup')
var rimraf = require('rimraf')
var net = require('net')
var spawn = require('child_process').spawn

var path = '/tmp/multilevel-test-db'
var str = '1234567890abcdef'
var clients = 5

var write = require('./write')(str);

run(1e2, function () {
  run(1e3, function () {
    run(1e4, function () {
      run(1e5)
    })
  })
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

    /*var traffic = 0
    function collect (data) {
      traffic += data.length
    }*/

    var dbs = [];

    for (var i = 0; i < clients; i++) {
      var server = multilevel.server(db)
      var _db = multilevel.client()
      _db.pipe(server).pipe(_db)
      dbs.push(_db);
    }

    /*server.on('data', collect)
    client.on('data', collect)*/

    setTimeout(function () {
      write(dbs, num, function (err, results) {
        db.close();
        cb(err, 'multilevel direct  : ' + results/* + ', traffic: ' + traffic*/)
      })  
    }, 1000)
  })
}

function realNetwork (num, cb) {
  getDb(function (err, db) {
    if (err) return cb(err)

    var server = net.createServer(function (c) {
      c.pipe(multilevel.server(db)).pipe(c)
    })

    server.listen(5001, function () {
      var exited = 0;
      var duration = 0;
      for (var i = 0; i < clients; i++) {
        var start = Date.now();
        var ps = spawn('node', [__dirname + '/client.js', 5001, num/clients, str]);
        ps.stderr.pipe(process.stderr)
        ps.stdout.on('data', function (data) {
          var _num = Number(data.toString())
          if (_num > duration) duration = _num

          if (++exited == clients) {
            server.close();
            db.close();

            cb(null, 'multilevel network : '
                      + duration + 'ms ('
                      + (Math.round(num/duration*1000))
                      + ' ops/s)')
          }
        })
      }
    })
  })
}

function run (num, cb) {
  console.log('\nwriting "%s" %s times', str, num)

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
