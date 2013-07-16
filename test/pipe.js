var getDb = require('./util').getDb;
var test = require('tape');
var Stream = require('stream');

test('pipe', function (t) {
  t.plan(2);
  
  getDb(function (db, dispose) {
    t.throws(function () {
      db.pipe();
    });
    t.throws(function () {
      (new Stream()).pipe(db);
    });
  })
})
