var Stream = require('stream');

require('./util')(function (test, _, getDb) {

  test('pipe', function (t) {
    t.plan(2);
  
    getDb(function (db, dispose) {
      t.throws(function () {
        db.pipe();
      });
      t.throws(function () {
        (new Stream()).pipe(db);
      });
      dispose();
    });
  });
});
