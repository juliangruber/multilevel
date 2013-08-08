
var sublevel = require('level-sublevel');

require('./util')(function (test, _, getDb) {
  test('async', function (t) {
    t.plan(3);
  
    getDb(function (db) {
      sublevel(db);
    }, 
    function (db, dispose) {
      t.ok(db.isClient);
      db.sublevel('foo').put('foo', 'bar', function (err) {
        if (err) throw err;
        db.sublevel('foo').get('foo', function (err, value) {
          if (err) throw err;
          t.equal(value, 'bar');
          dispose();
        })
      })
    })
  })
})
