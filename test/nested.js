require('./util')(function (test, _, getDb) {

  test('nested', function (t) {
    t.plan(4);

    getDb(function (db) {
      db.nested = {
        get: function(cb) { cb(null, 'hola') }
      };
      db.methods = db.methods || {};
      db.methods.nested = {
        type: 'object',
        methods: {
          get: { type: 'async' }
        }
      };
      return { db: db };
    },
    function (db, dispose) {
      t.ok(db.nested);
      t.ok(db.nested.get);
      
      db.nested.get(function(err, value) {
        t.error(err);
        t.equal(value, 'hola');
      });
    });
  });
});

