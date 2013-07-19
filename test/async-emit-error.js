var getDb = require('./util').getDb;
var test = require('tape');

test('async emits error', function (t) {
  t.plan(2);
  
  getDb(function (db, dispose) {
    db.get('foo');
    db.on('error', function (err) {
      t.ok(err);
      t.equal(err.name, 'NotFoundError');
    });
  });
});
