
var getDb = require('./util').getDb
var test = require('tape');

require('./util')(function (test, _, getDb) {

  test('event', function (t) {
    t.plan(1)
  
    getDb(function (db, dispose) {
      t.throws(function(){
        db.on('put', function(){});
      })
    })
  })

})
