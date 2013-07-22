require('./util')(function (test, _, getDb) {

  test('async emits error', function (t) {
    t.plan(2);
  
    getDb(function (db, dispose) {
      db.get('foo');
      db.on('error', function (err) {
        t.ok(err);
        t.equal(err.name, 'NotFoundError');
        dispose();
      });
    });
  });

});
