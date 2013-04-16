var getDb = require('./util').getDb
var test = require('tap').test
var sublevel = require('level-sublevel')
var LiveStream = require('level-live-stream')

test('stream', function (t) {
  t.plan(10)
  var j = 10
  getDb(function (db) {
    sublevel(db)
    var foo = db.sublevel('foo')
    LiveStream.install(foo)
  },
  function (db, dispose) {
    var foo = db.sublevel('foo')

    var ls = foo.liveStream()
      .on('data', function (d) {
        t.equal(j-- * 1000, Number(d.value))

        if(j) return
        dispose()
        t.end()

      })

    var i = 10
    var int = setInterval(function () {
      foo.put(i, i*1000, function () {})
      if(--i) return
      clearInterval(int)
    }, 100)

  })
})
