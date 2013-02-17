var getDb = require('./util').getDb
var test = require('tap').test

test('stream', function (t) {
  t.plan(4)
  
  getDb(function (db) {
    db.put('foo', 'bar', function (err) {
      if (err) throw err
      
      db.readStream()
      .on('data', function (data) {
        t.equal(data.key, 'foo')
        t.equal(data.value, 'bar')
      })
      .on('end', function () {
        db.on('put', function (key, value) {
          t.equal(key, 'bar')
          t.equal(value, 'baz')
        })

        var stream = db.writeStream()
        stream.write({ key : 'bar', value : 'baz' })
        stream.end()
      })
    })
  })
})