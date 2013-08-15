var getDb = require('./util').getDb;
var test = require('tape');
var binary = require('bops');

require('./util')(function (test, _, getDb) {

  test('binary', function (t) {
    var opts = { valueEncoding : 'binary' };
    getDb(function (db, dispose) {
      db.put('foo', binary.from([1,2,3]), opts, function (err) {
        t.error(err);
        db.get('foo', opts, function (err, value) {
          t.error(err);
          t.ok(binary.is(value));
          t.equal(binary.to(value), binary.to(binary.from([1,2,3])));
          dispose();
          t.end();
        });
      });
    });
  });

})
