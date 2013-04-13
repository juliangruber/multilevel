var getDb = require('./util').getDb
var test = require('tap').test
var sublevel = require('level-sublevel')

test('async', function (t) {
  t.plan(1)
  
  getDb(function (db) {
    sublevel(db)
    db.sublevel('foo')
  }, 
  function (db, dispose) {
    db.sublevels['foo'].put('foo', 'bar', function (err) {
      if (err) throw err
      db.sublevels['foo'].get('foo', function (err, value) {
        if (err) throw err
        t.equal(value, 'bar')
        dispose()
      })
    })
  })
})
