var getDb = require('./util').getDb
var test = require('tap').test

test('sync isOpen / isClosed', function (t) {
  t.plan(3)
  
  getDb(function (db, dispose) {
    t.assert(db.isOpen())
    t.assert(!db.isClosed())
    db.rpc.emit('end')
    t.assert(db.isClosed())
    dispose()
  })
})
