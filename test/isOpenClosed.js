require('./util')(function (test, _, getDb) {

  test('sync isOpen / isClosed', function (t) {
    t.plan(2);
  
    getDb(function (db, dispose) {
      t.assert(db.isOpen());
      t.assert(!db.isClosed());
      dispose();
    });
  });

});
