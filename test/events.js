var getDb = require('./util').getDb
var test = require('tap').test

test('events', function (t) {
  t.plan(2)
  
  getDb(function (db, dispose) {
    db.on('put', function (key, value) {
      t.equal(key, 'foo')
      t.equal(value, 'bar')
      dispose()
    })

    db.put('foo', 'bar')
  })
})
