require('./util')(function (test, _, getDb) {

  test('sync isOpen / isClosed sync', function (t) {
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

  test('sync isOpen / isClosed async', function (t) {
    t.plan(5);

    getDb(function (db, dispose) {
      t.ok(db.isOpen());
      t.notOk(db.isClosed());

      db.close(function(err) {
        t.error(err);

        t.notOk(db.isOpen());
        t.ok(db.isClosed());

        dispose();
      });
    });
  });

});
