var getDb = require('./util').getDb
var test = require('tap').test

test('async', function (t) {
  t.plan(1)
  
  getDb(function (db, dispose) {
    db.put('foo', 'bar', function (err) {
      if (err) throw err
      db.get('foo', function (err, value) {
        if (err) throw err
        t.equal(value, 'bar')
        dispose()
      })
    })
  })
})
