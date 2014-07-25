var getDb = require('./util').getDb
var test = require('tape')
var sublevel = require('level-sublevel')

require('./util')(function (test, _, getDb) {

  test('nested-stream', function (t) {
    t.plan(4)

    getDb(function (db) {
      db = sublevel(db)
      db.sublevel('foo')
      return { db: db }
    },
    function (db, dispose) {
      db = db.sublevels['foo'];
      db.put('foo', 'bar', function (err) {
        if (err) throw err
        db.createReadStream()
        .on('data', function (data) {
          t.equal(data.key, 'foo')
          t.equal(data.value, 'bar')
        })
        .on('end', function () {
          db.batch([
            { key : 'bar', value : 'baz' }
          ], function (err) {
            if(err) throw err
            // temporary fix for level-js
            setTimeout(function () {
              db.get('bar', function (err, value) {
                t.notOk(err);
                t.equal(value, 'baz');
                dispose();
              });
            }, 100);
          })
        })
      })
    })
  })
})
