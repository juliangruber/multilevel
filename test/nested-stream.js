var getDb = require('./util').getDb
var test = require('tap').test
var sublevel = require('level-sublevel')

test('nested-stream', function (t) {
  t.plan(4)
  
  getDb(function (db) {
    sublevel(db)
    db.sublevel('foo')
  }, 
  function (db, dispose) {
    db = db.sublevels['foo']
    db.put('foo', 'bar', function (err) {
      if (err) throw err
      
      db.createReadStream()
      .on('data', function (data) {
        t.equal(data.key, 'foo')
        t.equal(data.value, 'bar')
      })
      .on('end', function () {
        var stream = db.writeStream()
        stream.write({ key : 'bar', value : 'baz' })
        stream.on('close', function () {
            db.get('bar', function (err, value) {
              t.notOk(err)
              t.equal(value, 'baz')
              dispose()
            })
        })
        stream.end()
      })
    })
  })
})
