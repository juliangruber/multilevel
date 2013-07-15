var getDb = require('./util').getDb
var test = require('tape')

test('sync', function (t) {
  t.plan(1)
  
  getDb(function (db, dispose) {
    db.isClosed(function (err, isClosed) {
      t.equal(isClosed, false)
      dispose()
    })
  })
})
