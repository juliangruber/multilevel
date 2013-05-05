var getDb = require('./util').getDb
var test = require('tap').test

test('binary', function (t) {
  getDb(function (db, dispose) {
    db.put('foo', new Buffer([1,2,3]), { valueEncoding : 'binary' }, function (err) {
      t.error(err)
      db.get('foo', { valueEncoding : 'binary' }, function (err, value) {
        t.error(err)
        t.ok(Buffer.isBuffer(value))
        t.equal(value.toString(), new Buffer([1,2,3]).toString())
        dispose()
        t.end()
      })
    })
  })
})
