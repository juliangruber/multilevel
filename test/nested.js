require('./util')(function (test, _, getDb) {

  test('nested', function (t) {
    t.plan(7);

    getDb(function (db) {
      db.nested = {
        get: function(cb) { cb(null, 'hola') },
        deeper: {
          get: function(cb) { cb(null, 'ola') }
        }
      };
      db.methods = {
        nested: {
          type: 'object',
          methods: {
            get: { type: 'async' },
            deeper: {
              type: 'object',
              methods: {
                get: { type: 'async' }
              }
            }
          }
        }
      };
      return { db: db };
    },
    function (db, dispose) {
      t.ok(db.nested, 'has nested');
      t.ok(db.nested.get, 'has nested.get');
      t.ok(db.nested.deeper.get, 'has nested.deeper.get');
      
      db.nested.get(function(err, value) {
        t.error(err, 'nested.get without error');
        t.equal(value, 'hola', 'nested.get has value');
        
        db.nested.deeper.get(function(err, value) {
          t.error(err, 'nested.deeper.get without error');
          t.equal(value, 'ola', 'nested.deeper.get has value');
        });
      });
    });
  });
});

