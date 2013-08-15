require('./util')(function (test, _, getDb) {

  test('sync isOpen / isClosed', function (t) {
    t.plan(4);

    getDb(function (db, dispose) {
      t.ok(db.isOpen());
      t.notOk(db.isClosed());
      db.close();
      t.notOk(db.isOpen());
      t.ok(db.isClosed());
      dispose();
    });
  });

});
