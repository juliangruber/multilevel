var getDb = require('./util').getDb
var test = require('tap').test

test('events', function (t) {
  t.plan(2)
  
  getDb(function (db) {
    db.on('put', function (key, value) {
      t.equal(key, 'foo')
      t.equal(value, 'bar')
    })

    db.put('foo', 'bar')
  })
})