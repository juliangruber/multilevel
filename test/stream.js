var levelws = require('level-ws');

require('./util')(function (test, _, getDb) {

  test('stream', function (t) {
    t.plan(5);

    getDb(function (db, dispose) {
      levelws(db);

      db.put('foo', 'bar', function (err) {
        t.error(err);

        db.readStream()
        .on('data', function (data) {
          t.equal(data.key, 'foo');
          t.equal(data.value, 'bar');
        })
        .on('end', function () {
          var stream = db.writeStream();
          stream.write({ key : 'bar', value : 'baz' });
          stream.on('close', function () {
            // temporary fix for level-js
            setTimeout(function () {
              db.get('bar', function (err, value) {
                t.notOk(err);
                t.equal(value, 'baz');
                dispose();
              });
            }, 100);
          });
          stream.end();
        })
      })
    })
  })
})
