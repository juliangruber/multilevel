var getDb = require('./util').getDb;
var bytewise = require('bytewise');

require('./util')(function (test, _, getDb) {

  test('string encoding', function (t) {
    getDb(function (db, dispose) {
      db.batch([
        { type: 'put', key: 'string', value: 'string' },
        { type: 'put', key: 'buffer', value: Buffer('buffer') } 
      ], function (err) {
        t.error(err);

        db.get('string', function (err, val) {
          t.error(err);

          t.notOk(Buffer.isBuffer(val), 'no buffer');
          t.equal(val, 'string', 'correct value');

          db.get('buffer', function (err, val) {
            t.error(err);

            t.notOk(Buffer.isBuffer(val), 'no buffer');
            t.equal(val, 'buffer', 'correct value');

            t.end();
            dispose();
          });
        });
      });
    });
  });

  test('binary encoding', function (t) {
    getDb(function (db, dispose) {
      db.batch([
        { type: 'put', key: 'string', value: 'string', valueEncoding: 'binary' },
        { type: 'put', key: 'buffer', value: Buffer('buffer') } 
      ], function (err) {
        t.error(err);

        db.get('string', { valueEncoding: 'binary' }, function (err, val) {
          t.error(err);

          t.ok(Buffer.isBuffer(val), 'is buffer');
          t.equal(val.toString(), 'string', 'correct value');

          db.get('buffer', { valueEncoding: 'binary' }, function (err, val) {
            t.error(err);

            t.ok(Buffer.isBuffer(val), 'is buffer');
            t.equal(val.toString(), 'buffer', 'correct value');

            t.end();
            dispose();
          });
        });
      });
    });
  });

  test('custom encoding', function (t) {
    getDb(function (db, dispose) {
      db.batch([
        { type: 'put', key: 'string', value: 'string', valueEncoding: bytewise },
        { type: 'put', key: 'buffer', value: bytewise.encode('buffer') } 
      ], function (err) {
        t.error(err);

        db.get('string', { valueEncoding: bytewise }, function (err, val) {
          t.error(err);

          t.notOk(Buffer.isBuffer(val), 'no buffer');
          t.equal(val, 'string', 'correct value');

          db.get('buffer', { valueEncoding: bytewise }, function (err, val) {
            t.error(err);

            t.notOk(Buffer.isBuffer(val), 'no buffer');
            t.equal(val, 'buffer', 'correct value');

            t.end();
            dispose();
          });
        });
      });
    });
  });

})
